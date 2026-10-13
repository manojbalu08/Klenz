"""Reading and writing the key/value tables: site settings and page content."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .content_schema import DEFAULTS as CONTENT_DEFAULTS
from .models import PageContent, SiteSetting
from .schemas import OrderAlertsIn, OrderAlertsOut, SiteSettingsIn, SiteSettingsOut

# Starting values come from the Klenz visiting card; change them in Admin -> Settings.
# An empty upi_id shows a sample payment QR until the real UPI ID is entered.
SETTING_DEFAULTS: dict[str, str] = {
    "whatsapp_number": "+91 90873 12905",
    "phone": "+91 90873 12905, +91 73973 83403",
    "email": "klenztissue@gmail.com",
    "address": "Pollachi - 642001",
    "hours": "",
    "country_code": "91",
    "upi_id": "",
    "upi_name": "Klenz",
}

# Admin-only settings: never part of SiteSettingsOut, which the public website receives.
ALERT_PHONE = "alert_phone"
ALERT_APIKEY = "alert_apikey"


def _stored(db: Session, keys: list[str]) -> dict[str, str]:
    return {row.key: row.value for row in db.scalars(select(SiteSetting).where(SiteSetting.key.in_(keys)))}


def read_settings(db: Session) -> SiteSettingsOut:
    values = SETTING_DEFAULTS | _stored(db, list(SETTING_DEFAULTS))
    return SiteSettingsOut.model_validate({key: values[key] for key in SiteSettingsOut.model_fields})


def write_settings(db: Session, data: SiteSettingsIn) -> SiteSettingsOut:
    for key, value in data.model_dump().items():
        db.merge(SiteSetting(key=key, value=str(value)))
    db.commit()
    return read_settings(db)


def read_alert_target(db: Session) -> tuple[str, str]:
    """(phone, apikey) for order alerts; the phone falls back to the WhatsApp number."""
    values = _stored(db, [ALERT_PHONE, ALERT_APIKEY, "whatsapp_number"])
    phone = values.get(ALERT_PHONE) or values.get("whatsapp_number") or SETTING_DEFAULTS["whatsapp_number"]
    return phone, values.get(ALERT_APIKEY, "")


def read_alerts(db: Session) -> OrderAlertsOut:
    values = _stored(db, [ALERT_PHONE, ALERT_APIKEY])
    return OrderAlertsOut(phone=values.get(ALERT_PHONE, ""), apikey_set=bool(values.get(ALERT_APIKEY)))


def write_alerts(db: Session, data: OrderAlertsIn) -> OrderAlertsOut:
    db.merge(SiteSetting(key=ALERT_PHONE, value=data.phone))
    if data.apikey is not None:
        db.merge(SiteSetting(key=ALERT_APIKEY, value=data.apikey))
    db.commit()
    return read_alerts(db)


def read_content(db: Session) -> dict[str, str]:
    """All page text; keys missing from the database fall back to the defaults."""
    stored = {row.key: row.value for row in db.scalars(select(PageContent))}
    return {key: stored.get(key, default) for key, default in CONTENT_DEFAULTS.items()}


def write_content(db: Session, values: dict[str, str]) -> None:
    for key, value in values.items():
        db.merge(PageContent(key=key, value=value))
    db.commit()
