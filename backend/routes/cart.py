from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from sqlalchemy import select, delete

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import CartItem, Product

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
        # Validate all items before persisting
        for item in cart_data.items:
            # Check quantity >= 1
            if item.quantity < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Quantity must be at least 1",
                )

            # Check quantity <= 10
            if item.quantity > 10:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum quantity per item is 10",
                )

            # Fetch product and validate stock
            product_result = await session.execute(
                select(Product).where(Product.id == item.product_id)
            )
            product = product_result.scalar_one_or_none()

            if product is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product {item.product_id} not found",
                )

            if item.quantity > product.stock:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name}. Available: {product.stock}",
                )

        # All items validated — proceed with delete-and-insert
        await session.execute(delete(CartItem).where(CartItem.user_id == user_id))

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
