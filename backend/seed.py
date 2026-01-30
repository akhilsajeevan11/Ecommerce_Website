import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

MONGO_URL = "mongodb://localhost:27018"
DB_NAME = "noir_db"

async def seed_products():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
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
                "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80"
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
                "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80"
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
                "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80"
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
                "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80"
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
                "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&q=80"
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
                "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80"
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
    print(f"✅ Seeded {len(result.inserted_ids)} products!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_products())
