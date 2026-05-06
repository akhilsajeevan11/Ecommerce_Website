from fastapi import APIRouter, Depends, Query
import uuid
import razorpay

from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from dependencies import get_current_user

router = APIRouter(prefix="/api/payment", tags=["payments"])

if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None


@router.post("/create-order")
async def create_razorpay_order(amount: int = Query(...), current_user=Depends(get_current_user)):
    if not razorpay_client:
        return {"order_id": f"test_order_{uuid.uuid4()}", "key_id": "test_key", "amount": amount}
    order_data = {"amount": amount * 100, "currency": "INR", "payment_capture": 1}
    order = razorpay_client.order.create(data=order_data)
    return {"order_id": order["id"], "key_id": RAZORPAY_KEY_ID, "amount": amount}
