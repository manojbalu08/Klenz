import re

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from ...database import get_db
from ...models import ORDER_REFERENCE_OFFSET, Order
from ...schemas import ORDER_STATUSES, OrderListOut, OrderOut, OrderStatus, OrderUpdateIn
from .common import get_or_404

router = APIRouter()


def _search(query: Select[tuple[Order]], text: str) -> Select[tuple[Order]]:
    conditions = [Order.customer_name.icontains(text, autoescape=True), Order.phone.icontains(text, autoescape=True)]
    reference = re.fullmatch(r"#?(?:KZ-?)?(\d{5,9})", text, re.IGNORECASE)
    if reference:
        conditions.append(Order.id == int(reference.group(1)) - ORDER_REFERENCE_OFFSET)
    return query.where(or_(*conditions))


@router.get("/orders", response_model=OrderListOut)
def list_orders(
    db: Session = Depends(get_db),
    status_filter: OrderStatus | None = Query(None, alias="status"),
    q: str = Query("", max_length=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> OrderListOut:
    query = select(Order)
    if status_filter:
        query = query.where(Order.status == status_filter)
    if q.strip():
        query = _search(query, q.strip())
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    orders = db.scalars(
        query.options(selectinload(Order.items))
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(limit)
        .offset(offset)
    )
    per_status = {s: n for s, n in db.execute(select(Order.status, func.count()).group_by(Order.status))}
    counts = {s: per_status.get(s, 0) for s in ORDER_STATUSES}
    counts["all"] = sum(per_status.values())
    return OrderListOut(items=[OrderOut.model_validate(o) for o in orders], total=total, counts=counts)


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)) -> Order:
    return get_or_404(db, Order, order_id, "Order")


@router.patch("/orders/{order_id}", response_model=OrderOut)
def update_order(order_id: int, payload: OrderUpdateIn, db: Session = Depends(get_db)) -> Order:
    order = get_or_404(db, Order, order_id, "Order")
    if payload.status is not None:
        order.status = payload.status
    if payload.payment_status is not None:
        order.payment_status = payload.payment_status
    db.commit()
    db.refresh(order)
    return order


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> Response:
    db.delete(get_or_404(db, Order, order_id, "Order"))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
