from fastapi import APIRouter
from sqlalchemy import select, func

from config import PgSession
from models.ecommerce import Category, Product

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
async def list_categories():
    """Return every active category with a server-computed `product_count`.

    Response shape (per design contract):
        [{ id, name, slug, product_count, image_url }]

    - Only categories with `is_active=True` are included.
    - `product_count` counts active products in that category.
    - `image_url` is nullable (passed through verbatim from the row).
    - Sorted alphabetically by `name` for stable UI ordering.
    """
    async with PgSession() as session:
        # Single grouped query: LEFT JOIN so categories with zero active
        # products still appear with `product_count = 0`.
        stmt = (
            select(
                Category.id,
                Category.name,
                Category.slug,
                Category.image_url,
                func.count(Product.id).label("product_count"),
            )
            .select_from(Category)
            .outerjoin(
                Product,
                (Product.category_id == Category.id) & (Product.is_active == True),
            )
            .where(Category.is_active == True)
            .group_by(Category.id, Category.name, Category.slug, Category.image_url)
            .order_by(Category.name.asc())
        )
        rows = (await session.execute(stmt)).all()

    return [
        {
            "id": cid,
            "name": name,
            "slug": slug,
            "product_count": int(product_count or 0),
            "image_url": image_url,
        }
        for cid, name, slug, image_url, product_count in rows
    ]
