"""Password hashing, login tokens and the "must be signed in" dependency."""

import base64
import hashlib
import hmac
import secrets
from datetime import timedelta
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import BACKEND_DIR, AppConfig
from .database import get_db, utcnow
from .models import AdminUser
from .schemas import AdminOut, TokenOut

PBKDF2_ITERATIONS = 600_000
TOKEN_ALGORITHM = "HS256"


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def hash_password(password: str, iterations: int | None = None) -> str:
    iterations = iterations or PBKDF2_ITERATIONS
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, digest = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), int(iterations))
        return hmac.compare_digest(candidate, base64.b64decode(digest))
    except ValueError:
        return False


@lru_cache
def dummy_password_hash() -> str:
    """Checked against when the email is unknown, so both cases take equally long."""
    return hash_password(secrets.token_urlsafe(16))


def resolve_secret_key(config: AppConfig) -> str:
    if config.secret_key:
        return config.secret_key
    key_file = BACKEND_DIR / ".secret_key"
    if key_file.is_file():
        return key_file.read_text(encoding="utf-8").strip()
    key = secrets.token_urlsafe(48)
    key_file.write_text(key, encoding="utf-8")
    return key


def issue_token(user: AdminUser, request: Request, remember: bool) -> TokenOut:
    config: AppConfig = request.app.state.config
    lifetime = timedelta(days=config.remember_me_days) if remember else timedelta(hours=config.access_token_hours)
    now = utcnow()
    expires_at = now + lifetime
    payload = {"sub": str(user.id), "ver": user.token_version, "rem": remember, "iat": now, "exp": expires_at}
    token = jwt.encode(payload, request.app.state.secret_key, algorithm=TOKEN_ALGORITHM)
    return TokenOut(access_token=token, expires_at=expires_at, user=AdminOut.model_validate(user))


_bearer = HTTPBearer(auto_error=False)


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, message, headers={"WWW-Authenticate": "Bearer"})


def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    if credentials is None:
        raise _unauthorized("Please sign in.")
    try:
        payload: dict[str, Any] = jwt.decode(
            credentials.credentials, request.app.state.secret_key, algorithms=[TOKEN_ALGORITHM]
        )
        user = db.get(AdminUser, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _unauthorized("Your session has expired. Please sign in again.") from None
    if user is None or user.token_version != payload.get("ver"):
        raise _unauthorized("Your session has expired. Please sign in again.")
    request.state.token_payload = payload
    return user
