"""Pytest fixtures for Phase 1 (D-17, D-18, D-19).

- Session-scoped engine pointing at the test DB when TEST_DATABASE_URL is set.
- Per-test SAVEPOINT rollback so tests don't poison each other.
- httpx.AsyncClient via ASGITransport for async end-to-end app tests.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import httpx
import pytest_asyncio
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

os.environ.setdefault("ENABLE_TEST_ROUTES", "true")

from app.core.config import Settings, settings
from app.db.session import build_engine
from app.deps.db import get_db
from app.main import app


def _test_settings() -> Settings:
    """Build Settings forced to the test/runtime DSN without printing secrets."""
    test_url = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not test_url:
        raise RuntimeError(
            "TEST_DATABASE_URL or DATABASE_URL is not set; tests require a migrated Postgres DB."
        )
    if test_url.startswith("postgresql://"):
        test_url = "postgresql+asyncpg://" + test_url.removeprefix("postgresql://")
    os.environ["DATABASE_URL"] = test_url
    os.environ["TEST_DATABASE_URL"] = test_url
    return settings.model_copy(update={"database_url": test_url})


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    """Session-scoped engine pointing at the configured test database."""
    eng = build_engine(_test_settings())
    # ASGITransport does not run the FastAPI lifespan, so wire app state directly.
    app.state.engine = eng
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def db_session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Per-test SAVEPOINT rollback (D-18)."""
    async with engine.connect() as conn:
        outer_trans = await conn.begin()
        sm = async_sessionmaker(bind=conn, expire_on_commit=False)
        async with sm() as session:
            await session.begin_nested()
            try:
                yield session
            finally:
                await outer_trans.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def client(db_session: AsyncSession, engine: AsyncEngine) -> AsyncIterator[httpx.AsyncClient]:
    """ASGITransport client (D-19) wired to the SAVEPOINT-isolated session."""

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.clear()
