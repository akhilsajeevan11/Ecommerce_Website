from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from models.user import UserRegister, OtpVerify
from services.auth_service import register_user, login_user, check_duplicate_user, update_user_profile
from services.email_service import generate_otp, send_otp_email, store_otp, verify_otp
from dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

print("[AUTH ROUTES] Loaded: send-otp, verify-otp-register, login, token, me, profile, google, microsoft")


# ── Registration endpoints ────────────────────────────────

@router.post("/send-otp")
async def send_otp(user: UserRegister):
    """Step 1: Validate, check duplicates, send OTP to email."""
    print("\n" + "=" * 50)
    print("[SEND-OTP] Incoming request:")
    print(f"  Name:  {user.name}")
    print(f"  Email: {user.email}")
    print(f"  Phone: {user.phone}")
    print(f"  DOB:   {user.dob}")
    print("=" * 50)

    await check_duplicate_user(email=user.email, phone=user.phone)

    otp = generate_otp()
    print(f"[SEND-OTP] Generated OTP: {otp}")

    store_otp(
        email=user.email,
        otp=otp,
        registration_data={
            "name": user.name,
            "email": user.email,
            "password": user.password,
            "phone": user.phone,
            "dob": user.dob,
        },
    )

    sent = send_otp_email(to_email=user.email, otp=otp)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    print(f"[SEND-OTP] OTP email sent to {user.email}")
    print("=" * 50 + "\n")
    return {"message": "OTP sent to your email", "email": user.email}


@router.post("/verify-otp-register")
async def verify_otp_register(body: OtpVerify):
    """Step 2: Verify OTP, insert user to DB."""
    print("\n" + "=" * 50)
    print(f"[VERIFY-OTP] Email: {body.email}, OTP: {body.otp}")

    data, error = verify_otp(email=body.email, otp=body.otp)
    if error:
        print(f"[VERIFY-OTP] Failed: {error}")
        print("=" * 50 + "\n")
        raise HTTPException(status_code=400, detail=error)

    result = await register_user(
        name=data["name"],
        email=data["email"],
        password=data["password"],
        phone=data["phone"],
        dob=data["dob"],
    )

    print("[VERIFY-OTP] User registered in PostgreSQL:")
    print(f"  User ID: {result['user']['id']}")
    print(f"  Email:   {result['user']['email']}")
    print(f"  Name:    {result['user']['name']}")
    print("=" * 50 + "\n")
    return {"message": "Registration successful", "user": result["user"]}


# ── Login endpoints ───────────────────────────────────────

class LoginRequest(BaseModel):
    identifier: str
    password: str


@router.post("/login")
async def login(body: LoginRequest):
    """
    JSON login endpoint.
    Accepts { identifier, password } — identifier is email or phone.
    Returns { access_token, token_type, user }.
    """
    print("\n" + "=" * 50)
    print("[LOGIN] Incoming request:")
    print(f"  Identifier: {body.identifier}")
    print("=" * 50)

    result = await login_user(
        identifier=body.identifier,
        password=body.password,
    )

    print("[LOGIN] Authenticated from PostgreSQL:")
    print(f"  User ID: {result['user']['id']}")
    print(f"  Email:   {result['user']['email']}")
    print(f"  Name:    {result['user']['name']}")
    print("=" * 50 + "\n")
    return result


@router.post("/token")
async def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2-compatible token endpoint for Swagger / API clients.
    Accepts form-data: username (email or phone) + password.
    """
    result = await login_user(
        identifier=form_data.username,
        password=form_data.password,
    )
    return result


# ── Current user ──────────────────────────────────────────

@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user


# ── Profile update ────────────────────────────────────────


class ProfileUpdate(BaseModel):
    phone: str = None
    dob: str = None


@router.get("/profile-test")
async def profile_test():
    """Debug endpoint to verify profile route is registered."""
    return {"status": "profile route works"}


@router.put("/profile")
async def update_profile(body: ProfileUpdate, current_user=Depends(get_current_user)):
    """Update phone and/or DOB for the current user."""
    print(f"\n{'='*50}")
    print(f"[PROFILE] Update for user: {current_user['email']}")
    print(f"  Phone: {body.phone}")
    print(f"  DOB:   {body.dob}")
    print(f"{'='*50}\n")

    result = await update_user_profile(
        user_id=current_user["id"],
        phone=body.phone,
        dob=body.dob,
    )
    return result


# ── Social Login (Google & Microsoft) ─────────────────────

from urllib.parse import urlencode
from fastapi.responses import RedirectResponse
from config import (
    GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID, FRONTEND_URL,
)
from services.social_auth_service import (
    get_google_user_info, get_microsoft_user_info, find_or_create_social_user,
)

# BACKEND_URL = "http://localhost:8000"
BACKEND_URL = "http://13.127.148.96"


@router.get("/google")
async def google_login():
    """Redirect user to Google consent screen."""
    params = urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(code: str):
    """Google redirects here with auth code. Exchange for user info, create/find user."""
    try:
        redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
        user_info = await get_google_user_info(code, redirect_uri)

        email = user_info.get("email")
        name = user_info.get("name", email.split("@")[0])

        print(f"\n{'='*50}")
        print(f"[GOOGLE] User info: {name} ({email})")
        print(f"{'='*50}\n")

        result = await find_or_create_social_user(email=email, name=name, provider="google")

        # Redirect to frontend with token in URL
        token = result["access_token"]
        return RedirectResponse(f"{FRONTEND_URL}/social-auth-callback?token={token}")

    except Exception as e:
        print(f"[GOOGLE] Error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/social-auth-callback?error=google_auth_failed")


@router.get("/microsoft")
async def microsoft_login():
    """Redirect user to Microsoft consent screen."""
    params = urlencode({
        "client_id": MICROSOFT_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/api/auth/microsoft/callback",
        "response_type": "code",
        "scope": "openid email profile User.Read",
        "response_mode": "query",
    })
    return RedirectResponse(
        f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?{params}"
    )


@router.get("/microsoft/callback")
async def microsoft_callback(code: str):
    """Microsoft redirects here with auth code."""
    try:
        redirect_uri = f"{BACKEND_URL}/api/auth/microsoft/callback"
        user_info = await get_microsoft_user_info(code, redirect_uri)

        email = user_info.get("mail") or user_info.get("userPrincipalName")
        name = user_info.get("displayName", email.split("@")[0])

        print(f"\n{'='*50}")
        print(f"[MICROSOFT] User info: {name} ({email})")
        print(f"{'='*50}\n")

        result = await find_or_create_social_user(email=email, name=name, provider="microsoft")

        token = result["access_token"]
        return RedirectResponse(f"{FRONTEND_URL}/social-auth-callback?token={token}")

    except Exception as e:
        print(f"[MICROSOFT] Error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/social-auth-callback?error=microsoft_auth_failed")
