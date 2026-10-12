from typing import TypeVar

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ...database import Base

ModelT = TypeVar("ModelT", bound=Base)


def get_or_404(db: Session, model: type[ModelT], item_id: int, label: str) -> ModelT:
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} not found.")
    return item


def check_reorder_ids(requested: list[int], existing: set[int]) -> None:
    if len(requested) != len(existing) or set(requested) != existing:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Send every id exactly once, in the new order.")
