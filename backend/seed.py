import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "noir_db")

async def seed_products():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Use local server URL for images
    BASE_URL = "http://localhost:8000"
    
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Classic Black Tee",
            "description": "Timeless black t-shirt made from premium cotton. Perfect for any occasion.",
            "price": 2999.00,
            "category": "T-Shirt",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black"],
            "images": [
                f"{BASE_URL}/uploads/classic_black_tee.jpg"
            ],
            "model_3d_url": None,
            "images_360": [],
            "stock": 100,
            "rating": 4.5,
            "review_count": 12,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Minimalist Hoodie",
            "description": "Comfortable hoodie with minimalist design. Made from soft blend fabric.",
            "price": 6999.00,
            "category": "Hoodie",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [
                f"{BASE_URL}/uploads/minimalist_hoodie.jpg"
            ],
            "model_3d_url": None,
            "images_360": [],
            "stock": 100,
            "rating": 4.8,
            "review_count": 24,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Structured Blazer",
            "description": "Professional structured blazer. Perfect for office or formal events.",
            "price": 14999.00,
            "category": "Jacket",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [
                f"{BASE_URL}/uploads/structured_blazer.jpg"
            ],
            "model_3d_url": None,
            "images_360": [],
            "stock": 100,
            "rating": 4.9,
            "review_count": 18,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Wide Leg Trousers",
            "description": "Elegant wide-leg trousers. Comfortable and stylish.",
            "price": 7999.00,
            "category": "Pants",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [
                f"{BASE_URL}/uploads/wide_leg_trousers.jpg"
            ],
            "model_3d_url": None,
            "images_360": [],
            "stock": 100,
            "rating": 4.6,
            "review_count": 15,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Oversized Shirt",
            "description": "Contemporary oversized shirt. Great for layering or casual wear.",
            "price": 4999.00,
            "category": "Shirt",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "White"],
            "images": [
                f"{BASE_URL}/uploads/oversized_shirt.jpg"
            ],
            "model_3d_url": None,
            "images_360": [],
            "stock": 100,
            "rating": 4.7,
            "review_count": 22,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Knit Sweater",
            "description": "Soft knit sweater perfect for cozy days. Premium quality yarn.",
            "price": 8999.00,
            "category": "Sweater",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [
                f"{BASE_URL}/uploads/knit_sweater.jpg"
            ],
            "model_3d_url": None,
            "images_360": [],
            "stock": 100,
            "rating": 4.8,
            "review_count": 19,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Clear existing products
    await db.products.delete_many({})
    
    # Insert new products
    result = await db.products.insert_many(products)
    print(f"✅ Seeded {len(result.inserted_ids)} products with local images!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_products())
