import pytest

from app.config import AppConfig
from app.database import create_db_engine, parse_db_url


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
