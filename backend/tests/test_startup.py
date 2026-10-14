"""The site keeps running while its database is down (e.g. a free database switched off)."""

import threading
import time
from typing import Any

import pytest
from sqlalchemy.exc import OperationalError

from app import main

from .conftest import ClientFactory


def test_ping_uses_the_database(client: Any) -> None:
    assert client.get("/api/ping").json() == {"status": "ok"}
    assert client.get("/api/health").json()["ready"] is True


def test_site_starts_while_the_database_is_down(make_client: ClientFactory) -> None:
    # Nothing listens on port 1, so every connection is refused.
    client = make_client(database_url="mysql+pymysql://klenz:x@127.0.0.1:1/klenz", fresh=False)

    health = client.get("/api/health").json()
    assert health["status"] == "ok"
    assert health["ready"] is False

    for path in ("/api/ping", "/api/site"):
        response = client.get(path)
        assert response.status_code == 503
        assert "waking up" in response.json()["detail"]


def test_database_setup_is_retried_until_it_works(
    make_client: ClientFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_on = threading.Event()
    real_setup = main.apply_mysql_table_options

    def switched_off_at_first(engine: Any) -> None:
        if not database_on.is_set():
            raise OperationalError("SELECT 1", {}, Exception("database is switched off"))
        real_setup(engine)

    monkeypatch.setattr(main, "apply_mysql_table_options", switched_off_at_first)
    monkeypatch.setattr(main, "DB_RETRY_SECONDS", 0.05)
    client = make_client()
    assert client.get("/api/health").json()["ready"] is False

    database_on.set()  # the admin powers the database on again
    deadline = time.monotonic() + 5
    while not client.get("/api/health").json()["ready"] and time.monotonic() < deadline:
        time.sleep(0.05)

    assert client.get("/api/health").json()["ready"] is True
    assert client.get("/api/site").status_code == 200
