from fastapi import APIRouter, HTTPException, Depends, Query

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Order, OrderItem

router = APIRouter(prefix="/api/admin/orders", tags=["admin-orders"])


def _serialize_order(order: Order) -> dict:
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


@router.get("")
async def get_all_orders(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        result = await session.execute(stmt)
        orders = result.scalars().all()
        return [_serialize_order(o) for o in orders]


@router.put("/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        stmt = select(Order).where(Order.id == order_id)
        result = await session.execute(stmt)
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order.status = status
        await session.commit()
        return {"message": "Order status updated"}
