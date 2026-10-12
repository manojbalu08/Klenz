"""Endpoints the public website uses."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Order, OrderItem, Product, Video
from ..ratelimit import RateLimiter, client_ip
from ..schemas import OrderCreatedOut, OrderIn, ProductOut, SiteOut, VideoOut
from ..store import read_content, read_settings

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/site", response_model=SiteOut)
def get_site(db: Session = Depends(get_db)) -> SiteOut:
    products = db.scalars(
        select(Product).where(Product.is_live.is_(True)).order_by(Product.sort_order, Product.id)
    )
    videos = db.scalars(select(Video).order_by(Video.sort_order, Video.id))
    return SiteOut(
        settings=read_settings(db),
        content=read_content(db),
        products=[ProductOut.model_validate(p) for p in products],
        videos=[VideoOut.model_validate(v) for v in videos],
    )


@router.post("/orders", response_model=OrderCreatedOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderIn, request: Request, db: Session = Depends(get_db)) -> Order:
    limiter: RateLimiter = request.app.state.order_limiter
    ip = client_ip(request)
    if limiter.is_blocked(ip):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many orders from this device. Please try again later.")

    quantities: dict[int, int] = {}
    for line in payload.items:
        quantities[line.product_id] = min(quantities.get(line.product_id, 0) + line.quantity, 99)

    products = {
        p.id: p
        for p in db.scalars(select(Product).where(Product.id.in_(quantities), Product.is_live.is_(True)))
    }
    unavailable = [product_id for product_id in quantities if product_id not in products]
    if unavailable:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"message": "Some items in your cart are no longer available.", "unavailable": unavailable},
        )

    order = Order(customer_name=payload.customer_name, phone=payload.phone, address=payload.address, note=payload.note)
    for product_id, quantity in quantities.items():
        product = products[product_id]
        order.items.append(
            OrderItem(product_id=product.id, product_name=product.name, product_spec=product.spec, quantity=quantity)
        )
    db.add(order)
    db.commit()
    db.refresh(order)
    limiter.hit(ip)
    return order
