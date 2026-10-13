import pytest
from sqlalchemy import text

from app.config import AppConfig
from app.database import Base, add_missing_columns, create_db_engine, ensure_mysql_database, parse_db_url

from .conftest import TEST_DATABASE_URL


def test_columns_added_later_reach_existing_tables() -> None:
    ensure_mysql_database(TEST_DATABASE_URL)
    engine = create_db_engine(TEST_DATABASE_URL)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with engine.begin() as conn:  # a database from before prices and payments
        conn.execute(text(
            "INSERT INTO products (name, category, description, spec, art, tint, image_url, is_live, sort_order,"
            " created_at, updated_at) VALUES ('Toilet Roll', 'Rolls', '', '', 'roll', 'soft', '', 1, 0,"
            " '2026-10-01 00:00:00', '2026-10-01 00:00:00')"
        ))
        conn.execute(text("ALTER TABLE products DROP COLUMN price"))
        conn.execute(text("ALTER TABLE orders DROP COLUMN payment_status"))

    assert sorted(add_missing_columns(engine)) == ["orders.payment_status", "products.price"]
    assert add_missing_columns(engine) == []
    with engine.connect() as conn:
        assert conn.execute(text("SELECT price FROM products")).scalar_one() == 0
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_plain_mysql_link_uses_pymysql() -> None:
    # Railway's MYSQL_URL, pasted with stray whitespace.
    url = parse_db_url(" mysql://root:pw@mysql.railway.internal:3306/railway\n")
    assert url.render_as_string(hide_password=False) == "mysql+pymysql://root:pw@mysql.railway.internal:3306/railway"


def test_aiven_link_gives_an_encrypted_connection() -> None:
    engine = create_db_engine("mysql://avnadmin:pw@klenz.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED")
    _args, options = engine.dialect.create_connect_args(engine.url)
    assert engine.url.drivername == "mysql+pymysql"
    assert (options["host"], options["database"]) == ("klenz.aivencloud.com", "defaultdb")
    assert options["ssl"] == {"check_hostname": False}  # encrypted, certificate not checked
    engine.dispose()


def test_ssl_mode_disabled_means_a_plain_connection() -> None:
    assert dict(parse_db_url("mysql://u:p@db.example.com:3306/klenz?ssl-mode=DISABLED").query) == {}


def test_url_with_a_driver_is_kept() -> None:
    url = "mysql+pymysql://root:@127.0.0.1:3306/klenz?charset=utf8"
    assert parse_db_url(url).render_as_string(hide_password=False) == url


def test_git_commit_comes_from_the_host(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc123")
    assert AppConfig(_env_file=None).git_commit == "abc123"  # type: ignore[call-arg]
