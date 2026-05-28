from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Order, OrderItem, Product

router = APIRouter(prefix="/api/orders", tags=["orders"])


class CartItemIn(BaseModel):
    product_id: str
    quantity: int
    size: str
    color: str


class ShippingAddress(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None


class OrderCreate(BaseModel):
    items: List[CartItemIn]
    total: float
    shipping_address: dict
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def _serialize_order(order: Order) -> dict:
    """Convert an Order ORM instance to the API response dict."""
    return {
        "id": order.id,
        "user_id": order.user_id,
        "total": float(order.total),
        "status": order.status,
        "shipping_address": {
            "name": order.shipping_name,
            "address": order.shipping_address,
            "city": order.shipping_city,
            "state": order.shipping_state,
            "postal_code": order.shipping_postal_code,
            "phone": order.shipping_phone,
        },
        "razorpay_order_id": order.razorpay_order_id,
        "razorpay_payment_id": order.razorpay_payment_id,
        "razorpay_signature": order.razorpay_signature,
        "items": [
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
                "size": item.size,
                "color": item.color,
                "price_at_purchase": float(item.price_at_purchase),
                "product_name": item.product_name,
            }
            for item in order.items
        ],
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


@router.post("")
async def create_order(order: OrderCreate, current_user=Depends(get_current_user)):
    order_id = str(uuid.uuid4())
    shipping = order.shipping_address

    async with PgSession() as session:
        new_order = Order(
            id=order_id,
            user_id=current_user["id"],
            total=order.total,
            status="confirmed",
            shipping_name=shipping.get("name"),
            shipping_address=shipping.get("address"),
            shipping_city=shipping.get("city"),
            shipping_state=shipping.get("state"),
            shipping_postal_code=shipping.get("postal_code"),
            shipping_phone=shipping.get("phone"),
            razorpay_order_id=order.razorpay_order_id,
            razorpay_payment_id=order.razorpay_payment_id,
            razorpay_signature=order.razorpay_signature,
        )
        session.add(new_order)

        # Add order items — look up product name for snapshot
        for item in order.items:
            prod_stmt = select(Product).where(Product.id == item.product_id)
            prod_result = await session.execute(prod_stmt)
            product = prod_result.scalar_one_or_none()
            product_name = product.name if product else "Unknown"
            price_at_purchase = float(product.price) if product else 0.0

            session.add(
                OrderItem(
                    id=str(uuid.uuid4()),
                    order_id=order_id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    size=item.size,
                    color=item.color,
                    price_at_purchase=price_at_purchase,
                    product_name=product_name,
                )
            )

        await session.commit()

        # Re-fetch for response
        stmt = (
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.items))
        )
        result = await session.execute(stmt)
        created_order = result.scalar_one()
        return _serialize_order(created_order)


@router.get("")
async def get_orders(current_user=Depends(get_current_user)):
    async with PgSession() as session:
        stmt = (
            select(Order)
            .where(Order.user_id == current_user["id"])
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        result = await session.execute(stmt)
        orders = result.scalars().all()
        return [_serialize_order(o) for o in orders]
