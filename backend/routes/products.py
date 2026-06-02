from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from sqlalchemy import select, delete, func, and_, or_
from sqlalchemy.orm import selectinload

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Product, Category, Media, ProductSize, ProductColor

router = APIRouter(prefix="/api/products", tags=["products"])


# ── Sort allowlist ─────────────────────────────────────────
# Each entry returns a fresh ORDER BY clause so SQLAlchemy doesn't reuse a
# stale ColumnElement across requests. The secondary `Product.id ASC` key is
# always appended at call time for stable pagination.
_SORT_BUILDERS = {
    "newest":      lambda: Product.created_at.desc(),
    "price_asc":   lambda: Product.price.asc(),
    "price_desc":  lambda: Product.price.desc(),
    "rating_desc": lambda: Product.rating.desc(),
    # `popularity` proxies to review_count desc until a real popularity
    # score lands in the schema.
    "popularity":  lambda: Product.review_count.desc(),
}


def _csv(value: Optional[str]) -> List[str]:
    """Parse a comma-separated query value into a deduped list of trimmed
    non-empty strings, preserving first-seen order."""
    if not value:
        return []
    seen = []
    for raw in value.split(","):
        token = raw.strip()
        if token and token not in seen:
            seen.append(token)
    return seen


def _envelope(items: list, total: int, page: int, limit: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total,
    }


class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    sizes: List[str]
    colors: List[str]
    images: List[str]
    model_3d_url: Optional[str] = None
    images_360: Optional[List[str]] = None
    stock: int = 100
    barcode_id: Optional[str] = None
    story: Optional[str] = None
    video_url: Optional[str] = None


class FeaturedUpdate(BaseModel):
    is_featured: bool


def _serialize_product(product: Product) -> dict:
    """Convert a Product ORM instance to the API response dict."""
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": float(product.price),
        "category": product.category_rel.name if product.category_rel else None,
        "sizes": [s.size_label for s in product.sizes],
        "colors": [c.color_name for c in product.colors],
        "images": [m.url for m in sorted(product.media, key=lambda x: x.sort_order)],
        "stock": product.stock,
        "rating": float(product.rating),
        "review_count": product.review_count,
        "barcode_id": product.barcode_id,
        "story": product.story,
        "video_url": product.video_url,
        "is_featured": product.is_featured,
        "created_at": product.created_at.isoformat() if product.created_at else None,
    }


