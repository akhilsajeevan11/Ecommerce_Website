from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import uuid
import os
import razorpay

from config import db, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from dependencies import get_current_user
from routes.auth import router as auth_router

app = FastAPI()

# Create uploads directory if it doesn't exist
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://ecommerce-website-six-hazel.vercel.app/",
        "https://d2ytz7pa25s5ff.cloudfront.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth_router)

if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None


# ── Models (will be moved to models/ later) ──────────────

class Product(BaseModel):
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

class Review(BaseModel):
    product_id: str
    rating: int
    comment: str

class CartItem(BaseModel):
    product_id: str
    quantity: int
    size: str
    color: str

class Order(BaseModel):
    items: List[CartItem]
    total: float
    shipping_address: dict
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ── Root ──────────────────────────────────────────────────

@app.get("/api/")
async def root():
    return {"message": "NOIR API is running"}


# ── Products ──────────────────────────────────────────────

@app.get("/api/products")
async def get_products():
    products = await db.products.find().to_list(1000)
    for p in products:
        p.pop("_id", None)
    return products

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.pop("_id", None)
    return product

@app.post("/api/products")
async def create_product(product: Product, current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    product_id = str(uuid.uuid4())
    product_data = product.dict()
    product_data["id"] = product_id
    product_data["rating"] = 0.0
    product_data["review_count"] = 0
    product_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(product_data)
    product_data.pop("_id", None)
    return product_data

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: Product, current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.products.update_one({"id": product_id}, {"$set": product.dict()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product updated"}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


# ── Cart ──────────────────────────────────────────────────

@app.get("/api/cart")
async def get_cart(current_user=Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    if not cart:
        return {"items": []}
    cart.pop("_id", None)
    return cart

@app.post("/api/cart")
async def update_cart(cart_data: dict, current_user=Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": cart_data["items"]}},
        upsert=True,
    )
    return {"items": cart_data["items"]}


# ── Wishlist ──────────────────────────────────────────────

@app.get("/api/wishlist")
async def get_wishlist(current_user=Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": current_user["id"]})
    if not wishlist:
        return {"items": []}
    wishlist.pop("_id", None)
    return wishlist

@app.post("/api/wishlist/add")
async def add_to_wishlist(data: dict, current_user=Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": current_user["id"]},
        {"$addToSet": {"items": data["product_id"]}},
        upsert=True,
    )
    return {"message": "Added to wishlist"}

@app.post("/api/wishlist/remove")
async def remove_from_wishlist(data: dict, current_user=Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": current_user["id"]},
        {"$pull": {"items": data["product_id"]}},
    )
    return {"message": "Removed from wishlist"}


# ── Reviews ───────────────────────────────────────────────

@app.post("/api/reviews")
async def create_review(review: Review, current_user=Depends(get_current_user)):
    review_id = str(uuid.uuid4())
    review_data = review.dict()
    review_data["id"] = review_id
    review_data["user_id"] = current_user["id"]
    review_data["user_name"] = current_user["name"]
    review_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.reviews.insert_one(review_data)
    reviews = await db.reviews.find({"product_id": review.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one(
        {"id": review.product_id},
        {"$set": {"rating": avg_rating, "review_count": len(reviews)}},
    )
    review_data.pop("_id", None)
    return review_data

@app.get("/api/reviews/{product_id}")
async def get_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}).to_list(1000)
    for r in reviews:
        r.pop("_id", None)
    return reviews


# ── Payments & Orders ─────────────────────────────────────

@app.post("/api/payment/create-order")
async def create_razorpay_order(amount: int = Query(...), current_user=Depends(get_current_user)):
    if not razorpay_client:
        return {"order_id": f"test_order_{uuid.uuid4()}", "key_id": "test_key", "amount": amount}
    order_data = {"amount": amount * 100, "currency": "INR", "payment_capture": 1}
    order = razorpay_client.order.create(data=order_data)
    return {"order_id": order["id"], "key_id": RAZORPAY_KEY_ID, "amount": amount}

@app.post("/api/orders")
async def create_order(order: Order, current_user=Depends(get_current_user)):
    order_id = str(uuid.uuid4())
    order_data = order.dict()
    order_data["id"] = order_id
    order_data["user_id"] = current_user["id"]
    order_data["status"] = "confirmed"
    order_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.orders.insert_one(order_data)
    order_data.pop("_id", None)
    return order_data

@app.get("/api/orders")
async def get_orders(current_user=Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}).to_list(1000)
    for o in orders:
        o.pop("_id", None)
    return orders

@app.get("/api/admin/orders")
async def get_all_orders(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    orders = await db.orders.find().to_list(1000)
    for o in orders:
        o.pop("_id", None)
    return orders

@app.put("/api/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated"}


# ── Admin Stock ───────────────────────────────────────────

@app.get("/api/admin/stock/summary")
async def get_stock_summary(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    pipeline = [{"$group": {"_id": None, "total_stock": {"$sum": "$stock"}, "total_products": {"$sum": 1}, "out_of_stock_count": {"$sum": {"$cond": [{"$eq": ["$stock", 0]}, 1, 0]}}}}]
    result = await db.products.aggregate(pipeline).to_list(1)
    summary = result[0] if result else {"total_stock": 0, "total_products": 0, "out_of_stock_count": 0}
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    ordered_pipeline = [{"$match": {"created_at": {"$gte": thirty_days_ago}, "status": {"$ne": "cancelled"}}}, {"$unwind": "$items"}, {"$group": {"_id": "$items.product_id"}}]
    ordered_results = await db.orders.aggregate(ordered_pipeline).to_list(None)
    ordered_product_ids = {r["_id"] for r in ordered_results}
    all_products = await db.products.find({}, {"id": 1}).to_list(None)
    all_product_ids = {p["id"] for p in all_products}
    dead_stock_count = len(all_product_ids - ordered_product_ids)
    return {"total_stock": summary["total_stock"], "total_products": summary["total_products"], "dead_stock_count": dead_stock_count, "out_of_stock_count": summary["out_of_stock_count"]}

@app.get("/api/admin/stock/by-product")
async def get_stock_by_product(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    products = await db.products.find({}, {"_id": 0, "id": 1, "name": 1, "category": 1, "stock": 1, "price": 1}).sort("stock", -1).to_list(None)
    return products

@app.get("/api/admin/stock/by-category")
async def get_stock_by_category(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    pipeline = [{"$group": {"_id": "$category", "total_stock": {"$sum": "$stock"}}}, {"$project": {"_id": 0, "category": "$_id", "total_stock": 1}}]
    results = await db.products.aggregate(pipeline).to_list(None)
    return results

@app.get("/api/admin/stock/dead-stock")
async def get_dead_stock(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    ordered_pipeline = [{"$match": {"created_at": {"$gte": thirty_days_ago}, "status": {"$ne": "cancelled"}}}, {"$unwind": "$items"}, {"$group": {"_id": "$items.product_id"}}]
    ordered_results = await db.orders.aggregate(ordered_pipeline).to_list(None)
    ordered_product_ids = [r["_id"] for r in ordered_results]
    dead_products = await db.products.find({"id": {"$nin": ordered_product_ids}}, {"_id": 0, "id": 1, "name": 1, "category": 1, "stock": 1, "price": 1}).to_list(None)
    return dead_products


# ── File Upload ───────────────────────────────────────────

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 50 * 1024 * 1024

@app.post("/api/admin/upload")
async def upload_file(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file format. Accepted: JPEG, PNG, WebP, MP4, WebM")
    contents = await file.read()
    file_size = len(contents)
    if file.content_type in ALLOWED_IMAGE_TYPES and file_size > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum of 5MB for images")
    if file.content_type in ALLOWED_VIDEO_TYPES and file_size > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum of 50MB for videos")
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join("uploads", unique_filename)
    with open(file_path, "wb") as f:
        f.write(contents)
    return {"url": f"/uploads/{unique_filename}", "filename": file.filename}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
