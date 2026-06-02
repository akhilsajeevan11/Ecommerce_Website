"""
User address management.

GET    /api/addresses          — list logged-in user's addresses
POST   /api/addresses          — create a new address
PUT    /api/addresses/{id}     — update an address (must belong to caller)
DELETE /api/addresses/{id}     — delete an address (must belong to caller)
PUT    /api/addresses/{id}/default — set an address as default
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from config import PgSession
from dependencies import get_current_user

# We query the raw table because we created it outside SQLAlchemy ORM.
# Using text() queries keeps this self-contained without touching ecommerce.py.
from sqlalchemy import text

router = APIRouter(prefix="/api/addresses", tags=["addresses"])


class AddressIn(BaseModel):
    name: str
    phone: str
    address: str
    city: str
    state: str
    postalCode: str          # Frontend uses camelCase
    is_default: bool = False

    @field_validator("name", "phone", "address", "city", "state", "postalCode")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_digits(cls, v):
        digits = v.replace(" ", "").replace("-", "").replace("+", "")
        if not digits.isdigit() or len(digits) < 6:
            raise ValueError("Phone must contain at least 6 digits")
        return v.strip()

    @field_validator("postalCode")
    @classmethod
    def postal_len(cls, v):
        if len(v.strip()) < 4:
            raise ValueError("Postal code too short")
        return v.strip()


def _row_to_dict(row):
    return {
        "id":         row.id,
        "name":       row.name,
        "phone":      row.phone,
        "address":    row.address,
        "city":       row.city,
        "state":      row.state,
        "postalCode": row.postal_code,   # map snake_case → camelCase for frontend
        "is_default": row.is_default,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("")
async def list_addresses(current_user=Depends(get_current_user)):
    """Return all addresses for the authenticated user, newest first."""
    user_id = current_user["id"]
    async with PgSession() as session:
        result = await session.execute(
            text(
                "SELECT id, name, phone, address, city, state, postal_code, "
                "is_default, created_at "
                "FROM addresses "
                "WHERE user_id = :uid "
                "ORDER BY is_default DESC, created_at DESC"
            ),
            {"uid": user_id},
        )
        rows = result.fetchall()
    return [_row_to_dict(r) for r in rows]


@router.post("", status_code=201)
async def create_address(body: AddressIn, current_user=Depends(get_current_user)):
    """Create a new address for the authenticated user."""
    user_id = current_user["id"]
    addr_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    async with PgSession() as session:
        # If this is the first address or explicitly marked default,
        # clear existing default first.
        if body.is_default:
            await session.execute(
                text(
                    "UPDATE addresses SET is_default = FALSE "
                    "WHERE user_id = :uid"
                ),
                {"uid": user_id},
            )

        await session.execute(
            text(
                "INSERT INTO addresses "
                "(id, user_id, name, phone, address, city, state, "
                "postal_code, is_default, created_at, updated_at) "
                "VALUES (:id, :uid, :name, :phone, :address, :city, :state, "
                ":postal_code, :is_default, :now, :now)"
            ),
            {
                "id": addr_id,
                "uid": user_id,
                "name": body.name,
                "phone": body.phone,
                "address": body.address,
                "city": body.city,
                "state": body.state,
                "postal_code": body.postalCode,
                "is_default": body.is_default,
                "now": now,
            },
        )

        # Auto-mark as default if it's the first address
        count_result = await session.execute(
            text("SELECT COUNT(*) FROM addresses WHERE user_id = :uid"),
            {"uid": user_id},
        )
        count = count_result.scalar()
        if count == 1:
            await session.execute(
                text("UPDATE addresses SET is_default = TRUE WHERE id = :id"),
                {"id": addr_id},
            )

        await session.commit()

        # Fetch back the inserted row
        row = (
            await session.execute(
                text(
                    "SELECT id, name, phone, address, city, state, postal_code, "
                    "is_default, created_at FROM addresses WHERE id = :id"
                ),
                {"id": addr_id},
            )
        ).fetchone()

    return _row_to_dict(row)


@router.put("/{addr_id}")
async def update_address(
    addr_id: str,
    body: AddressIn,
    current_user=Depends(get_current_user),
):
    """Update an address.  Returns 404 if not found or not owned by caller."""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)

    async with PgSession() as session:
        existing = (
            await session.execute(
                text(
                    "SELECT id FROM addresses "
                    "WHERE id = :id AND user_id = :uid"
                ),
                {"id": addr_id, "uid": user_id},
            )
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Address not found")

        if body.is_default:
            await session.execute(
                text(
                    "UPDATE addresses SET is_default = FALSE "
                    "WHERE user_id = :uid"
                ),
                {"uid": user_id},
            )

        await session.execute(
            text(
                "UPDATE addresses "
                "SET name=:name, phone=:phone, address=:address, "
                "city=:city, state=:state, postal_code=:postal_code, "
                "is_default=:is_default, updated_at=:now "
                "WHERE id=:id AND user_id=:uid"
            ),
            {
                "name": body.name,
                "phone": body.phone,
                "address": body.address,
                "city": body.city,
                "state": body.state,
                "postal_code": body.postalCode,
                "is_default": body.is_default,
                "now": now,
                "id": addr_id,
                "uid": user_id,
            },
        )
        await session.commit()

        row = (
            await session.execute(
                text(
                    "SELECT id, name, phone, address, city, state, postal_code, "
                    "is_default, created_at FROM addresses WHERE id = :id"
                ),
                {"id": addr_id},
            )
        ).fetchone()

    return _row_to_dict(row)


@router.delete("/{addr_id}", status_code=204)
async def delete_address(addr_id: str, current_user=Depends(get_current_user)):
    """Delete an address.  Returns 404 if not found or not owned by caller."""
    user_id = current_user["id"]

    async with PgSession() as session:
        existing = (
            await session.execute(
                text(
                    "SELECT id, is_default FROM addresses "
                    "WHERE id = :id AND user_id = :uid"
                ),
                {"id": addr_id, "uid": user_id},
            )
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Address not found")

        await session.execute(
            text("DELETE FROM addresses WHERE id = :id AND user_id = :uid"),
            {"id": addr_id, "uid": user_id},
        )

        # If we deleted the default, promote the most recent remaining address
        if existing.is_default:
            await session.execute(
                text(
                    "UPDATE addresses SET is_default = TRUE "
                    "WHERE id = ("
                    "  SELECT id FROM addresses "
                    "  WHERE user_id = :uid "
                    "  ORDER BY created_at DESC LIMIT 1"
                    ")"
                ),
                {"uid": user_id},
            )

        await session.commit()


@router.put("/{addr_id}/default")
async def set_default_address(addr_id: str, current_user=Depends(get_current_user)):
    """Set an address as the default for the user."""
    user_id = current_user["id"]

    async with PgSession() as session:
        existing = (
            await session.execute(
                text(
                    "SELECT id FROM addresses "
                    "WHERE id = :id AND user_id = :uid"
                ),
                {"id": addr_id, "uid": user_id},
            )
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Address not found")

        await session.execute(
            text("UPDATE addresses SET is_default = FALSE WHERE user_id = :uid"),
            {"uid": user_id},
        )
        await session.execute(
            text(
                "UPDATE addresses SET is_default = TRUE "
                "WHERE id = :id AND user_id = :uid"
            ),
            {"id": addr_id, "uid": user_id},
        )
        await session.commit()

    return {"message": "Default address updated"}
