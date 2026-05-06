import asyncio
import uuid
import os
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

PG_DATABASE_URL = (
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_async_engine(PG_DATABASE_URL, echo=False)
Session = async_sessionmaker(engine, expire_on_commit=False)


async def seed_products():
    from models.ecommerce import Category, Product, Media, ProductSize, ProductColor

    CDN_BASE_URL = os.getenv("CDN_BASE_URL", "https://media.aksou.in")

    products_data = [
        {
            "name": "Classic Black Tee",
            "description": "Timeless black t-shirt made from premium cotton. Perfect for any occasion.",
            "price": 2999.00,
            "category": "T-Shirt",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black"],
            "images": [f"{CDN_BASE_URL}/T-Shirt/classic_black_tee.jpg"],
            "stock": 100,
            "rating": 4.5,
            "review_count": 12,
        },
        {
            "name": "Minimalist Hoodie",
            "description": "Comfortable hoodie with minimalist design. Made from soft blend fabric.",
            "price": 6999.00,
            "category": "Hoodie",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [f"{CDN_BASE_URL}/Hoodie/minimalist_hoodie.jpg"],
            "stock": 100,
            "rating": 4.8,
            "review_count": 24,
        },
        {
            "name": "Structured Blazer",
            "description": "Professional structured blazer. Perfect for office or formal events.",
            "price": 14999.00,
            "category": "Jacket",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [f"{CDN_BASE_URL}/Jacket/structured_blazer.jpg"],
            "stock": 100,
            "rating": 4.9,
            "review_count": 18,
        },
        {
            "name": "Wide Leg Trousers",
            "description": "Elegant wide-leg trousers. Comfortable and stylish.",
            "price": 7999.00,
            "category": "Pants",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [f"{CDN_BASE_URL}/Pants/wide_leg_trousers.jpg"],
            "stock": 100,
            "rating": 4.6,
            "review_count": 15,
        },
        {
            "name": "Oversized Shirt",
            "description": "Contemporary oversized shirt. Great for layering or casual wear.",
            "price": 4999.00,
            "category": "Shirt",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "White"],
            "images": [f"{CDN_BASE_URL}/Shirt/oversized_shirt.jpg"],
            "stock": 100,
            "rating": 4.7,
            "review_count": 22,
        },
        {
            "name": "Knit Sweater",
            "description": "Soft knit sweater perfect for cozy days. Premium quality yarn.",
            "price": 8999.00,
            "category": "Sweater",
            "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
            "colors": ["Black", "Gray"],
            "images": [f"{CDN_BASE_URL}/Sweater/knit_sweater.jpg"],
            "stock": 100,
            "rating": 4.8,
            "review_count": 19,
        },
    ]

    async with Session() as session:
        # Ensure categories exist (get or create)
        category_map = {}
        category_names = list({p["category"] for p in products_data})
        for name in category_names:
            stmt = select(Category).where(Category.name == name)
            result = await session.execute(stmt)
            cat = result.scalar_one_or_none()
            if not cat:
                cat = Category(
                    id=str(uuid.uuid4()),
                    name=name,
                    slug=name.lower().replace(" ", "-"),
                )
                session.add(cat)
                await session.flush()
            category_map[name] = cat.id

        # Insert products
        for p_data in products_data:
            product_id = str(uuid.uuid4())
            product = Product(
                id=product_id,
                name=p_data["name"],
                description=p_data["description"],
                price=p_data["price"],
                category_id=category_map[p_data["category"]],
                stock=p_data["stock"],
                rating=p_data["rating"],
                review_count=p_data["review_count"],
            )
            session.add(product)

            # Sizes
            for size in p_data["sizes"]:
                session.add(
                    ProductSize(
                        id=str(uuid.uuid4()),
                        product_id=product_id,
                        size_label=size,
                    )
                )

            # Colors
            for color in p_data["colors"]:
                session.add(
                    ProductColor(
                        id=str(uuid.uuid4()),
                        product_id=product_id,
                        color_name=color,
                    )
                )

            # Media (images)
            for i, url in enumerate(p_data["images"]):
                session.add(
                    Media(
                        id=str(uuid.uuid4()),
                        product_id=product_id,
                        url=url,
                        media_type="image",
                        sort_order=i,
                        is_primary=(i == 0),
                    )
                )

        await session.commit()
        print(f"✅ Seeded {len(products_data)} products with CDN image URLs into PostgreSQL!")


if __name__ == "__main__":
    asyncio.run(seed_products())
