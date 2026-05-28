from fastapi import APIRouter, Depends
import uuid

from sqlalchemy import select, delete

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Wishlist

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


@router.get("")
async def get_wishlist(current_user=Depends(get_current_user)):
    async with PgSession() as session:
        stmt = select(Wishlist).where(Wishlist.user_id == current_user["id"])
        result = await session.execute(stmt)
        wishlist_items = result.scalars().all()
        items = [item.product_id for item in wishlist_items]
        return {"items": items}


@router.post("/add")
async def add_to_wishlist(data: dict, current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    product_id = data["product_id"]

    async with PgSession() as session:
        # Check if already in wishlist
        stmt = select(Wishlist).where(
            Wishlist.user_id == user_id,
            Wishlist.product_id == product_id,
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if not existing:
            session.add(
                Wishlist(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    product_id=product_id,
                )
            )
            await session.commit()
    return {"message": "Added to wishlist"}


@router.post("/remove")
async def remove_from_wishlist(data: dict, current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    product_id = data["product_id"]

    async with PgSession() as session:
        await session.execute(
            delete(Wishlist).where(
                Wishlist.user_id == user_id,
                Wishlist.product_id == product_id,
            )
        )
        await session.commit()
    return {"message": "Removed from wishlist"}
