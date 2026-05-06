from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
import os
import uuid
import boto3
from botocore.exceptions import ClientError

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Media

router = APIRouter(prefix="/api/admin", tags=["admin-upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

# S3 config from environment
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
CDN_BASE_URL = os.getenv("CDN_BASE_URL")  # e.g. https://media.aksou.in

# Determine storage mode: 's3' if all S3 vars are set, else 'local'
USE_S3 = all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME, CDN_BASE_URL])

if USE_S3:
    s3_client = boto3.client(
        "s3",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    product_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file format. Accepted: JPEG, PNG, WebP, MP4, WebM"
        )

    contents = await file.read()
    file_size = len(contents)

    if file.content_type in ALLOWED_IMAGE_TYPES and file_size > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum of 5MB for images")
    if file.content_type in ALLOWED_VIDEO_TYPES and file_size > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum of 50MB for videos")

    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{ext}"

    if USE_S3:
        # Upload to S3 under category folder if provided, otherwise uploads/
        if category:
            folder = category.strip().replace(" ", "-")
            s3_key = f"{folder}/{unique_filename}"
        else:
            s3_key = f"uploads/{unique_filename}"
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=s3_key,
                Body=contents,
                ContentType=file.content_type,
            )
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")

        url = f"{CDN_BASE_URL}/{s3_key}"
    else:
        # Fallback: save to local disk (development)
        os.makedirs("uploads", exist_ok=True)
        file_path = os.path.join("uploads", unique_filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        url = f"/uploads/{unique_filename}"

    # If product_id is provided, insert a record into the media table
    if product_id:
        media_type = "video" if file.content_type in ALLOWED_VIDEO_TYPES else "image"
        async with PgSession() as session:
            media_record = Media(
                id=str(uuid.uuid4()),
                product_id=product_id,
                url=url,
                media_type=media_type,
                sort_order=0,
                is_primary=False,
                original_filename=file.filename,
                file_size=file_size,
                mime_type=file.content_type,
            )
            session.add(media_record)
            await session.commit()

    return {"url": url, "filename": file.filename}
