from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional

from sqlalchemy import select, delete

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import CartItem

router = APIRouter(prefix="/api/cart", tags=["cart"])


class CartItemIn(BaseModel):
    product_id: str
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None


class CartUpdate(BaseModel):
    items: List[CartItemIn]


@router.get("")
async def get_cart(current_user=Depends(get_current_user)):
    async with PgSession() as session:
        stmt = select(CartItem).where(CartItem.user_id == current_user["id"])
        result = await session.execute(stmt)
        cart_items = result.scalars().all()
        items = [
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
                "size": item.size,
                "color": item.color,
            }
            for item in cart_items
        ]
        return {"items": items}


@router.post("")
async def update_cart(cart_data: CartUpdate, current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    async with PgSession() as session:
        # Clear existing cart items for this user
        await session.execute(delete(CartItem).where(CartItem.user_id == user_id))

        # Insert new items
        import uuid

        for item in cart_data.items:
            session.add(
                CartItem(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    size=item.size,
                    color=item.color,
                )
            )
        await session.commit()

    return {"items": [item.dict() for item in cart_data.items]}
