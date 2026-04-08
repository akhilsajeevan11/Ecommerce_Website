# Feature: admin-dashboard, Property 1: Non-admin API access returns 403
# For any non-admin user and for any stock analytics endpoint
# (/api/admin/stock/summary, /api/admin/stock/by-product,
# /api/admin/stock/by-category, /api/admin/stock/dead-stock),
# the API SHALL return a 403 Forbidden response.
# Validates: Requirements 8.5, 1.2

import os
import uuid
import asyncio

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

TEST_DB_NAME = f"noir_test_{uuid.uuid4().hex[:8]}"
os.environ["DATABASE_NAME"] = TEST_DB_NAME

from main import app, db, create_token, client as mongo_client  # noqa: E402

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STOCK_ENDPOINTS = [
    "/api/admin/stock/summary",
    "/api/admin/stock/by-product",
    "/api/admin/stock/by-category",
    "/api/admin/stock/dead-stock",
]

# ---------------------------------------------------------------------------
# Strategies – generate random non-admin user attributes
# ---------------------------------------------------------------------------

email_user_st = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N")),
    min_size=3,
    max_size=15,
)

user_name_st = st.text(
    alphabet=st.characters(whitelist_categories=("L",)),
    min_size=1,
    max_size=30,
)

endpoint_st = st.sampled_from(STOCK_ENDPOINTS)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _check_non_admin_access(email_prefix, user_name, endpoint):
    """Create a non-admin user, call the endpoint, return status and body."""
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
        user_id = str(uuid.uuid4())
        email = f"{email_prefix}_{user_id[:6]}@noir.test"
        hashed = _bc.hashpw(b"testpass123", _bc.gensalt()).decode()
        await fresh_db.users.insert_one({
            "id": user_id,
            "email": email,
            "password": hashed,
            "name": user_name or "TestUser",
            "is_admin": False,
            "created_at": "2025-01-01T00:00:00+00:00",
        })

        token = create_token(user_id)
        headers = {"Authorization": f"Bearer {token}"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get(endpoint, headers=headers)

        return resp.status_code, resp.json()
    finally:
        main.db = original_db
        fresh_client.close()


# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

@settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    email_prefix=email_user_st,
    user_name=user_name_st,
    endpoint=endpoint_st,
)
def test_non_admin_access_returns_403(email_prefix, user_name, endpoint):
    """Property 1 – any non-admin user calling any stock analytics endpoint
    SHALL receive a 403 Forbidden response with 'Admin access required'."""
    status_code, body = asyncio.run(
        _check_non_admin_access(email_prefix, user_name, endpoint)
    )
    assert status_code == 403, (
        f"Expected 403 for non-admin on {endpoint}, got {status_code}: {body}"
    )
    assert body.get("detail") == "Admin access required", (
        f"Expected 'Admin access required' detail, got: {body.get('detail')}"
    )


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
