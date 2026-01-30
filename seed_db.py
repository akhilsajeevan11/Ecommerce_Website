import asyncio
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27018")
DB_NAME = os.getenv("DATABASE_NAME", "noir_db")

products = [
    {
        "name": "Classic Black Tee",
        "description": "Premium monochrome essential t-shirt",
        "price": 2999.00,
        "category": "T-Shirt",
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Black", "White"],
        "images": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop"],
        "rating": 4.5,
        "review_count": 12,
        "stock": 100
    },
    {
        "name": "Minimalist Hoodie",
        "description": "Ultra-soft cotton blend hoodie",
        "price": 6999.00,
        "category": "Hoodie",
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Black", "Grey"],
        "images": ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1000&auto=format&fit=crop"],
        "rating": 4.8,
        "review_count": 24,
        "stock": 100
    },
    {
        "name": "Structured Blazer",
        "description": "Tailored blazer for a sharp silhouette",
        "price": 14999.00,
        "category": "Jacket",
        "sizes": ["M", "L", "XL"],
        "colors": ["Black"],
        "images": ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000&auto=format&fit=crop"],
        "rating": 4.9,
        "review_count": 18,
        "stock": 100
    },
    {
        "name": "Wide Leg Trousers",
        "description": "Flowy trousers with a premium finish",
        "price": 7999.00,
        "category": "Pants",
        "sizes": ["S", "M", "L"],
        "colors": ["Black"],
        "images": ["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=1000&auto=format&fit=crop"],
        "rating": 4.6,
        "review_count": 15,
        "stock": 100
    },
    {
        "name": "Oversized Shirt",
        "description": "Relaxed fit shirt in high-quality linen",
        "price": 4999.00,
        "category": "Shirt",
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["White", "Black"],
        "images": ["https://images.unsplash.com/photo-1596755094514-f87034a2612d?q=80&w=1000&auto=format&fit=crop"],
        "rating": 4.7,
        "review_count": 22,
        "stock": 100
    },
    {
        "name": "Knit Sweater",
        "description": "Cosy knit sweater for a minimalist look",
        "price": 8999.00,
        "category": "Sweater",
        "sizes": ["S", "M", "L"],
        "colors": ["Grey", "White"],
        "images": ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1000&auto=format&fit=crop"],
        "rating": 4.8,
        "review_count": 19,
        "stock": 100
    },
    {
        "name": "Leather Jacket",
        "description": "Classic biker jacket in premium leather",
        "price": 24999.00,
        "category": "Jacket",
        "sizes": ["M", "L", "XL"],
        "colors": ["Black"],
        "images": ["https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000&auto=format&fit=crop"],
        "rating": 5.0,
        "review_count": 31,
        "stock": 100
    },
    {
        "name": "Slim Fit Jeans",
        "description": "Essential slim-fit denim in deep black",
        "price": 5999.00,
        "category": "Pants",
        "sizes": ["28", "30", "32", "34"],
        "colors": ["Black"],
        "images": ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1000&auto=format&fit=crop"],
        "rating": 4.5,
        "review_count": 28,
        "stock": 100
    }
]

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing products
    await db.products.delete_many({})
    
    for p in products:
        p["id"] = str(uuid.uuid4())
        p["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.insert_one(p)
        
    print(f"Successfully seeded {len(products)} products.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
