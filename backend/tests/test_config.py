from app.config import AppConfig


def test_hosted_mysql_url_uses_pymysql() -> None:
    # Railway's MYSQL_URL, pasted with stray whitespace.
    config = AppConfig(_env_file=None, database_url=" mysql://root:pw@mysql.railway.internal:3306/railway\n")
    assert config.database_url == "mysql+pymysql://root:pw@mysql.railway.internal:3306/railway"


def test_url_with_driver_is_kept() -> None:
    url = "mysql+pymysql://root:@127.0.0.1:3306/klenz?charset=utf8"
    assert AppConfig(_env_file=None, database_url=url).database_url == url
