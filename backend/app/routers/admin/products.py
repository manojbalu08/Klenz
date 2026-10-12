from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import OrderItem, Product
from ...schemas import ProductAdminOut, ProductIn, ReorderIn
from .common import check_reorder_ids, get_or_404

router = APIRouter()


def _all_products(db: Session) -> list[Product]:
    return list(db.scalars(select(Product).order_by(Product.sort_order, Product.id)))


@router.get("/products", response_model=list[ProductAdminOut])
def list_products(db: Session = Depends(get_db)) -> list[Product]:
    return _all_products(db)


@router.post("/products", response_model=ProductAdminOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductIn, db: Session = Depends(get_db)) -> Product:
    last = db.scalar(select(func.max(Product.sort_order)))
    product = Product(**payload.model_dump(), sort_order=(last if last is not None else -1) + 1)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductAdminOut)
def update_product(product_id: int, payload: ProductIn, db: Session = Depends(get_db)) -> Product:
    product = get_or_404(db, Product, product_id, "Product")
    for field, value in payload.model_dump().items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)) -> Response:
    product = get_or_404(db, Product, product_id, "Product")
    # Past orders keep their copied name and price; only the link is cleared.
    db.execute(update(OrderItem).where(OrderItem.product_id == product_id).values(product_id=None))
    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/products/reorder", response_model=list[ProductAdminOut])
def reorder_products(payload: ReorderIn, db: Session = Depends(get_db)) -> list[Product]:
    products = {product.id: product for product in _all_products(db)}
    check_reorder_ids(payload.ids, set(products))
    for position, product_id in enumerate(payload.ids):
        products[product_id].sort_order = position
    db.commit()
    return _all_products(db)
