from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...content_schema import FIELDS, PAGES
from ...database import get_db
from ...schemas import ContentFieldOut, ContentPageOut, ContentUpdateIn, is_link
from ...store import read_content, write_content

router = APIRouter()


def _content_pages(db: Session) -> list[ContentPageOut]:
    values = read_content(db)
    return [
        ContentPageOut(
            id=page.id,
            label=page.label,
            fields=[
                ContentFieldOut(
                    key=f.key, label=f.label, kind=f.kind, help=f.help, default=f.default, value=values[f.key]
                )
                for f in page.fields
            ],
        )
        for page in PAGES
    ]


@router.get("/content", response_model=list[ContentPageOut])
def get_content(db: Session = Depends(get_db)) -> list[ContentPageOut]:
    return _content_pages(db)


@router.put("/content", response_model=list[ContentPageOut])
def update_content(payload: ContentUpdateIn, db: Session = Depends(get_db)) -> list[ContentPageOut]:
    unknown = sorted(set(payload.values) - set(FIELDS))
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown content fields: {', '.join(unknown)}")
    values = {key: value.strip() for key, value in payload.values.items()}
    for key, value in values.items():
        if FIELDS[key].kind == "url" and value and not is_link(value):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, f"{FIELDS[key].label} must be a link starting with https://"
            )
    write_content(db, values)
    return _content_pages(db)