@router.get("")
async def get_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    sizes: Optional[str] = None,
    colors: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    in_stock: bool = False,
    featured: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 24,
):
    """List products with filters, search, sort, and pagination.

    Returns a `ProductsResponse` envelope: `{ items, total, page, limit, has_more }`.

    Query parameters
    ----------------
    - `q`           Full-text-ish substring match across name + description
                    + category name (ILIKE).
    - `category`    CSV of category names. OR within the group.
    - `sizes`       CSV of size labels. OR within the group.
    - `colors`      CSV of color names. OR within the group.
    - `min_price`,  inclusive numeric bounds on `Product.price`.
      `max_price`
    - `min_rating`  inclusive bound on `Product.rating`, clamped to [0, 5].
    - `in_stock`    when truthy, only products with `stock > 0`.
    - `featured`    legacy switch — when `"true"` and *no* other filters are
                    supplied, falls back to the legacy "featured + 6-recent"
                    behavior wrapped in the new envelope.
    - `sort`        one of `newest | price_asc | price_desc | rating_desc |
                    popularity`. Unknown values coerce to `newest`.
    - `page`        1-indexed, clamped to `>= 1`.
    - `limit`       clamped to `[1, 60]`.

    Filter semantics: OR within each multi-value group, AND across groups.
    The query always appends `Product.id ASC` as a secondary ORDER BY for
    stable pagination.
    """
    # ── Clamp hostile / out-of-range pagination input ──────────
    page = max(1, page)
    limit = max(1, min(limit, 60))

    # ── Coerce unknown sort values to the safe default ─────────
    sort_key = sort if sort in _SORT_BUILDERS else "newest"
    primary_order = _SORT_BUILDERS[sort_key]()

    # ── Clamp rating to [0, 5] per the spec ────────────────────
    if min_rating is not None:
        if min_rating < 0:
            min_rating = 0.0
        elif min_rating > 5:
            min_rating = 5.0

    # ── Normalise CSV groups ───────────────────────────────────
    cats_list = _csv(category)
    sizes_list = _csv(sizes)
    colors_list = _csv(colors)

    is_featured = featured == "true"

    # ── Detect "legacy featured" call: featured=true AND no other
    #    filters / search / pagination overrides. This preserves the
    #    HomePage's existing UX (featured + 6-recent fallback).
    has_other_filters = (
        bool(q)
        or bool(cats_list)
        or bool(sizes_list)
        or bool(colors_list)
        or min_price is not None
        or max_price is not None
        or min_rating is not None
        or in_stock
    )
    legacy_featured = (
        is_featured
        and not has_other_filters
        and sort_key == "newest"
        and page == 1
        and limit == 24
    )

    load_opts = (
        selectinload(Product.category_rel),
        selectinload(Product.media),
        selectinload(Product.sizes),
        selectinload(Product.colors),
    )

    async with PgSession() as session:
        # ── Legacy featured branch ─────────────────────────────
        if legacy_featured:
            stmt = (
                select(Product)
                .where(Product.is_active == True, Product.is_featured == True)
                .order_by(Product.created_at.desc(), Product.id.asc())
                .options(*load_opts)
            )
            featured_rows = (await session.execute(stmt)).scalars().all()

            if featured_rows:
                items = [_serialize_product(p) for p in featured_rows]
                return _envelope(items, len(items), page, limit)

            # Fallback: 6 most recent active products
            fallback_stmt = (
                select(Product)
                .where(Product.is_active == True)
                .order_by(Product.created_at.desc(), Product.id.asc())
                .limit(6)
                .options(*load_opts)
            )
            fallback_rows = (await session.execute(fallback_stmt)).scalars().all()
            items = [_serialize_product(p) for p in fallback_rows]
            return _envelope(items, len(items), page, limit)

        # ── Build composable WHERE clause ──────────────────────
        conds = [Product.is_active == True]

        if is_featured:
            conds.append(Product.is_featured == True)

        if q:
            qtrim = q.strip()
            if qtrim:
                like = f"%{qtrim}%"
                # Match on name OR description OR category name. Joining on
                # category is avoided in favour of a correlated subquery so
                # this composes cleanly with the other id-based filters.
                conds.append(
                    or_(
                        Product.name.ilike(like),
                        Product.description.ilike(like),
                        Product.category_id.in_(
                            select(Category.id).where(Category.name.ilike(like))
                        ),
                    )
                )

        if cats_list:
            conds.append(
                Product.category_id.in_(
                    select(Category.id).where(Category.name.in_(cats_list))
                )
            )

        if sizes_list:
            conds.append(
                Product.id.in_(
                    select(ProductSize.product_id).where(
                        ProductSize.size_label.in_(sizes_list)
                    )
                )
            )

        if colors_list:
            conds.append(
                Product.id.in_(
                    select(ProductColor.product_id).where(
                        ProductColor.color_name.in_(colors_list)
                    )
                )
            )

        if min_price is not None:
            conds.append(Product.price >= min_price)
        if max_price is not None:
            conds.append(Product.price <= max_price)
        if min_rating is not None:
            conds.append(Product.rating >= min_rating)
        if in_stock:
            conds.append(Product.stock > 0)

        where_clause = and_(*conds)

        # ── Total count (for pagination + has_more) ────────────
        total_stmt = select(func.count()).select_from(Product).where(where_clause)
        total = (await session.execute(total_stmt)).scalar_one() or 0

        # ── Page slice ─────────────────────────────────────────
        offset = (page - 1) * limit
        page_stmt = (
            select(Product)
            .where(where_clause)
            .order_by(primary_order, Product.id.asc())  # stable secondary key
            .offset(offset)
            .limit(limit)
            .options(*load_opts)
        )
        rows = (await session.execute(page_stmt)).scalars().all()

        items = [_serialize_product(p) for p in rows]
        return _envelope(items, total, page, limit)


