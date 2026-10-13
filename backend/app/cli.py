"""Command-line tools. Run from the backend folder:

    python -m app.cli init-db               create the database, tables and starter content
    python -m app.cli set-password EMAIL    set or reset an admin password (creates the admin if needed)
    python -m app.cli schema-sql            print the MySQL CREATE TABLE statements
"""

import argparse
import getpass
import sys

from sqlalchemy import select
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateIndex, CreateTable

from .config import get_config
from .database import (
    Base,
    add_missing_columns,
    apply_mysql_table_options,
    create_db_engine,
    ensure_mysql_database,
    mysql_charset,
)
from .models import AdminUser
from .security import hash_password
from .seed import seed_database


def init_db() -> None:
    config = get_config()
    if config.db_auto_create and ensure_mysql_database(config.database_url):
        print("Created the database.")
    engine = create_db_engine(config.database_url)
    apply_mysql_table_options(engine)
    Base.metadata.create_all(engine)
    add_missing_columns(engine)
    with Session(engine) as session:
        seed_database(session, config)
    engine.dispose()
    print("Database is ready.")


def set_password(email: str) -> None:
    password = getpass.getpass("New password: ")
    if len(password) < 8:
        sys.exit("The password needs at least 8 characters.")
    if getpass.getpass("Repeat it: ") != password:
        sys.exit("The passwords do not match.")

    engine = create_db_engine(get_config().database_url)
    Base.metadata.create_all(engine)
    add_missing_columns(engine)
    with Session(engine) as session:
        email = email.strip().lower()
        admin = session.scalar(select(AdminUser).where(AdminUser.email == email))
        if admin is None:
            admin = AdminUser(email=email, name="Admin", password_hash="")
            session.add(admin)
        admin.password_hash = hash_password(password)
        admin.token_version = (admin.token_version or 0) + 1
        session.commit()
    engine.dispose()
    print(f"Password saved for {email}.")


def schema_sql() -> None:
    charset, collation = mysql_charset(None)
    print("-- Klenz website schema for MySQL 5.7 / 8.x, generated from app/models.py.")
    print("-- The backend creates these tables by itself on first start; this file is for reference.\n")
    print(f"CREATE DATABASE IF NOT EXISTS `klenz` CHARACTER SET {charset} COLLATE {collation};")
    print("USE `klenz`;\n")
    dialect = mysql.dialect()
    for table in Base.metadata.sorted_tables:
        table.dialect_kwargs.update(mysql_engine="InnoDB", mysql_default_charset=charset, mysql_collate=collation)
        print(str(CreateTable(table).compile(dialect=dialect)).strip() + ";\n")
        for index in sorted(table.indexes, key=lambda i: i.name or ""):
            print(str(CreateIndex(index).compile(dialect=dialect)).strip() + ";")
        if table.indexes:
            print()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="Klenz backend tools")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init-db", help="create the database, tables and starter content")
    password = commands.add_parser("set-password", help="set or reset an admin password")
    password.add_argument("email")
    commands.add_parser("schema-sql", help="print the MySQL CREATE TABLE statements")
    args = parser.parse_args(argv)

    if args.command == "init-db":
        init_db()
    elif args.command == "set-password":
        set_password(args.email)
    else:
        schema_sql()


if __name__ == "__main__":
    main()
