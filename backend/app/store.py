"""Reading and writing the key/value tables: site settings and page content."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .content_schema import DEFAULTS as CONTENT_DEFAULTS
from .models import PageContent, SiteSetting
from .schemas import SiteSettingsIn, SiteSettingsOut

# Starting values come from the Klenz visiting card; change them in Admin -> Settings.
SETTING_DEFAULTS: dict[str, str] = {
    "whatsapp_number": "+91 90873 12905",
    "phone": "+91 90873 12905, +91 73973 83403",
    "email": "klenztissue@gmail.com",
    "address": "Pollachi - 642001",
    "hours": "",
    "country_code": "91",
}


def read_settings(db: Session) -> SiteSettingsOut:
    rows = db.scalars(select(SiteSetting).where(SiteSetting.key.in_(SETTING_DEFAULTS)))
    values = SETTING_DEFAULTS | {row.key: row.value for row in rows}
    return SiteSettingsOut(
        whatsapp_number=values["whatsapp_number"],
        phone=values["phone"],
        email=values["email"],
        address=values["address"],
        hours=values["hours"],
        country_code=values["country_code"],
    )


def write_settings(db: Session, data: SiteSettingsIn) -> SiteSettingsOut:
    for key, value in data.model_dump().items():
        db.merge(SiteSetting(key=key, value=str(value)))
    db.commit()
    return read_settings(db)


def read_content(db: Session) -> dict[str, str]:
    """All page text; keys missing from the database fall back to the defaults."""
    stored = {row.key: row.value for row in db.scalars(select(PageContent))}
    return {key: stored.get(key, default) for key, default in CONTENT_DEFAULTS.items()}


def write_content(db: Session, values: dict[str, str]) -> None:
    for key, value in values.items():
        db.merge(PageContent(key=key, value=value))
    db.commit()
