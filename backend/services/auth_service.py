import bcrypt
import jwt
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import select, or_

from config import JWT_SECRET, PgSession
from models.user_table import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def check_duplicate_user(email: str, phone: str = None):
    """Check if email or phone already exists. Raises HTTPException if duplicate."""
    async with PgSession() as session:
        result = await session.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
        if phone:
            result = await session.execute(select(User).where(User.phone == phone))
            if result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Phone number already registered")


async def register_user(
    name: str, email: str, password: str, phone: str = None, dob: str = None
):
    async with PgSession() as session:
        hashed_pw = hash_password(password)
        user_id = str(uuid.uuid4())

        new_user = User(
            id=user_id,
            name=name,
            email=email,
            phone=phone,
            dob=dob,
            password=hashed_pw,
            is_admin=False,
            created_at=datetime.now(timezone.utc),
        )

        session.add(new_user)
        await session.commit()

    token = create_token(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "email": email, "name": name, "is_admin": False},
    }


async def login_user(identifier: str, password: str):
    async with PgSession() as session:
        result = await session.execute(
            select(User).where(
                or_(User.email == identifier, User.phone == identifier)
            )
        )
        db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")

    if not verify_password(password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")

    access_token = create_token(db_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "name": db_user.name,
            "is_admin": db_user.is_admin,
        },
    }


async def get_user_by_id(user_id: str):
    async with PgSession() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


async def update_user_profile(user_id: str, phone: str = None, dob: str = None):
    """Update user's phone and/or dob."""
    async with PgSession() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        db_user = result.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        if phone:
            # Check if phone is already taken by another user
            existing = await session.execute(
                select(User).where(User.phone == phone, User.id != user_id)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Phone number already in use")
            db_user.phone = phone

        if dob:
            db_user.dob = dob

        await session.commit()

    return {"message": "Profile updated", "phone": phone, "dob": dob}
