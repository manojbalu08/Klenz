"""Application configuration, read from environment variables and backend/.env."""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # SQLAlchemy URL, e.g. mysql+pymysql://user:password@127.0.0.1:3306/klenz?charset=utf8mb4
    # Plain mysql://… URLs from hosting panels (Railway's MYSQL_URL) work too.
    database_url: str = "mysql+pymysql://root:@127.0.0.1:3306/klenz?charset=utf8mb4"
    # Create the MySQL database on startup when it does not exist yet.
    db_auto_create: bool = True

    # Signs admin login tokens. Leave empty to generate one into backend/.secret_key.
    secret_key: str = ""
    access_token_hours: int = 12
    remember_me_days: int = 30

    # First admin account, created on first start when no admin exists yet.
    # An empty password generates a random one and prints it to the console.
    admin_email: str = "admin@klenz.com"
    admin_password: str = ""
    admin_name: str = "Admin"

    # Add the three sample enquiries from the design on first start.
    seed_sample_data: bool = True

    # Abuse limits for the public endpoints (per client IP).
    max_login_failures: int = 10
    login_window_minutes: int = 15
    max_orders_per_hour: int = 20

    # Extra origins allowed to call the API, as a JSON list. Only needed when the
    # frontend is served from a different domain than the API.
    cors_origins: list[str] = []

    # Built React app (npm run build) that FastAPI serves in production.
    frontend_dist: Path = BACKEND_DIR.parent / "frontend" / "dist"

    @field_validator("database_url")
    @classmethod
    def _use_pymysql(cls, url: str) -> str:
        """SQLAlchemy reads mysql:// as the mysqlclient driver; this app ships PyMySQL."""
        url = url.strip()
        if url.startswith("mysql://"):
            return "mysql+pymysql://" + url.removeprefix("mysql://")
        return url


@lru_cache
def get_config() -> AppConfig:
    return AppConfig()
