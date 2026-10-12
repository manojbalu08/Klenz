"""Starter data from the design, added once on first start."""

import logging
import secrets
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import AppConfig
from .content_schema import DEFAULTS as CONTENT_DEFAULTS
from .database import utcnow
from .models import AdminUser, Order, OrderItem, PageContent, Product, SiteSetting, Video
from .security import hash_password
from .store import SETTING_DEFAULTS

log = logging.getLogger("uvicorn.error")

SEED_MARKER = "_seeded_at"

# The Klenz catalogue (Images/products.jpeg): name, category, pack size, description, drawing, tint, photo
PRODUCTS = (
    ("Ultra Soft Tissue", "Tissue Napkins", "80 grams", "Our softest tissue napkins, gentle on skin.",
     "napkin", "soft", "/images/products/ultra-soft-tissue.jpg"),
    ("Soft Tissue", "Tissue Napkins", "80 grams", "Soft, absorbent napkins for homes, cafés and restaurants.",
     "napkin", "soft2", "/images/products/soft-tissue.jpg"),
    ("Semi Soft Tissue", "Tissue Napkins", "80 grams", "Softness with extra strength for everyday tables.",
     "napkin", "soft", "/images/products/semi-soft-tissue.jpg"),
    ("Hard Tissue", "Tissue Napkins", "80 grams", "Firm, strong sheets for heavy-duty wiping.",
     "napkin", "soft2", "/images/products/hard-tissue.jpg"),
    ("Premium Facial Tissue Box", "Facial Tissue", "2 Ply (Premium Quality)",
     "Soft 2-ply facial tissues in a premium box for home, office and travel.",
     "box", "soft", "/images/products/facial-tissue-box.jpg"),
    ("Toilet Roll", "Rolls", "100 pulls", "Soft, strong rolls for homes, offices and hotels.",
     "roll", "soft2", "/images/products/toilet-roll.jpg"),
    ("Kitchen Roll", "Rolls", "100 pulls", "Absorbent sheets for kitchen spills, cooking and cleaning.",
     "towel", "soft", "/images/products/kitchen-roll.jpg"),
    ("HRT Roll", "Rolls", "1 kg, 40 GSM", "Large hand-towel rolls for washroom dispensers.",
     "roll", "soft2", "/images/products/hrt-roll.jpg"),
    ("M-Fold Tissue", "Fold Tissue", "120 pulls", "Multi-fold hand towels for washroom dispensers.",
     "napkin", "soft", "/images/products/m-fold-tissue.jpg"),
    ("L-Fold Tissue", "Fold Tissue", "100 pulls", "Single-fold hand towels for quick, clean hand drying.",
     "napkin", "soft2", "/images/products/l-fold-tissue.jpg"),
)

# Videos made from the client's photos (frontend/public/videos, poster = same name .jpg).
VIDEOS = (
    ("Klenz Facial Tissue", "/videos/facial-tissue.mp4"),
    ("Tissue Napkins range", "/videos/tissue-napkins.mp4"),
    ("Rolls & Fold Tissue", "/videos/rolls-and-folds.mp4"),
)

# customer, phone, note, status, hours ago, [(product index, quantity)]
SAMPLE_ORDERS = (
    ("Sample Hotel Group", "+91 90000 00001", "Washroom supplies — bulk quote request", "new", 3, ((7, 20), (5, 120))),
    ("Sample Supermarket", "+91 90000 00002", "Retail supply for our stores", "new", 26, ((4, 48), (6, 36))),
    ("Sample Café", "+91 90000 00003", "Table napkins — monthly order", "quoted", 50, ((1, 60), (4, 12))),
)


def seed_database(session: Session, config: AppConfig) -> None:
    ensure_admin(session, config)
    if session.get(SiteSetting, SEED_MARKER) is not None:
        return

    products: list[Product] = []
    if not session.scalar(select(func.count()).select_from(Product)):
        products = [
            Product(name=name, category=category, spec=spec, description=description, art=art, tint=tint,
                    image_url=photo, sort_order=index)
            for index, (name, category, spec, description, art, tint, photo) in enumerate(PRODUCTS)
        ]
        session.add_all(products)

    if not session.scalar(select(func.count()).select_from(Video)):
        session.add_all(Video(title=title, url=url, sort_order=index) for index, (title, url) in enumerate(VIDEOS))

    existing_content = set(session.scalars(select(PageContent.key)))
    session.add_all(PageContent(key=k, value=v) for k, v in CONTENT_DEFAULTS.items() if k not in existing_content)

    existing_settings = set(session.scalars(select(SiteSetting.key)))
    session.add_all(SiteSetting(key=k, value=v) for k, v in SETTING_DEFAULTS.items() if k not in existing_settings)

    session.flush()  # gives the new products their ids
    if config.seed_sample_data and products and not session.scalar(select(func.count()).select_from(Order)):
        now = utcnow()
        for name, phone, note, status, hours_ago, lines in SAMPLE_ORDERS:
            created = now - timedelta(hours=hours_ago)
            order = Order(customer_name=name, phone=phone, address="", note=note, status=status,
                          created_at=created, updated_at=created)
            for index, quantity in lines:
                product = products[index]
                order.items.append(OrderItem(product_id=product.id, product_name=product.name,
                                             product_spec=product.spec, quantity=quantity))
            session.add(order)

    session.add(SiteSetting(key=SEED_MARKER, value=utcnow().isoformat()))
    session.commit()
    log.info("Added the Klenz catalogue, videos and page text.")


def ensure_admin(session: Session, config: AppConfig) -> None:
    if session.scalar(select(func.count()).select_from(AdminUser)):
        return
    password = config.admin_password or secrets.token_urlsafe(9)
    email = config.admin_email.strip().lower()
    session.add(AdminUser(email=email, name=config.admin_name, password_hash=hash_password(password)))
    session.commit()
    if not config.admin_password:
        log.warning(
            "\n%s\n  Created the first admin account\n    email:    %s\n    password: %s\n"
            "  Sign in at /admin/login and change it in Settings.\n%s",
            "=" * 60, email, password, "=" * 60,
        )
