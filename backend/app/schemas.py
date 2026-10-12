"""Request and response models for the API.

Input models validate and trim what browsers send; output models only describe
shapes, so old rows never fail to serialise.
"""

import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

ArtStyle = Literal["box", "pocket", "roll", "towel", "napkin"]
Tint = Literal["soft", "soft2"]
OrderStatus = Literal["new", "quoted", "closed"]
ORDER_STATUSES: tuple[OrderStatus, ...] = ("new", "quoted", "closed")


def _trimmed(max_length: int, min_length: int = 0) -> StringConstraints:
    return StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)


def is_link(value: str) -> bool:
    """A full http(s) link, or a path on this website such as /images/products/box.jpg."""
    return bool(re.fullmatch(r"https?://\S+|/(?!/)\S*", value, re.IGNORECASE))


def _link_or_empty(value: str) -> str:
    if value and not is_link(value):
        raise ValueError("must be a link starting with https:// (or a path like /images/photo.jpg)")
    return value


def _phone(value: str) -> str:
    digits = sum(ch.isdigit() for ch in value)
    if not re.fullmatch(r"[0-9+()\-.\s]+", value) or not 6 <= digits <= 15:
        raise ValueError("enter a valid phone number")
    return value


def _optional_phone(value: str) -> str:
    return _phone(value) if value else value


def _optional_email(value: str) -> str:
    if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise ValueError("enter a valid email address")
    return value


LinkOrEmpty = Annotated[str, _trimmed(500), AfterValidator(_link_or_empty)]
PhoneNumber = Annotated[str, _trimmed(30, 1), AfterValidator(_phone)]


# ── Catalogue ──────────────────────────────────────────────────────────────


class ProductIn(BaseModel):
    name: Annotated[str, _trimmed(120, 1)]
    category: Annotated[str, _trimmed(60, 1)]
    description: Annotated[str, _trimmed(500)] = ""
    spec: Annotated[str, _trimmed(120)] = ""
    art: ArtStyle = "box"
    tint: Tint = "soft"
    image_url: LinkOrEmpty = ""
    is_live: bool = True


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    description: str
    spec: str
    art: str
    tint: str
    image_url: str


class ProductAdminOut(ProductOut):
    is_live: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


class VideoIn(BaseModel):
    title: Annotated[str, _trimmed(120, 1)]
    url: LinkOrEmpty = ""


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    url: str


class ReorderIn(BaseModel):
    ids: Annotated[list[int], Field(min_length=1, max_length=1000)]


# ── Site settings and content ──────────────────────────────────────────────


class SiteSettingsOut(BaseModel):
    whatsapp_number: str
    phone: str
    email: str
    address: str
    hours: str
    country_code: str


class SiteSettingsIn(BaseModel):
    whatsapp_number: Annotated[str, _trimmed(30), AfterValidator(_optional_phone)] = ""
    phone: Annotated[str, _trimmed(60)] = ""
    email: Annotated[str, _trimmed(191), AfterValidator(_optional_email)] = ""
    address: Annotated[str, _trimmed(300)] = ""
    hours: Annotated[str, _trimmed(120)] = ""
    country_code: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{1,4}$")] = "91"


class ContentFieldOut(BaseModel):
    key: str
    label: str
    kind: str
    help: str
    default: str
    value: str


class ContentPageOut(BaseModel):
    id: str
    label: str
    fields: list[ContentFieldOut]


class ContentUpdateIn(BaseModel):
    values: dict[Annotated[str, StringConstraints(max_length=100)], Annotated[str, StringConstraints(max_length=5000)]]


class SiteOut(BaseModel):
    """Everything the public website needs, in one request."""

    settings: SiteSettingsOut
    content: dict[str, str]
    products: list[ProductOut]
    videos: list[VideoOut]


# ── Orders ─────────────────────────────────────────────────────────────────


class OrderItemIn(BaseModel):
    product_id: int
    quantity: Annotated[int, Field(ge=1, le=99)]


class OrderIn(BaseModel):
    items: Annotated[list[OrderItemIn], Field(min_length=1, max_length=50)]
    customer_name: Annotated[str, _trimmed(120, 1)]
    phone: PhoneNumber
    address: Annotated[str, _trimmed(500)] = ""
    note: Annotated[str, _trimmed(1000)] = ""


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int | None
    product_name: str
    product_spec: str
    quantity: int


class OrderCreatedOut(BaseModel):
    """What the shopper gets back: the order reference and the confirmed items."""

    model_config = ConfigDict(from_attributes=True)

    reference: str
    created_at: datetime
    items: list[OrderItemOut]
    item_count: int


class OrderOut(OrderCreatedOut):
    id: int
    customer_name: str
    phone: str
    address: str
    note: str
    status: str
    summary: str
    updated_at: datetime


class OrderListOut(BaseModel):
    items: list[OrderOut]
    total: int
    # Number of orders per status, plus "all".
    counts: dict[str, int]


class OrderStatusIn(BaseModel):
    status: OrderStatus


class DashboardStats(BaseModel):
    products_listed: int
    new_enquiries: int
    quotes_sent: int
    pages_published: int


class DashboardOut(BaseModel):
    stats: DashboardStats
    latest_orders: list[OrderOut]


# ── Auth ───────────────────────────────────────────────────────────────────


class LoginIn(BaseModel):
    email: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=191)]
    password: Annotated[str, StringConstraints(max_length=200)]
    remember: bool = False


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: AdminOut


class PasswordChangeIn(BaseModel):
    current_password: Annotated[str, StringConstraints(max_length=200)]
    new_password: Annotated[str, StringConstraints(min_length=8, max_length=200)]
