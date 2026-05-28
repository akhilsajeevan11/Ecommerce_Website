"""SQLAlchemy ORM models for the NOIR e-commerce schema (PostgreSQL)."""

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Boolean,
    DateTime,
    Numeric,
    ForeignKey,
    Enum,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
import uuid

from models.user_table import Base


# ── Enums ─────────────────────────────────────────────────
class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class MediaType(str, enum.Enum):
    image = "image"
    video = "video"
    three_sixty = "360"


# ── Categories ────────────────────────────────────────────
class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    products = relationship("Product", back_populates="category_rel")


# ── Products ──────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    barcode_id = Column(String(100), nullable=True)
    story = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    rating = Column(Numeric(3, 2), nullable=False, default=0.0)
    review_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    is_featured = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    category_rel = relationship("Category", back_populates="products")
    media = relationship("Media", back_populates="product", cascade="all, delete-orphan")
    sizes = relationship("ProductSize", back_populates="product", cascade="all, delete-orphan")
    colors = relationship("ProductColor", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")


# ── Media ─────────────────────────────────────────────────
class Media(Base):
    __tablename__ = "media"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    media_type = Column(String(20), nullable=False, default="image")
    sort_order = Column(Integer, nullable=False, default=0)
    is_primary = Column(Boolean, nullable=False, default=False)
    original_filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    uploaded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    product = relationship("Product", back_populates="media")


# ── Product Sizes ─────────────────────────────────────────
class ProductSize(Base):
    __tablename__ = "product_sizes"
    __table_args__ = (UniqueConstraint("product_id", "size_label"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    size_label = Column(String(20), nullable=False)

    product = relationship("Product", back_populates="sizes")


# ── Product Colors ────────────────────────────────────────
class ProductColor(Base):
    __tablename__ = "product_colors"
    __table_args__ = (UniqueConstraint("product_id", "color_name"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    color_name = Column(String(50), nullable=False)
    color_hex = Column(String(7), nullable=True)

    product = relationship("Product", back_populates="colors")


# ── Reviews ───────────────────────────────────────────────
class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("product_id", "user_id"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    product = relationship("Product", back_populates="reviews")


# ── Orders ────────────────────────────────────────────────
class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    shipping_name = Column(String(255), nullable=True)
    shipping_address = Column(Text, nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_state = Column(String(100), nullable=True)
    shipping_postal_code = Column(String(20), nullable=True)
    shipping_phone = Column(String(20), nullable=True)
    razorpay_order_id = Column(String(255), nullable=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


# ── Order Items ───────────────────────────────────────────
class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False)
    size = Column(String(20), nullable=True)
    color = Column(String(50), nullable=True)
    price_at_purchase = Column(Numeric(10, 2), nullable=False)
    product_name = Column(String(255), nullable=False)

    order = relationship("Order", back_populates="items")


# ── Cart Items ────────────────────────────────────────────
class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", "size", "color"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    size = Column(String(20), nullable=True)
    color = Column(String(50), nullable=True)
    added_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Wishlist ──────────────────────────────────────────────
class Wishlist(Base):
    __tablename__ = "wishlist"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Site Settings ─────────────────────────────────────────
class SiteSettings(Base):
    __tablename__ = "site_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
