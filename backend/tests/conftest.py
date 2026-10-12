"""Test fixtures.

Tests use an in-memory SQLite database by default. To run them against MySQL, point
TEST_DATABASE_URL at a throwaway database (its tables are dropped between tests):

    TEST_DATABASE_URL="mysql+pymysql://root:@127.0.0.1:3306/klenz_test?charset=utf8mb4" pytest
"""

import os
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import security
from app.config import AppConfig
from app.database import Base, create_db_engine, ensure_mysql_database
from app.main import create_app

ADMIN_EMAIL = "admin@klenz.com"
ADMIN_PASSWORD = "correct-horse-battery"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")
IN_MEMORY = TEST_DATABASE_URL in ("sqlite://", "sqlite:///:memory:")

ClientFactory = Callable[..., TestClient]


@pytest.fixture(autouse=True)
def fast_password_hashing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1_000)
    security.dummy_password_hash.cache_clear()


def _drop_tables(url: str) -> None:
    ensure_mysql_database(url)
    engine = create_db_engine(url)
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def make_client(tmp_path: Any) -> Iterator[ClientFactory]:
    clients: list[TestClient] = []

    def factory(*, database_url: str | None = None, fresh: bool = True, **overrides: Any) -> TestClient:
        url = database_url or TEST_DATABASE_URL
        if fresh and url not in ("sqlite://", "sqlite:///:memory:"):
            _drop_tables(url)
        settings: dict[str, Any] = {
            "max_orders_per_hour": 1000,
            "max_login_failures": 1000,
            "frontend_dist": tmp_path / "no-frontend-build",
        } | overrides
        config = AppConfig(
            _env_file=None,  # type: ignore[call-arg]
            database_url=url,
            secret_key="test-" + "k" * 59,
            admin_email=ADMIN_EMAIL,
            admin_password=ADMIN_PASSWORD,
            **settings,
        )
        client = TestClient(create_app(config))
        client.__enter__()  # runs startup: tables + seed data
        clients.append(client)
        return client

    yield factory
    for client in reversed(clients):
        client.__exit__(None, None, None)


@pytest.fixture
def client(make_client: ClientFactory) -> TestClient:
    return make_client()


def login(client: TestClient, password: str = ADMIN_PASSWORD, remember: bool = False) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": password, "remember": remember})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def admin(client: TestClient) -> dict[str, str]:
    """Authorization headers for the seeded admin."""
    return login(client)
