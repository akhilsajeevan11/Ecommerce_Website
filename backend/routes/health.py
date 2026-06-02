"""
Health check endpoint — GET /api/health

Returns the live status of every critical subsystem:
  - database    (PostgreSQL round-trip SELECT 1)
  - smtp        (Gmail STARTTLS login without sending a mail)
  - jwt         (encode + decode round-trip using the configured secret)
  - env         (presence of all required environment variables)

HTTP 200 is returned when every check passes.
HTTP 207 (Multi-Status) is returned when one or more checks fail so the
frontend/monitoring can differentiate "API is up but X is broken" from a
true 5xx caused by an uncaught exception.

Usage:
    curl http://localhost:8000/api/health
    curl https://api.aksou.in/api/health
"""

import smtplib
import os
import time
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from config import PgSession, pg_engine, JWT_SECRET, EMAIL_USER, EMAIL_PASS

router = APIRouter(prefix="/api", tags=["health"])

# ─── Required env-var names ───────────────────────────────────────────────────
_REQUIRED_ENV = [
    "JWT_SECRET",
    "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD",
    "EMAIL_USER", "EMAIL_PASS",
    "FRONTEND_URL", "BACKEND_URL",
]

_OPTIONAL_ENV = [
    "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET",
]


# ─── Individual check helpers ─────────────────────────────────────────────────

async def _check_database() -> dict:
    """Attempt a SELECT 1 against the configured PostgreSQL instance."""
    t0 = time.monotonic()
    try:
        async with pg_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        return {"status": "ok", "latency_ms": latency_ms}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def _check_smtp() -> dict:
    """Login to Gmail SMTP (without sending) to verify credentials."""
    t0 = time.monotonic()
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_USER, EMAIL_PASS)
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        return {"status": "ok", "user": EMAIL_USER, "latency_ms": latency_ms}
    except smtplib.SMTPAuthenticationError as exc:
        return {
            "status": "error",
            "detail": "SMTP authentication failed — check EMAIL_USER/EMAIL_PASS",
            "raw": str(exc),
        }
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def _check_jwt() -> dict:
    """Encode and decode a test token to verify the JWT_SECRET."""
    try:
        payload = {"user_id": "health-check", "test": True}
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if decoded.get("user_id") != "health-check":
            return {"status": "error", "detail": "JWT round-trip mismatch"}
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def _check_env() -> dict:
    """Verify all required environment variables are set and non-empty."""
    missing = [k for k in _REQUIRED_ENV if not os.getenv(k)]
    optional_missing = [k for k in _OPTIONAL_ENV if not os.getenv(k)]
    result: dict = {"status": "ok" if not missing else "error"}
    if missing:
        result["missing_required"] = missing
    if optional_missing:
        result["missing_optional"] = optional_missing
    return result


# ─── Health endpoint ──────────────────────────────────────────────────────────

@router.get("/health", summary="System health check")
async def health_check():
    """
    Run all subsystem checks and return a summary.

    Response shape:
    ```json
    {
      "status": "ok" | "degraded",
      "timestamp": "2026-06-02T10:00:00Z",
      "checks": {
        "database": { "status": "ok", "latency_ms": 12.4 },
        "smtp":     { "status": "ok", "user": "x@gmail.com", "latency_ms": 340.1 },
        "jwt":      { "status": "ok" },
        "env":      { "status": "ok" }
      }
    }
    ```
    Returns HTTP 200 when all checks pass, HTTP 207 when any check fails.
    """
    checks = {
        "database": await _check_database(),
        "smtp": _check_smtp(),
        "jwt": _check_jwt(),
        "env": _check_env(),
    }

    all_ok = all(c["status"] == "ok" for c in checks.values())

    body = {
        "status": "ok" if all_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }

    http_status = 200 if all_ok else 207
    return JSONResponse(content=body, status_code=http_status)
