from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Product, Category, Media, ProductSize, ProductColor

router = APIRouter(prefix="/api/products", tags=["products"])


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
async def get_products(featured: Optional[str] = None):
    async with PgSession() as session:
        if featured == "true":
            # Fetch products where is_featured is True
            stmt = (
                select(Product)
                .where(Product.is_active == True, Product.is_featured == True)
                .options(
                    selectinload(Product.category_rel),
                    selectinload(Product.media),
                    selectinload(Product.sizes),
                    selectinload(Product.colors),
                )
            )
            result = await session.execute(stmt)
            products = result.scalars().all()

            # Fallback: if no featured products, return 6 most recently created
            if not products:
                stmt = (
                    select(Product)
                    .where(Product.is_active == True)
                    .order_by(Product.created_at.desc())
                    .limit(6)
                    .options(
                        selectinload(Product.category_rel),
                        selectinload(Product.media),
                        selectinload(Product.sizes),
                        selectinload(Product.colors),
                    )
                )
                result = await session.execute(stmt)
                products = result.scalars().all()

            return [_serialize_product(p) for p in products]
        else:
            # Default: return all active products
            stmt = (
                select(Product)
                .where(Product.is_active == True)
                .options(
                    selectinload(Product.category_rel),
                    selectinload(Product.media),
                    selectinload(Product.sizes),
                    selectinload(Product.colors),
                )
            )
            result = await session.execute(stmt)
            products = result.scalars().all()
            return [_serialize_product(p) for p in products]


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
