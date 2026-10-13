from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ... import notify
from ...database import get_db
from ...models import AdminUser
from ...schemas import (
    AlertTestOut,
    OrderAlertsIn,
    OrderAlertsOut,
    PasswordChangeIn,
    SiteSettingsIn,
    SiteSettingsOut,
    TokenOut,
)
from ...security import get_current_admin, hash_password, issue_token, verify_password
from ...store import read_alert_target, read_alerts, read_settings, write_alerts, write_settings

router = APIRouter()


@router.get("/settings", response_model=SiteSettingsOut)
def get_settings(db: Session = Depends(get_db)) -> SiteSettingsOut:
    return read_settings(db)


@router.put("/settings", response_model=SiteSettingsOut)
def update_settings(payload: SiteSettingsIn, db: Session = Depends(get_db)) -> SiteSettingsOut:
    return write_settings(db, payload)


@router.get("/settings/alerts", response_model=OrderAlertsOut)
def get_order_alerts(db: Session = Depends(get_db)) -> OrderAlertsOut:
    return read_alerts(db)


@router.put("/settings/alerts", response_model=OrderAlertsOut)
def update_order_alerts(payload: OrderAlertsIn, db: Session = Depends(get_db)) -> OrderAlertsOut:
    return write_alerts(db, payload)


@router.post("/settings/alerts/test", response_model=AlertTestOut)
def send_test_alert(db: Session = Depends(get_db)) -> AlertTestOut:
    phone, apikey = read_alert_target(db)
    if not apikey:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Save the CallMeBot API key first.")
    sent, answer = notify.send_whatsapp(phone, apikey, "Klenz website: test message. New orders will arrive here.")
    return AlertTestOut(ok=sent, detail=answer)


@router.post("/account/password", response_model=TokenOut)
def change_password(
    payload: PasswordChangeIn,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> TokenOut:
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password is not correct.")
    admin.password_hash = hash_password(payload.new_password)
    admin.token_version += 1  # signs out every other session
    db.commit()
    db.refresh(admin)
    # Keep this browser signed in with a fresh token.
    return issue_token(admin, request, bool(request.state.token_payload.get("rem")))
