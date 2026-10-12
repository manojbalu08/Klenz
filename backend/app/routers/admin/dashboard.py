from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ...content_schema import PUBLISHED_PAGE_COUNT
from ...database import get_db
from ...models import Order, Product
from ...schemas import DashboardOut, DashboardStats, OrderOut

router = APIRouter()


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)) -> DashboardOut:
    live_products = db.scalar(select(func.count()).select_from(Product).where(Product.is_live.is_(True))) or 0
    per_status = {status: count for status, count in db.execute(select(Order.status, func.count()).group_by(Order.status))}
    latest = db.scalars(
        select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc(), Order.id.desc()).limit(5)
    )
    return DashboardOut(
        stats=DashboardStats(
            products_listed=live_products,
            new_enquiries=per_status.get("new", 0),
            quotes_sent=per_status.get("quoted", 0),
            pages_published=PUBLISHED_PAGE_COUNT,
        ),
        latest_orders=[OrderOut.model_validate(order) for order in latest],
    )
