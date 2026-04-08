# Feature: admin-dashboard, Property 5: Dead stock identification correctness
# For any set of products and orders, the /api/admin/stock/dead-stock endpoint
# SHALL return exactly those products whose IDs do not appear in any
# non-cancelled order created within the last 30 days.
# Validates: Requirements 4.1, 8.4

import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

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

products_st = st.lists(product_st, min_size=1, max_size=10)

order_status_st = st.sampled_from(["confirmed", "shipped", "delivered", "cancelled"])
order_recency_st = st.booleans()  # True = within 30 days, False = older

# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

@settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(data=st.data())
def test_dead_stock_identification_correctness(data):
    """Property 5 – For any set of products and orders, the dead-stock endpoint
    SHALL return exactly those products whose IDs do not appear in any
    non-cancelled order created within the last 30 days."""
    products_data = data.draw(products_st, label="products")
    product_ids = [str(uuid.uuid4()) for _ in products_data]

    single_order = st.fixed_dictionaries({
        "product_id": st.sampled_from(product_ids),
        "status": order_status_st,
        "recent": order_recency_st,
    })
    orders_spec = data.draw(
        st.lists(single_order, min_size=0, max_size=12), label="orders"
    )

    asyncio.run(_verify_dead_stock(products_data, product_ids, orders_spec))


async def _verify_dead_stock(products_data, product_ids, orders_spec):
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
        await fresh_db.products.delete_many({})
        await fresh_db.orders.delete_many({})
        await fresh_db.users.delete_many({})

        # Create admin user
        admin_id = str(uuid.uuid4())
        hashed = _bc.hashpw(b"testpass123", _bc.gensalt()).decode()
        await fresh_db.users.insert_one({
            "id": admin_id,
            "email": "admin_deadstock@noir.test",
            "password": hashed,
            "name": "Test Admin",
            "is_admin": True,
            "created_at": "2025-01-01T00:00:00+00:00",
        })

        # Insert products
        for pid, p in zip(product_ids, products_data):
            await fresh_db.products.insert_one({
                "id": pid,
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

        # Insert orders
        now = datetime.now(timezone.utc)
        for o in orders_spec:
            created_at = (
                (now - timedelta(days=5)).isoformat()
                if o["recent"]
                else (now - timedelta(days=60)).isoformat()
            )
            await fresh_db.orders.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": admin_id,
                "items": [{"product_id": o["product_id"], "quantity": 1, "size": "M", "color": "Black"}],
                "total": 10.0,
                "status": o["status"],
                "created_at": created_at,
            })

        # Compute expected dead stock IDs
        recently_ordered_ids = set()
        for o in orders_spec:
            if o["recent"] and o["status"] != "cancelled":
                recently_ordered_ids.add(o["product_id"])
        expected_dead_ids = set(product_ids) - recently_ordered_ids

        # Call the endpoint
        token = create_token(admin_id)
        headers = {"Authorization": f"Bearer {token}"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/admin/stock/dead-stock", headers=headers)

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        body = resp.json()

        actual_dead_ids = {p["id"] for p in body}

        assert actual_dead_ids == expected_dead_ids, (
            f"Dead stock mismatch.\n"
            f"  Expected IDs: {expected_dead_ids}\n"
            f"  Actual IDs:   {actual_dead_ids}\n"
            f"  Missing:      {expected_dead_ids - actual_dead_ids}\n"
            f"  Extra:        {actual_dead_ids - expected_dead_ids}"
        )

        # Verify each returned product has the expected fields
        for p in body:
            assert "id" in p
            assert "name" in p
            assert "category" in p
            assert "stock" in p
            assert "price" in p
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
