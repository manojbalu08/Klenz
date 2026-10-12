from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import AdminUser
from ...schemas import PasswordChangeIn, SiteSettingsIn, SiteSettingsOut, TokenOut
from ...security import get_current_admin, hash_password, issue_token, verify_password
from ...store import read_settings, write_settings

router = APIRouter()


@router.get("/settings", response_model=SiteSettingsOut)
def get_settings(db: Session = Depends(get_db)) -> SiteSettingsOut:
    return read_settings(db)


@router.put("/settings", response_model=SiteSettingsOut)
def update_settings(payload: SiteSettingsIn, db: Session = Depends(get_db)) -> SiteSettingsOut:
    return write_settings(db, payload)


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
