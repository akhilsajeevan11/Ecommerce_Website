import uuid
import httpx
from datetime import datetime, timezone
from sqlalchemy import select

from config import (
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET,
    PgSession,
)
from models.user_table import User
from services.auth_service import create_token


async def get_google_user_info(code: str, redirect_uri: str) -> dict:
    """Exchange Google auth code for user info."""
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise Exception(f"Google token error: {token_data}")

        # Get user info
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return user_resp.json()


async def get_microsoft_user_info(code: str, redirect_uri: str) -> dict:
    """Exchange Microsoft auth code for user info."""
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            data={
                "code": code,
                "client_id": MICROSOFT_CLIENT_ID,
                "client_secret": MICROSOFT_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
                "scope": "openid email profile",
            },
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise Exception(f"Microsoft token error: {token_data}")

        user_resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return user_resp.json()


async def find_or_create_social_user(email: str, name: str, provider: str) -> dict:
    """Find existing user by email or create new one. Returns JWT response."""
    async with PgSession() as session:
        result = await session.execute(select(User).where(User.email == email))
        db_user = result.scalar_one_or_none()

        if db_user:
            # Existing user — just log them in
            print(f"[SOCIAL-AUTH] Existing user found: {email} (provider: {db_user.auth_provider})")
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

        # New user — create account
        user_id = str(uuid.uuid4())
        new_user = User(
            id=user_id,
            name=name,
            email=email,
            password=None,
            auth_provider=provider,
            is_admin=False,
            created_at=datetime.now(timezone.utc),
        )
        session.add(new_user)
        await session.commit()

        print(f"[SOCIAL-AUTH] New user created: {email} (provider: {provider})")
        access_token = create_token(user_id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "is_admin": False,
            },
        }
