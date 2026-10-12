"""Admin sign-in."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AdminUser
from ..ratelimit import RateLimiter, client_ip
from ..schemas import AdminOut, LoginIn, TokenOut
from ..security import dummy_password_hash, get_current_admin, issue_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    limiter: RateLimiter = request.app.state.login_limiter
    ip = client_ip(request)
    if limiter.is_blocked(ip):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many sign-in attempts. Please wait a few minutes and try again."
        )

    user = db.scalar(select(AdminUser).where(AdminUser.email == payload.email))
    valid = verify_password(payload.password, user.password_hash if user else dummy_password_hash())
    if user is None or not valid:
        limiter.hit(ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password.")

    limiter.reset(ip)
    return issue_token(user, request, payload.remember)


@router.get("/me", response_model=AdminOut)
def me(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
    return admin
