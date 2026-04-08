import os
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv

load_dotenv()

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required")

# ── MongoDB (existing — products, orders, etc.) ──────────
MONGO_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")
if not MONGO_URL:
    raise RuntimeError("MONGODB_URL environment variable is required")
if not DATABASE_NAME:
    raise RuntimeError("DATABASE_NAME environment variable is required")

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DATABASE_NAME]

# ── PostgreSQL (new — users/auth) ─────────────────────────
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

if not all([DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD]):
    raise RuntimeError(
        "PostgreSQL env vars required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    )

PG_DATABASE_URL = (
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

pg_engine = create_async_engine(PG_DATABASE_URL, echo=False)
PgSession = async_sessionmaker(pg_engine, expire_on_commit=False)

# ── Razorpay ──────────────────────────────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

# ── SMTP (email OTP) ─────────────────────────────────────
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
if not EMAIL_USER or not EMAIL_PASS:
    raise RuntimeError("EMAIL_USER and EMAIL_PASS environment variables are required")

# ── Social Login (OAuth2) ─────────────────────────────────
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