# ── Search-suggest ────────────────────────────────────────
# IMPORTANT: this route MUST be declared before `/{product_id}` so that
# FastAPI does not match `search-suggest` as a literal product_id.
@router.get("/search-suggest")
async def search_suggest(q: str = "", limit: int = 5):
    """Lightweight typeahead endpoint backing the navbar SearchBar.

    Behavior
    --------
    - When `q.strip()` is shorter than 2 chars → HTTP 400.
    - Otherwise → HTTP 200 with `{ products, categories }`. Either array
      may be empty.
    - `limit` applies to `products` (clamped to [1, 10]); the categories
      list is independently capped at 5.
    - Matches via `ILIKE %q%` on `Product.name` and `Category.name`.
    """
    qtrim = q.strip()
    if len(qtrim) < 2:
        raise HTTPException(status_code=400, detail="q must be at least 2 chars")

    products_limit = max(1, min(limit, 10))
    like = f"%{qtrim}%"

    async with PgSession() as session:
        prod_stmt = (
            select(Product)
            .where(Product.is_active == True, Product.name.ilike(like))
            .order_by(Product.is_featured.desc(), Product.review_count.desc(), Product.id.asc())
            .limit(products_limit)
            .options(selectinload(Product.media))
        )
        prods = (await session.execute(prod_stmt)).scalars().all()

        cat_stmt = (
            select(Category)
            .where(Category.is_active == True, Category.name.ilike(like))
            .order_by(Category.name.asc())
            .limit(5)
        )
        cats = (await session.execute(cat_stmt)).scalars().all()

        # Server-computed product counts for the matched categories.
        cat_ids = [c.id for c in cats]
        counts: dict[str, int] = {}
        if cat_ids:
            count_stmt = (
                select(Product.category_id, func.count(Product.id))
                .where(Product.is_active == True, Product.category_id.in_(cat_ids))
                .group_by(Product.category_id)
            )
            for cat_id, n in (await session.execute(count_stmt)).all():
                counts[cat_id] = int(n or 0)

    return {
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "image": (sorted(p.media, key=lambda m: m.sort_order)[0].url if p.media else None),
                "price": float(p.price),
            }
            for p in prods
        ],
        "categories": [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "product_count": counts.get(c.id, 0),
            }
            for c in cats
        ],
    }


# ── Related products ──────────────────────────────────────
# IMPORTANT: this route uses `/{product_id}/related`, which is more
# specific than `/{product_id}`, but it must still be declared before the
# bare `/{product_id}` GET so FastAPI's path resolver picks it up first.
@router.get("/{product_id}/related")
async def get_related(product_id: str, limit: int = 6):
    """Return products in the same category as the source product.

    - `limit` is clamped to the inclusive range [1, 12].
    - The source product is excluded from the result set.
    - Order: `rating DESC, created_at DESC` with `Product.id ASC` as a
      stable secondary key.
    - HTTP 404 when no product with the given id exists.
    """
    limit = max(1, min(limit, 12))

    async with PgSession() as session:
        # Resolve the source product's category (and confirm existence).
        src_stmt = select(Product.category_id).where(Product.id == product_id)
        src_category_id = (await session.execute(src_stmt)).scalar_one_or_none()
        if src_category_id is None:
            raise HTTPException(status_code=404, detail="Product not found")

        rows_stmt = (
            select(Product)
            .where(
                Product.is_active == True,
                Product.category_id == src_category_id,
                Product.id != product_id,
            )
            .order_by(
                Product.rating.desc(),
                Product.created_at.desc(),
                Product.id.asc(),
            )
            .limit(limit)
            .options(
                selectinload(Product.category_rel),
                selectinload(Product.media),
                selectinload(Product.sizes),
                selectinload(Product.colors),
            )
        )
        rows = (await session.execute(rows_stmt)).scalars().all()

    items = [_serialize_product(p) for p in rows]
    return {
        "items": items,
        "total": len(items),
        "page": 1,
        "limit": limit,
        "has_more": False,
    }


@router.get("/{product_id}")
async def get_product(product_id: str):
    async with PgSession() as session:
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.category_rel),
                selectinload(Product.media),
                selectinload(Product.sizes),
                selectinload(Product.colors),
            )
        )
        result = await session.execute(stmt)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return _serialize_product(product)


