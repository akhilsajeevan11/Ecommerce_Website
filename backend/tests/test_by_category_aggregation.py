# Feature: admin-dashboard, Property 4: By-category aggregation correctness
# For any set of products, the /api/admin/stock/by-category endpoint SHALL return
# category groups where each category's total_stock equals the sum of stock values
# of all products in that category, and the sum of all category total_stock values
# equals the total stock across all products.
# Validates: Requirements 2.2, 8.3

import os
import uuid
import asyncio
from collections import defaultdict
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
def test_by_category_aggregation_correctness(products):
    """Property 4 – For any set of products, the by-category endpoint SHALL
    return category groups where each category's total_stock equals the sum of
    its products' stock values, and the grand total matches the sum across all
    products.

    **Validates: Requirements 2.2, 8.3**
    """
    asyncio.run(_verify_by_category_aggregation(products))


async def _verify_by_category_aggregation(products_data):
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
            "email": "admin_category@noir.test",
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

        # Compute expected category totals
        expected_by_category = defaultdict(int)
        for p in products_data:
            expected_by_category[p["category"]] += p["stock"]

        expected_grand_total = sum(p["stock"] for p in products_data)

        # Call the endpoint
        token = create_token(admin_id)
        headers = {"Authorization": f"Bearer {token}"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/admin/stock/by-category", headers=headers)

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        body = resp.json()

        # Verify number of categories matches
        assert len(body) == len(expected_by_category), (
            f"Expected {len(expected_by_category)} categories, got {len(body)}"
        )

        # Build lookup from response
        actual_by_category = {item["category"]: item["total_stock"] for item in body}

        # Verify each category's total_stock
        for category, expected_stock in expected_by_category.items():
            assert category in actual_by_category, (
                f"Category '{category}' missing from response"
            )
            assert actual_by_category[category] == expected_stock, (
                f"Category '{category}': expected total_stock={expected_stock}, "
                f"got {actual_by_category[category]}"
            )

        # Verify grand total across all categories
        actual_grand_total = sum(item["total_stock"] for item in body)
        assert actual_grand_total == expected_grand_total, (
            f"Grand total: expected {expected_grand_total}, got {actual_grand_total}"
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
