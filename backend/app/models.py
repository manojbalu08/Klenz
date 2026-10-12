"""Database tables.

String columns that are indexed stay at 191 characters or less so the indexes fit
MySQL's 767-byte key limit with utf8mb4 on older servers.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base, UTCDateTime, utcnow

ORDER_REFERENCE_OFFSET = 10000


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(191), unique=True)
    name: Mapped[str] = mapped_column(String(120), default="Admin")
    password_hash: Mapped[str] = mapped_column(String(255))
    # Bumped on password change so tokens issued before it stop working.
    token_version: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(500), default="")
    # Pack size shown instead of a price, e.g. "80 grams" or "100 pulls".
    spec: Mapped[str] = mapped_column(String(120), default="")
    # Which drawing the product card shows: box, pocket, roll, towel or napkin.
    art: Mapped[str] = mapped_column(String(20), default="box")
    # Card background: "soft" or "soft2" from the active colour theme.
    tint: Mapped[str] = mapped_column(String(20), default="soft")
    # Optional photo that replaces the drawing.
    image_url: Mapped[str] = mapped_column(String(500), default="")
    is_live: Mapped[bool] = mapped_column(default=True)
    sort_order: Mapped[int] = mapped_column(default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)


class Order(Base):
    """An order request from the Contact page (shown as an enquiry in the admin).

    There are no prices on the website: Klenz replies with a quote on WhatsApp.
    """

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30))
    address: Mapped[str] = mapped_column(Text, default="")
    note: Mapped[str] = mapped_column(Text, default="")
    # new -> quoted -> closed
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id"
    )

    @property
    def reference(self) -> str:
        return f"KZ-{ORDER_REFERENCE_OFFSET + self.id}"

    @property
    def item_count(self) -> int:
        return sum(item.quantity for item in self.items)

    @property
    def summary(self) -> str:
        return ", ".join(f"{item.product_name} × {item.quantity}" for item in self.items)


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), index=True
    )
    # Copied from the product so old orders keep their name and pack size.
    product_name: Mapped[str] = mapped_column(String(120))
    product_spec: Mapped[str] = mapped_column(String(120), default="")
    quantity: Mapped[int]

    order: Mapped[Order] = relationship(back_populates="items")


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    # YouTube / Vimeo link or a direct .mp4 link. Empty shows a placeholder.
    url: Mapped[str] = mapped_column(String(500), default="")
    sort_order: Mapped[int] = mapped_column(default=0, index=True)


class PageContent(Base):
    """Editable website text, keyed like "home.headline" (see content_schema.py)."""

    __tablename__ = "page_content"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class SiteSetting(Base):
    """Business details and appearance options (see store.py for the keys)."""

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
