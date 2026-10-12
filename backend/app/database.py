"""Database engine, session handling and MySQL setup helpers."""

import re
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from sqlalchemy import URL, DateTime, Engine, create_engine, event, text
from sqlalchemy.engine import Dialect, make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator[datetime]):
    """Stores UTC as a plain DATETIME (whole seconds, so it works on every MySQL
    version) and always hands back timezone-aware UTC datetimes."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is not None:
            value = value.astimezone(UTC).replace(tzinfo=None)
        return value.replace(microsecond=0)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        return value.replace(tzinfo=UTC) if value is not None else None


def utcnow() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def parse_db_url(url: str) -> URL:
    """Read DATABASE_URL, including the links hosting panels hand out.

    Plain mysql:// (Railway, Aiven) means the PyMySQL driver here, and Aiven's
    ?ssl-mode=REQUIRED (MySQL client syntax) becomes an encrypted PyMySQL connection.
    """
    url = url.strip()
    if url.startswith("mysql://"):
        url = "mysql+pymysql://" + url.removeprefix("mysql://")
    parsed = make_url(url)
    mode = parsed.query.get("ssl-mode")
    if mode is None:
        return parsed
    parsed = parsed.difference_update_query(["ssl-mode"])
    if str(mode).upper() == "DISABLED":
        return parsed
    # An ssl setting without a CA file makes PyMySQL encrypt the connection without
    # checking the server certificate, which is what REQUIRED means for MySQL clients.
    return parsed.update_query_dict({"ssl_check_hostname": "false"})


def create_db_engine(url: str) -> Engine:
    parsed = parse_db_url(url)
    options: dict[str, Any] = {"pool_pre_ping": True}
    if parsed.get_backend_name() == "sqlite":
        options["connect_args"] = {"check_same_thread": False}
        if parsed.database in (None, "", ":memory:"):
            options["poolclass"] = StaticPool
    else:
        # Hosted MySQL servers drop idle connections; recycle before they do.
        options["pool_recycle"] = 1800
    engine = create_engine(parsed, **options)

    if parsed.get_backend_name() == "sqlite":

        @event.listens_for(engine, "connect")
        def _enable_sqlite_foreign_keys(dbapi_connection: Any, _record: Any) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def mysql_charset(version: tuple[int, ...] | None) -> tuple[str, str]:
    """utf8mb4 (full Unicode, emoji included) needs MySQL 5.5.3 or newer."""
    if version is not None and version < (5, 5, 3):
        return "utf8", "utf8_unicode_ci"
    return "utf8mb4", "utf8mb4_unicode_ci"


_SAFE_DB_NAME = re.compile(r"^[A-Za-z0-9_]+$")


def ensure_mysql_database(url: str) -> bool:
    """Create the database named in a MySQL URL if it is missing.

    Returns True when a database was created. Does nothing for other backends.
    """
    parsed = parse_db_url(url)
    name = parsed.database
    if parsed.get_backend_name() != "mysql" or not name:
        return False
    if not _SAFE_DB_NAME.match(name):
        raise ValueError(f"Database name {name!r} may only contain letters, digits and _")

    # set(database=None) would mean "unchanged"; an empty name connects to the server only.
    server = create_engine(parsed.set(database=""), pool_pre_ping=True)
    try:
        with server.connect() as conn:
            exists = conn.execute(
                text("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = :name"),
                {"name": name},
            ).first()
            if exists:
                return False
            charset, collation = mysql_charset(server.dialect.server_version_info)
            conn.execute(text(f"CREATE DATABASE `{name}` CHARACTER SET {charset} COLLATE {collation}"))
            return True
    finally:
        server.dispose()


def apply_mysql_table_options(engine: Engine) -> None:
    """Make CREATE TABLE use InnoDB and the best charset this MySQL server supports."""
    if engine.dialect.name != "mysql":
        return
    with engine.connect():
        pass  # first connect populates server_version_info
    charset, collation = mysql_charset(engine.dialect.server_version_info)
    for table in Base.metadata.tables.values():
        table.dialect_kwargs["mysql_engine"] = "InnoDB"
        table.dialect_kwargs["mysql_default_charset"] = charset
        table.dialect_kwargs["mysql_collate"] = collation


def get_db(request: Request) -> Iterator[Session]:
    factory: sessionmaker[Session] = request.app.state.session_factory
    with factory() as session:
        yield session
