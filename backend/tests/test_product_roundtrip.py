# Feature: admin-dashboard, Property 10: Product new fields round-trip
# For any valid product data including barcode_id, story, and video_url values,
# creating the product via the API and then retrieving it SHALL return a product
# with the same barcode_id, story, and video_url values.
# Validates: Requirements 6.1, 6.2, 6.3, 6.4

import os
import uuid
import asyncio

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

# Use a dedicated test database
TEST_DB_NAME = f"noir_test_{uuid.uuid4().hex[:8]}"
os.environ["DATABASE_NAME"] = TEST_DB_NAME

from main import app, db, create_token, client as mongo_client  # noqa: E402


# ---------------------------------------------------------------------------
# Strategies – generate realistic but random new-field values
# ---------------------------------------------------------------------------

barcode_strategy = st.one_of(
    st.none(),
    st.text(
        alphabet=st.characters(whitelist_categories=("L", "N")),
        min_size=1,
        max_size=30,
    ),
)

story_strategy = st.one_of(
    st.none(),
    st.text(min_size=0, max_size=200),
)

video_url_strategy = st.one_of(
    st.none(),
    st.text(
        alphabet=st.characters(
            whitelist_categories=("L", "N"),
            whitelist_characters="/-_.",
        ),
        min_size=1,
        max_size=100,
    ),
)


# ---------------------------------------------------------------------------
# Helper: run the full round-trip in a fresh event loop per hypothesis example
# ---------------------------------------------------------------------------

async def _roundtrip(barcode_id, story, video_url):
    """Create an admin user, create a product, retrieve it, verify new fields."""
    import bcrypt as _bc
    from httpx import AsyncClient, ASGITransport
    from motor.motor_asyncio import AsyncIOMotorClient

    # Create a fresh Motor client bound to the current event loop
    fresh_client = AsyncIOMotorClient(os.environ.get("MONGODB_URL", "mongodb://localhost:27017"))
    fresh_db = fresh_client[TEST_DB_NAME]

    # Monkey-patch the app's db reference so route handlers use this loop's client
    import main
    original_db = main.db
    main.db = fresh_db

    try:
        # Ensure admin user exists
        admin_email = "admin_roundtrip@noir.test"
        existing = await fresh_db.users.find_one({"email": admin_email})
        if not existing:
            user_id = str(uuid.uuid4())
            hashed = _bc.hashpw(b"testpass123", _bc.gensalt()).decode()
            await fresh_db.users.insert_one({
                "id": user_id,
                "email": admin_email,
                "password": hashed,
                "name": "Test Admin",
                "is_admin": True,
                "created_at": "2025-01-01T00:00:00+00:00",
            })
        else:
            user_id = existing["id"]

        token = create_token(user_id)
        headers = {"Authorization": f"Bearer {token}"}

        product_payload = {
            "name": f"Test Product {uuid.uuid4().hex[:6]}",
            "description": "Property test product",
            "price": 29.99,
            "category": "T-Shirt",
            "sizes": ["M"],
            "colors": ["Black"],
            "images": ["/uploads/test.jpg"],
            "stock": 50,
            "barcode_id": barcode_id,
            "story": story,
            "video_url": video_url,
        }

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Create product
            create_resp = await ac.post("/api/products", json=product_payload, headers=headers)
            assert create_resp.status_code == 200, create_resp.text
            product_id = create_resp.json()["id"]

            # Retrieve product
            get_resp = await ac.get(f"/api/products/{product_id}")
            assert get_resp.status_code == 200, get_resp.text
            retrieved = get_resp.json()

        # Verify round-trip for the three new fields
        assert retrieved["barcode_id"] == barcode_id, (
            f"barcode_id mismatch: {retrieved['barcode_id']!r} != {barcode_id!r}"
        )
        assert retrieved["story"] == story, (
            f"story mismatch: {retrieved['story']!r} != {story!r}"
        )
        assert retrieved["video_url"] == video_url, (
            f"video_url mismatch: {retrieved['video_url']!r} != {video_url!r}"
        )
    finally:
        main.db = original_db
        fresh_client.close()


# ---------------------------------------------------------------------------
# Property test (sync wrapper so hypothesis controls the loop)
# ---------------------------------------------------------------------------

@settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    barcode_id=barcode_strategy,
    story=story_strategy,
    video_url=video_url_strategy,
)
def test_product_new_fields_roundtrip(barcode_id, story, video_url):
    """Property 10 – creating a product with barcode_id, story, and video_url
    then retrieving it must return the same values."""
    asyncio.run(_roundtrip(barcode_id, story, video_url))


# ---------------------------------------------------------------------------
# Teardown – drop the test database after all tests in this module
# ---------------------------------------------------------------------------

def teardown_module(module):
    async def _drop():
        from motor.motor_asyncio import AsyncIOMotorClient
        c = AsyncIOMotorClient(os.environ.get("MONGODB_URL", "mongodb://localhost:27017"))
        await c.drop_database(TEST_DB_NAME)
        c.close()

    asyncio.run(_drop())
