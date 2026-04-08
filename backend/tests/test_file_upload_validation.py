# Feature: admin-dashboard, Property 11: File upload validation
# For any file, the upload endpoint SHALL accept it if and only if its MIME type
# is in the allowed set (image/jpeg, image/png, image/webp, video/mp4, video/webm)
# AND its size is within the limit (5MB for images, 50MB for videos).
# Files outside these constraints SHALL be rejected.
# Validates: Requirements 7.1, 7.2

import os
import uuid
import asyncio
import io

import pytest
from hypothesis import given, settings, HealthCheck, assume
from hypothesis import strategies as st

TEST_DB_NAME = f"noir_test_{uuid.uuid4().hex[:8]}"
os.environ["DATABASE_NAME"] = TEST_DB_NAME

from main import app, db, create_token, client as mongo_client  # noqa: E402

# ---------------------------------------------------------------------------
# Constants (mirrored from main.py for assertion reference)
# ---------------------------------------------------------------------------

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

# Common MIME types that are NOT in the allowed set
DISALLOWED_MIME_TYPES = [
    "image/gif", "image/bmp", "image/svg+xml", "image/tiff",
    "video/avi", "video/quicktime", "video/x-matroska",
    "application/pdf", "application/json", "text/plain",
    "audio/mpeg", "audio/wav",
]

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

allowed_image_type_st = st.sampled_from(sorted(ALLOWED_IMAGE_TYPES))
allowed_video_type_st = st.sampled_from(sorted(ALLOWED_VIDEO_TYPES))
allowed_type_st = st.sampled_from(sorted(ALLOWED_TYPES))
disallowed_type_st = st.sampled_from(DISALLOWED_MIME_TYPES)

# File sizes: use small sizes for valid cases to keep tests fast
valid_image_size_st = st.integers(min_value=1, max_value=MAX_IMAGE_SIZE)
oversized_image_st = st.integers(min_value=MAX_IMAGE_SIZE + 1, max_value=MAX_IMAGE_SIZE + 1024)
valid_video_size_st = st.integers(min_value=1, max_value=1024 * 1024)  # cap at 1MB for speed
oversized_video_st = st.integers(min_value=MAX_VIDEO_SIZE + 1, max_value=MAX_VIDEO_SIZE + 1024)


# ---------------------------------------------------------------------------
# Helper: perform upload and return status code
# ---------------------------------------------------------------------------

async def _setup_admin():
    """Ensure an admin user exists and return auth headers."""
    import bcrypt as _bc
    from motor.motor_asyncio import AsyncIOMotorClient

    fresh_client = AsyncIOMotorClient(
        os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    )
    fresh_db = fresh_client[TEST_DB_NAME]

    import main
    main.db = fresh_db

    admin_email = "admin_upload_test@noir.test"
    existing = await fresh_db.users.find_one({"email": admin_email})
    if not existing:
        user_id = str(uuid.uuid4())
        hashed = _bc.hashpw(b"testpass123", _bc.gensalt()).decode()
        await fresh_db.users.insert_one({
            "id": user_id,
            "email": admin_email,
            "password": hashed,
            "name": "Upload Test Admin",
            "is_admin": True,
            "created_at": "2025-01-01T00:00:00+00:00",
        })
    else:
        user_id = existing["id"]

    token = create_token(user_id)
    return fresh_client, fresh_db, {"Authorization": f"Bearer {token}"}


async def _upload_file(content_type: str, file_size: int):
    """Upload a file with the given MIME type and size, return the response."""
    from httpx import AsyncClient, ASGITransport
    import main

    fresh_client, fresh_db, headers = await _setup_admin()
    original_db = main.db

    try:
        # Generate minimal file content of the requested size
        content = b"\x00" * file_size

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/admin/upload",
                headers=headers,
                files={"file": ("test_file", io.BytesIO(content), content_type)},
            )
        return resp.status_code, resp.json()
    finally:
        # Clean up any uploaded file
        main.db = original_db
        fresh_client.close()


# ---------------------------------------------------------------------------
# Property tests
# ---------------------------------------------------------------------------

@settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    content_type=allowed_image_type_st,
    file_size=st.integers(min_value=1, max_value=1024),  # small for speed
)
def test_valid_image_upload_accepted(content_type, file_size):
    """Valid image types within size limit SHALL be accepted (200)."""
    status, body = asyncio.run(_upload_file(content_type, file_size))
    assert status == 200, f"Expected 200 for {content_type} ({file_size}B), got {status}: {body}"
    assert "url" in body
    assert "filename" in body
    # Clean up the uploaded file
    url = body["url"]
    filepath = os.path.join("uploads", os.path.basename(url))
    if os.path.exists(filepath):
        os.remove(filepath)


@settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    content_type=allowed_video_type_st,
    file_size=st.integers(min_value=1, max_value=1024),  # small for speed
)
def test_valid_video_upload_accepted(content_type, file_size):
    """Valid video types within size limit SHALL be accepted (200)."""
    status, body = asyncio.run(_upload_file(content_type, file_size))
    assert status == 200, f"Expected 200 for {content_type} ({file_size}B), got {status}: {body}"
    assert "url" in body
    assert "filename" in body
    filepath = os.path.join("uploads", os.path.basename(body["url"]))
    if os.path.exists(filepath):
        os.remove(filepath)


@settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(content_type=disallowed_type_st)
def test_disallowed_mime_type_rejected(content_type):
    """Unsupported MIME types SHALL be rejected with 415."""
    status, body = asyncio.run(_upload_file(content_type, 100))
    assert status == 415, f"Expected 415 for {content_type}, got {status}: {body}"
    assert "Unsupported file format" in body.get("detail", "")


@settings(max_examples=2, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    content_type=allowed_image_type_st,
    file_size=oversized_image_st,
)
def test_oversized_image_rejected(content_type, file_size):
    """Images exceeding 5MB SHALL be rejected with 413."""
    status, body = asyncio.run(_upload_file(content_type, file_size))
    assert status == 413, f"Expected 413 for {content_type} ({file_size}B), got {status}: {body}"
    assert "5MB" in body.get("detail", "")


@settings(max_examples=2, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    content_type=allowed_video_type_st,
    file_size=oversized_video_st,
)
def test_oversized_video_rejected(content_type, file_size):
    """Videos exceeding 50MB SHALL be rejected with 413."""
    status, body = asyncio.run(_upload_file(content_type, file_size))
    assert status == 413, f"Expected 413 for {content_type} ({file_size}B), got {status}: {body}"
    assert "50MB" in body.get("detail", "")


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
