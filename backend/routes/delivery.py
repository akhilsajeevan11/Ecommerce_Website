"""
Delivery pincode endpoints.

Public:
    GET /api/delivery/check?pincode=XXXXXX
        Returns { serviceable: bool, eta_days: int | null, pincode: str }
        - If the admin has stored a list of serviceable pincodes (via the
          site_settings key "delivery_pincodes"), only those pincodes receive
          serviceable=true.
        - If the admin has never set any pincodes (key missing / empty list),
          the system falls back to the "serve-all" mode: every valid 6-digit
          pincode returns serviceable=true with a 5-7 day window.  This
          preserves the existing behaviour before pincode management was added.

Admin:
    GET  /api/admin/delivery/pincodes
        Returns the current list.
    PUT  /api/admin/delivery/pincodes
        Replaces the list.  Body: { "pincodes": ["110001", "560001", ...] }
        Each element must be exactly 6 ASCII digits.
    POST /api/admin/delivery/pincodes/add
        Adds one or many pincodes without replacing the list.
        Body: { "pincodes": ["400001"] }
    POST /api/admin/delivery/pincodes/remove
        Removes one or many pincodes.  Body: { "pincodes": ["400001"] }
"""

import json
import re
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import SiteSettings

router = APIRouter(tags=["delivery"])

# The key used in the site_settings table to store the pincode list.
SETTINGS_KEY = "delivery_pincodes"

# Default delivery window (days) returned when a pincode is serviceable.
ETA_MIN = 5
ETA_MAX = 7

_PINCODE_RE = re.compile(r"^\d{6}$")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_pincode_set(session) -> set[str] | None:
    """
    Return the set of serviceable pincodes from site_settings, or None if
    the key has never been set / the stored list is empty (serve-all mode).
    """
    result = await session.execute(
        select(SiteSettings).where(SiteSettings.key == SETTINGS_KEY)
    )
    row = result.scalar_one_or_none()
    if not row or not row.value:
        return None
    try:
        pincodes = json.loads(row.value)
    except (json.JSONDecodeError, TypeError):
        return None
    if not pincodes:           # empty list → serve-all mode
        return None
    return set(str(p) for p in pincodes)


async def _save_pincode_list(session, pincodes: list[str]):
    """Upsert the pincode list into site_settings."""
    result = await session.execute(
        select(SiteSettings).where(SiteSettings.key == SETTINGS_KEY)
    )
    row = result.scalar_one_or_none()
    serialised = json.dumps(sorted(set(pincodes)))
    if row:
        row.value = serialised
        row.updated_at = datetime.now(timezone.utc)
    else:
        session.add(SiteSettings(
            key=SETTINGS_KEY,
            value=serialised,
            updated_at=datetime.now(timezone.utc),
        ))
    await session.commit()


def _validate_pincodes(pincodes: list[str]) -> list[str]:
    """Raise 422 if any element is not a 6-digit string."""
    bad = [p for p in pincodes if not _PINCODE_RE.match(str(p))]
    if bad:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid pincodes (must be exactly 6 digits): {bad}",
        )
    return [str(p) for p in pincodes]


# ── Pydantic models ───────────────────────────────────────────────────────────

class PincodeListBody(BaseModel):
    pincodes: List[str]

    @field_validator("pincodes")
    @classmethod
    def all_six_digits(cls, v):
        bad = [p for p in v if not _PINCODE_RE.match(str(p))]
        if bad:
            raise ValueError(f"Not 6-digit pincodes: {bad}")
        return [str(p) for p in v]


# ── Public endpoint ───────────────────────────────────────────────────────────

@router.get("/api/delivery/check")
async def check_delivery(pincode: str = Query(..., min_length=6, max_length=6)):
    """
    Check whether a pincode is serviceable.

    Response:
        { "pincode": "560001", "serviceable": true, "eta_min": 5, "eta_max": 7 }
        { "pincode": "999999", "serviceable": false, "eta_min": null, "eta_max": null }
    """
    if not _PINCODE_RE.match(pincode):
        raise HTTPException(status_code=422, detail="Pincode must be exactly 6 digits")

    async with PgSession() as session:
        pincode_set = await _get_pincode_set(session)

    # serve-all mode — no pincodes configured by admin
    if pincode_set is None:
        return {
            "pincode": pincode,
            "serviceable": True,
            "eta_min": ETA_MIN,
            "eta_max": ETA_MAX,
            "mode": "serve_all",
        }

    serviceable = pincode in pincode_set
    return {
        "pincode": pincode,
        "serviceable": serviceable,
        "eta_min": ETA_MIN if serviceable else None,
        "eta_max": ETA_MAX if serviceable else None,
        "mode": "allowlist",
    }


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/api/admin/delivery/pincodes")
async def get_delivery_pincodes(current_user=Depends(get_current_user)):
    """Return the full serviceable-pincode list and current mode."""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        pincode_set = await _get_pincode_set(session)

    if pincode_set is None:
        return {"pincodes": [], "mode": "serve_all", "count": 0}

    pincodes = sorted(pincode_set)
    return {"pincodes": pincodes, "mode": "allowlist", "count": len(pincodes)}


@router.put("/api/admin/delivery/pincodes")
async def set_delivery_pincodes(
    body: PincodeListBody,
    current_user=Depends(get_current_user),
):
    """
    Replace the full pincode list.
    Pass an empty list [] to switch back to serve-all mode.
    """
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        await _save_pincode_list(session, body.pincodes)

    mode = "serve_all" if not body.pincodes else "allowlist"
    return {
        "message": "Pincode list updated",
        "count": len(body.pincodes),
        "mode": mode,
    }


@router.post("/api/admin/delivery/pincodes/add")
async def add_delivery_pincodes(
    body: PincodeListBody,
    current_user=Depends(get_current_user),
):
    """Add pincodes to the existing list (no duplicates)."""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        existing = await _get_pincode_set(session) or set()
        merged = sorted(existing | set(body.pincodes))
        await _save_pincode_list(session, merged)

    return {"message": f"Added {len(body.pincodes)} pincode(s)", "count": len(merged)}


@router.post("/api/admin/delivery/pincodes/remove")
async def remove_delivery_pincodes(
    body: PincodeListBody,
    current_user=Depends(get_current_user),
):
    """Remove pincodes from the existing list."""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        existing = await _get_pincode_set(session) or set()
        remaining = sorted(existing - set(body.pincodes))
        await _save_pincode_list(session, remaining)

    removed = len(body.pincodes)
    return {"message": f"Removed {removed} pincode(s)", "count": len(remaining)}
