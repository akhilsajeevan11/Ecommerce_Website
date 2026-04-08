# Feature: admin-dashboard, Property 2: Summary aggregation correctness
# For any set of products in the database and for any set of orders,
# the /api/admin/stock/summary endpoint SHALL return:
# - total_stock equal to the sum of all product stock values
# - total_products equal to the count of all products
# - out_of_stock_count equal to the count of products with stock === 0
# - dead_stock_count equal to the count of products with zero non-cancelled
#   orders in the last 30 days
# Validates: Requirements 1.3, 4.3, 8.1

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

# Generate a list of products with random stock values (including 0 for out-of-stock)
product_stock_st = st.integers(min_value=0, max_value=500)

product_st = st.fixed_dictionaries({
    "name": st.text(
        alphabet=st.characters(whitelist_categories=("L",)),
        min_size=1,
        max_size=20,
    ),
    "stock": product_stock_st,
    "category": st.sampled_from(["T-Shirt", "Hoodie", "Pants", "Jacket", "Sweater"]),
    "price": st.floats(min_value=1.0, max_value=999.0, allow_nan=False, allow_infinity=False),
})

products_st = st.lists(product_st, min_size=0, max_size=8)

# Order status: "cancelled" orders should be excluded from dead stock calc
order_status_st = st.sampled_from(["confirmed", "shipped", "delivered", "cancelled"])

# Whether the order is recent (within 30 days) or old
order_recency_st = st.booleans()  # True = recent, False = older than 30 days

# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

@settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(data=st.data())
def test_summary_aggregation_correctness(data):
    """Property 2 – For any set of products and orders, the summary endpoint
    SHALL return correct total_stock, total_products, out_of_stock_count,
    and dead_stock_count."""
    products_data = data.draw(products_st, label="products")

    # Build product IDs upfront so orders can reference them
    product_ids = [str(uuid.uuid4()) for _ in products_data]

    # Generate orders that reference actual product IDs
    if product_ids:
        single_order = st.fixed_dictionaries({
            "product_id": st.sampled_from(product_ids),
            "status": order_status_st,
            "recent": order_recency_st,
        })
        orders_strategy = st.lists(single_order, min_size=0, max_size=10)
    else:
        orders_strategy = st.just([])

    orders_spec = data.draw(orders_strategy, label="orders")

    # We need to pass product_ids into the helper so it uses the same IDs
    asyncio.run(_verify_summary_with_ids(products_data, product_ids, orders_spec))


async def _verify_summary_with_ids(products_data, product_ids, orders_spec):
    """
    Insert products (with pre-assigned IDs) and orders, call summary endpoint,
    verify aggregation math.
    """
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
        await fresh_db.orders.delete_many({})

        # Create admin user
        admin_id = str(uuid.uuid4())
        hashed = _bc.hashpw(b"testpass123", _bc.gensalt()).decode()
        await fresh_db.users.delete_many({})
        await fresh_db.users.insert_one({
            "id": admin_id,
            "email": "admin_summary@noir.test",
            "password": hashed,
            "name": "Test Admin",
            "is_admin": True,
            "created_at": "2025-01-01T00:00:00+00:00",
        })

        # Insert products with pre-assigned IDs
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

        # Compute expected values
        expected_total_stock = sum(p["stock"] for p in products_data)
        expected_total_products = len(products_data)
        expected_out_of_stock = sum(1 for p in products_data if p["stock"] == 0)

        # Dead stock: products NOT in any recent non-cancelled order
        recently_ordered_ids = set()
        for o in orders_spec:
            if o["recent"] and o["status"] != "cancelled":
                recently_ordered_ids.add(o["product_id"])
        expected_dead_stock = len(set(product_ids) - recently_ordered_ids)

        # Call the endpoint
        token = create_token(admin_id)
        headers = {"Authorization": f"Bearer {token}"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/admin/stock/summary", headers=headers)

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        body = resp.json()

        assert body["total_stock"] == expected_total_stock, (
            f"total_stock: expected {expected_total_stock}, got {body['total_stock']}"
        )
        assert body["total_products"] == expected_total_products, (
            f"total_products: expected {expected_total_products}, got {body['total_products']}"
        )
        assert body["out_of_stock_count"] == expected_out_of_stock, (
            f"out_of_stock_count: expected {expected_out_of_stock}, got {body['out_of_stock_count']}"
        )
        assert body["dead_stock_count"] == expected_dead_stock, (
            f"dead_stock_count: expected {expected_dead_stock}, got {body['dead_stock_count']}"
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
