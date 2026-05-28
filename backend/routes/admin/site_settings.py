from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import SiteSettings

router = APIRouter(tags=["site-settings"])


@router.get("/api/site-settings")
async def get_site_settings():
    """Public endpoint — returns all site settings as a JSON object."""
    async with PgSession() as session:
        result = await session.execute(select(SiteSettings))
        rows = result.scalars().all()

    if not rows:
        return {"hero_banner_url": None}

    return {row.key: row.value for row in rows}


@router.put("/api/admin/site-settings")
async def update_site_settings(
    body: dict,
    current_user=Depends(get_current_user),
):
    """Admin-only endpoint — upserts key-value pairs into site_settings."""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        for key, value in body.items():
            result = await session.execute(
                select(SiteSettings).where(SiteSettings.key == key)
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.value = str(value) if value is not None else ""
                existing.updated_at = datetime.now(timezone.utc)
            else:
                new_setting = SiteSettings(
                    key=key,
                    value=str(value) if value is not None else "",
                    updated_at=datetime.now(timezone.utc),
                )
                session.add(new_setting)

        await session.commit()

    return {"message": "Site settings updated"}
