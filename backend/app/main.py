"""FastAPI application: the JSON API under /api plus the built React site."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, sessionmaker

from .config import AppConfig, get_config
from .database import Base, apply_mysql_table_options, create_db_engine, ensure_mysql_database
from .ratelimit import RateLimiter
from .routers import admin, auth, public
from .security import resolve_secret_key
from .seed import seed_database

log = logging.getLogger("uvicorn.error")


def create_app(config: AppConfig | None = None) -> FastAPI:
    config = config or get_config()
    engine = create_db_engine(config.database_url)
    session_factory = sessionmaker(engine, class_=Session, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        if config.db_auto_create and ensure_mysql_database(config.database_url):
            log.info("Created MySQL database %r.", engine.url.database)
        apply_mysql_table_options(engine)
        Base.metadata.create_all(engine)
        with session_factory() as session:
            seed_database(session, config)
        yield
        engine.dispose()

    app = FastAPI(
        title="Klenz API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    app.state.config = config
    app.state.session_factory = session_factory
    app.state.secret_key = resolve_secret_key(config)
    app.state.login_limiter = RateLimiter(config.max_login_failures, config.login_window_minutes * 60)
    app.state.order_limiter = RateLimiter(config.max_orders_per_hour, 3600)

    if config.cors_origins:
        app.add_middleware(
            CORSMiddleware, allow_origins=config.cors_origins, allow_methods=["*"], allow_headers=["*"]
        )

    app.include_router(public.router)
    app.include_router(auth.router)
    app.include_router(admin.router)

    @app.get("/api/health", tags=["public"])
    def health() -> dict[str, str]:
        return {"status": "ok", "database": engine.dialect.name}

    _serve_frontend(app, config.frontend_dist)
    return app


def _serve_frontend(app: FastAPI, dist: Path) -> None:
    """Serve the React build, sending index.html for client-side routes like /about."""
    dist = dist.resolve()
    index = dist / "index.html"
    if not index.is_file():

        @app.get("/", include_in_schema=False)
        def frontend_not_built() -> dict[str, str]:
            return {"message": "Klenz API is running. Start the frontend with `npm run dev`, or build it."}

        return

    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        file = (dist / path).resolve()
        if path and file.is_file() and file.is_relative_to(dist):
            return FileResponse(file)
        return FileResponse(index, headers={"Cache-Control": "no-cache"})


app = create_app()
