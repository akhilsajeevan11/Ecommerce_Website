# Feature: admin-dashboard, Property 12: File upload error reporting
# For any rejected file upload, the error response SHALL contain a descriptive
# message that includes either the maximum allowed file size (if size exceeded)
# or the list of accepted formats (if format unsupported).
# Validates: Requirements 7.4, 7.5

import os
import uuid
import asyncio
import io

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

TEST_DB_NAME = f"noir_test_{uuid.uuid4().hex[:8]}"
os.environ["DATABASE_NAME"] = TEST_DB_NAME

from main import app, db, create_token, client as mongo_client  # noqa: E402

# ---------------------------------------------------------------------------
# Constants (mirrored from main.py)
# ---------------------------------------------------------------------------

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

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
disallowed_type_st = st.sampled_from(DISALLOWED_MIME_TYPES)

oversized_image_st = st.integers(min_value=MAX_IMAGE_SIZE + 1, max_value=MAX_IMAGE_SIZE + 1024)
oversized_video_st = st.integers(min_value=MAX_VIDEO_SIZE + 1, max_value=MAX_VIDEO_SIZE + 1024)

# ---------------------------------------------------------------------------
# Helper
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

    admin_email = "admin_error_report_test@noir.test"
    existing = await fresh_db.users.find_one({"email": admin_email})
    if not existing:
        user_id = str(uuid.uuid4())
        hashed = _bc.hashpw(b"testpass123", _bc.gensalt()).decode()
        await fresh_db.users.insert_one({
            "id": user_id,
            "email": admin_email,
            "password": hashed,
            "name": "Error Report Test Admin",
            "is_admin": True,
            "created_at": "2025-01-01T00:00:00+00:00",
        })
    else:
        user_id = existing["id"]

    token = create_token(user_id)
    return fresh_client, fresh_db, {"Authorization": f"Bearer {token}"}


async def _upload_file(content_type: str, file_size: int):
    """Upload a file and return (status_code, response_body)."""
    from httpx import AsyncClient, ASGITransport
    import main

    fresh_client, fresh_db, headers = await _setup_admin()
    original_db = main.db

    try:
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
        main.db = original_db
        fresh_client.close()


# ---------------------------------------------------------------------------
# Property tests – error message content for unsupported formats
# ---------------------------------------------------------------------------

@settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(content_type=disallowed_type_st)
def test_unsupported_format_error_lists_accepted_formats(content_type):
    """Rejected unsupported-format uploads SHALL mention accepted formats."""
    status, body = asyncio.run(_upload_file(content_type, 100))
    assert status == 415, f"Expected 415 for {content_type}, got {status}"
    detail = body.get("detail", "")
    # Error message must reference the accepted format names
    for fmt in ("JPEG", "PNG", "WebP", "MP4", "WebM"):
        assert fmt in detail, (
            f"Error for unsupported type '{content_type}' should list '{fmt}' "
            f"in accepted formats. Got: {detail}"
        )


# ---------------------------------------------------------------------------
# Property tests – error message content for oversized images
# ---------------------------------------------------------------------------

@settings(max_examples=2, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(content_type=allowed_image_type_st, file_size=oversized_image_st)
def test_oversized_image_error_mentions_max_size(content_type, file_size):
    """Rejected oversized image uploads SHALL mention the 5MB limit."""
    status, body = asyncio.run(_upload_file(content_type, file_size))
    assert status == 413, f"Expected 413 for {content_type} ({file_size}B), got {status}"
    detail = body.get("detail", "")
    assert "5MB" in detail, (
        f"Error for oversized image ({content_type}, {file_size}B) should mention "
        f"'5MB' max size. Got: {detail}"
    )


# ---------------------------------------------------------------------------
# Property tests – error message content for oversized videos
# ---------------------------------------------------------------------------

@settings(max_examples=2, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(content_type=allowed_video_type_st, file_size=oversized_video_st)
def test_oversized_video_error_mentions_max_size(content_type, file_size):
    """Rejected oversized video uploads SHALL mention the 50MB limit."""
    status, body = asyncio.run(_upload_file(content_type, file_size))
    assert status == 413, f"Expected 413 for {content_type} ({file_size}B), got {status}"
    detail = body.get("detail", "")
    assert "50MB" in detail, (
        f"Error for oversized video ({content_type}, {file_size}B) should mention "
        f"'50MB' max size. Got: {detail}"
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
