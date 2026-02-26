from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
import uuid
import os
import razorpay
from dotenv import load_dotenv

load_dotenv()

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
        "https://ecommerce-website-nine-sooty.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "noir_db")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
security = HTTPBearer()

if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

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

def create_token(user_id: str):
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/api/")
async def root():
    return {"message": "NOIR API is running"}

@app.post("/api/auth/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user_id = str(uuid.uuid4())
    
    new_user = {
        "id": user_id,
        "email": user.email,
        "password": hashed_pw,
        "name": user.name,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {"id": user_id, "email": user.email, "name": user.name, "is_admin": False}
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(user.password.encode('utf-8'), db_user["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(db_user["id"])
    
    return {
        "token": token,
        "user": {
            "id": db_user["id"],
            "email": db_user["email"],
            "name": db_user["name"],
            "is_admin": db_user.get("is_admin", False)
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "is_admin": current_user.get("is_admin", False)
    }

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
async def create_product(product: Product, current_user = Depends(get_current_user)):
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
async def update_product(product_id: str, product: Product, current_user = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product.dict()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product updated"}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, current_user = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.products.delete_one({"id": product_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}

@app.get("/api/cart")
async def get_cart(current_user = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    if not cart:
        return {"items": []}
    cart.pop("_id", None)
    return cart

@app.post("/api/cart")
async def update_cart(cart_data: dict, current_user = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": cart_data["items"]}},
        upsert=True
    )
    return {"items": cart_data["items"]}

@app.get("/api/wishlist")
async def get_wishlist(current_user = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": current_user["id"]})
    if not wishlist:
        return {"items": []}
    wishlist.pop("_id", None)
    return wishlist

@app.post("/api/wishlist/add")
async def add_to_wishlist(data: dict, current_user = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": current_user["id"]},
        {"$addToSet": {"items": data["product_id"]}},
        upsert=True
    )
    return {"message": "Added to wishlist"}

@app.post("/api/wishlist/remove")
async def remove_from_wishlist(data: dict, current_user = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": current_user["id"]},
        {"$pull": {"items": data["product_id"]}}
    )
    return {"message": "Removed from wishlist"}

@app.post("/api/reviews")
async def create_review(review: Review, current_user = Depends(get_current_user)):
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
        {"$set": {"rating": avg_rating, "review_count": len(reviews)}}
    )
    
    review_data.pop("_id", None)
    return review_data

@app.get("/api/reviews/{product_id}")
async def get_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}).to_list(1000)
    for r in reviews:
        r.pop("_id", None)
    return reviews

@app.post("/api/payment/create-order")
async def create_razorpay_order(amount: int = Query(...), current_user = Depends(get_current_user)):
    if not razorpay_client:
        return {
            "order_id": f"test_order_{uuid.uuid4()}",
            "key_id": "test_key",
            "amount": amount
        }
    
    order_data = {
        "amount": amount * 100,
        "currency": "INR",
        "payment_capture": 1
    }
    
    order = razorpay_client.order.create(data=order_data)
    
    return {
        "order_id": order["id"],
        "key_id": RAZORPAY_KEY_ID,
        "amount": amount
    }

@app.post("/api/orders")
async def create_order(order: Order, current_user = Depends(get_current_user)):
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
async def get_orders(current_user = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}).to_list(1000)
    for o in orders:
        o.pop("_id", None)
    return orders

@app.get("/api/admin/orders")
async def get_all_orders(current_user = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    orders = await db.orders.find().to_list(1000)
    for o in orders:
        o.pop("_id", None)
    return orders

@app.put("/api/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), current_user = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
