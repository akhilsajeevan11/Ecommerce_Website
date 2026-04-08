# Feature: admin-dashboard, Property 3: By-product stock list is sorted descending
# For any set of products, the /api/admin/stock/by-product endpoint SHALL return
# a list where each element's stock value is greater than or equal to the next
# element's stock value (descending order).
# Validates: Requirements 2.1, 8.2

import os
import uuid
import asyncio
from datetime import datetime, timezone

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

TEST_DB_NAME = f"noir_test_{uuid.uuid4().hex[:8]}"
os.environ["DATABASE_NAME"] = TEST_DB_NAME

from main import app, create_token  # noqa: E402

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

product_st = st.fixed_dictionaries({
    "name": st.text(
        alphabet=st.characters(whitelist_categories=("L",)),
        min_size=1,
        max_size=20,
    ),
    "stock": st.integers(min_value=0, max_value=500),
    "category": st.sampled_from(["T-Shirt", "Hoodie", "Pants", "Jacket", "Sweater"]),
    "price": st.floats(min_value=1.0, max_value=999.0, allow_nan=False, allow_infinity=False),
})

products_st = st.lists(product_st, min_size=0, max_size=15)

# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

@settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(products=products_st)
def test_by_product_stock_sorted_descending(products):
    """Property 3 – For any set of products, the by-product endpoint SHALL
    return a list sorted by stock in descending order, containing the same
    number of products as inserted.

    **Validates: Requirements 2.1, 8.2**
    """
    asyncio.run(_verify_by_product_sorting(products))


async def _verify_by_product_sorting(products_data):
    import bcrypt as _bc
    from httpx import AsyncClient, ASGITransport
    from motor.motor_asyncio import AsyncIOMotorClient

    fresh_client = AsyncIOMotorClient(
        os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    )
    fresh_db = fresh_client[TEST_DB_NAME]

    import main
    original_db = main.db
    main.db = fresh_db

    try:
        # Clean collections
        await fresh_db.products.delete_many({})
        await fresh_db.users.delete_many({})

        # Create admin user
        admin_id = str(uuid.uuid4())
        hashed = _bc.hashpw(b"testpass123", _bc.gensalt()).decode()
        await fresh_db.users.insert_one({
            "id": admin_id,
            "email": "admin_sorting@noir.test",
            "password": hashed,
            "name": "Test Admin",
            "is_admin": True,
            "created_at": "2025-01-01T00:00:00+00:00",
        })

        # Insert products
        for p in products_data:
            await fresh_db.products.insert_one({
                "id": str(uuid.uuid4()),
                "name": p["name"],
                "description": "test",
                "price": p["price"],
                "category": p["category"],
                "sizes": ["M"],
                "colors": ["Black"],
                "images": ["/test.jpg"],
                "stock": p["stock"],
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

        # Call the endpoint
        token = create_token(admin_id)
        headers = {"Authorization": f"Bearer {token}"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/admin/stock/by-product", headers=headers)

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        body = resp.json()

        # Verify count matches
        assert len(body) == len(products_data), (
            f"Expected {len(products_data)} products, got {len(body)}"
        )

        # Verify sorted descending by stock
        for i in range(len(body) - 1):
            assert body[i]["stock"] >= body[i + 1]["stock"], (
                f"Not sorted descending at index {i}: "
                f"stock[{i}]={body[i]['stock']} < stock[{i+1}]={body[i+1]['stock']}"
            )
    finally:
        main.db = original_db
        fresh_client.close()


# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------

def teardown_module(module):
    async def _drop():
        from motor.motor_asyncio import AsyncIOMotorClient
        c = AsyncIOMotorClient(
            os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
        )
        await c.drop_database(TEST_DB_NAME)
        c.close()

    asyncio.run(_drop())
