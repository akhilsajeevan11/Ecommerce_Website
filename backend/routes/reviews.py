from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from sqlalchemy import select, func

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Review, Product

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    comment: str


@router.post("")
async def create_review(review: ReviewCreate, current_user=Depends(get_current_user)):
    review_id = str(uuid.uuid4())

    async with PgSession() as session:
        new_review = Review(
            id=review_id,
            product_id=review.product_id,
            user_id=current_user["id"],
            rating=review.rating,
            comment=review.comment,
        )
        session.add(new_review)
        await session.flush()

        # Recalculate product rating
        avg_stmt = select(
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        ).where(Review.product_id == review.product_id)
        agg_result = await session.execute(avg_stmt)
        row = agg_result.one()
        avg_rating = float(row.avg_rating) if row.avg_rating else 0.0
        review_count = row.review_count or 0

        # Update product
        prod_stmt = select(Product).where(Product.id == review.product_id)
        prod_result = await session.execute(prod_stmt)
        product = prod_result.scalar_one_or_none()
        if product:
            product.rating = round(avg_rating, 2)
            product.review_count = review_count

        await session.commit()

        return {
            "id": review_id,
            "product_id": review.product_id,
            "user_id": current_user["id"],
            "user_name": current_user["name"],
            "rating": review.rating,
            "comment": review.comment,
            "created_at": new_review.created_at.isoformat() if new_review.created_at else datetime.now(timezone.utc).isoformat(),
        }


@router.get("/{product_id}")
async def get_reviews(product_id: str):
    async with PgSession() as session:
        stmt = select(Review).where(Review.product_id == product_id).order_by(Review.created_at.desc())
        result = await session.execute(stmt)
        reviews = result.scalars().all()
        return [
            {
                "id": r.id,
                "product_id": r.product_id,
                "user_id": r.user_id,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reviews
        ]