@router.patch("/{product_id}/featured")
async def update_product_featured(product_id: str, body: FeaturedUpdate, current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.category_rel),
                selectinload(Product.media),
                selectinload(Product.sizes),
                selectinload(Product.colors),
            )
        )
        result = await session.execute(stmt)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        product.is_featured = body.is_featured
        await session.commit()
        await session.refresh(product)
        return _serialize_product(product)


@router.post("")
async def create_product(product: ProductCreate, current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        # Resolve category
        cat_stmt = select(Category).where(Category.name == product.category)
        cat_result = await session.execute(cat_stmt)
        category = cat_result.scalar_one_or_none()
        if not category:
            # Create category on the fly
            category = Category(
                id=str(uuid.uuid4()),
                name=product.category,
                slug=product.category.lower().replace(" ", "-"),
            )
            session.add(category)
            await session.flush()

        product_id = str(uuid.uuid4())
        new_product = Product(
            id=product_id,
            name=product.name,
            description=product.description,
            price=product.price,
            category_id=category.id,
            stock=product.stock,
            barcode_id=product.barcode_id,
            story=product.story,
            video_url=product.video_url,
            rating=0.0,
            review_count=0,
        )
        session.add(new_product)

        # Add sizes
        for size in product.sizes:
            session.add(ProductSize(id=str(uuid.uuid4()), product_id=product_id, size_label=size))

        # Add colors
        for color in product.colors:
            session.add(ProductColor(id=str(uuid.uuid4()), product_id=product_id, color_name=color))

        # Add media (images)
        for i, url in enumerate(product.images):
            session.add(
                Media(
                    id=str(uuid.uuid4()),
                    product_id=product_id,
                    url=url,
                    media_type="image",
                    sort_order=i,
                    is_primary=(i == 0),
                )
            )

        await session.commit()

        # Re-fetch with relationships for response
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.category_rel),
                selectinload(Product.media),
                selectinload(Product.sizes),
                selectinload(Product.colors),
            )
        )
        result = await session.execute(stmt)
        created = result.scalar_one()
        return _serialize_product(created)


@router.put("/{product_id}")
async def update_product(product_id: str, product: ProductCreate, current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        stmt = select(Product).where(Product.id == product_id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if not existing:
            raise HTTPException(status_code=404, detail="Product not found")

        # Resolve category
        cat_stmt = select(Category).where(Category.name == product.category)
        cat_result = await session.execute(cat_stmt)
        category = cat_result.scalar_one_or_none()
        if not category:
            category = Category(
                id=str(uuid.uuid4()),
                name=product.category,
                slug=product.category.lower().replace(" ", "-"),
            )
            session.add(category)
            await session.flush()

        # Update product fields
        existing.name = product.name
        existing.description = product.description
        existing.price = product.price
        existing.category_id = category.id
        existing.stock = product.stock
        existing.barcode_id = product.barcode_id
        existing.story = product.story
        existing.video_url = product.video_url

        # Replace sizes
        await session.execute(delete(ProductSize).where(ProductSize.product_id == product_id))
        for size in product.sizes:
            session.add(ProductSize(id=str(uuid.uuid4()), product_id=product_id, size_label=size))

        # Replace colors
        await session.execute(delete(ProductColor).where(ProductColor.product_id == product_id))
        for color in product.colors:
            session.add(ProductColor(id=str(uuid.uuid4()), product_id=product_id, color_name=color))

        # Replace media
        await session.execute(delete(Media).where(Media.product_id == product_id))
        for i, url in enumerate(product.images):
            session.add(
                Media(
                    id=str(uuid.uuid4()),
                    product_id=product_id,
                    url=url,
                    media_type="image",
                    sort_order=i,
                    is_primary=(i == 0),
                )
            )

        await session.commit()
        return {"message": "Product updated"}


@router.delete("/{product_id}")
async def delete_product(product_id: str, current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        stmt = select(Product).where(Product.id == product_id)
        result = await session.execute(stmt)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        await session.delete(product)
        await session.commit()
        return {"message": "Product deleted"}
