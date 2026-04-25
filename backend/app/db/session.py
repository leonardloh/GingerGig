from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings


def build_engine(s: Settings) -> AsyncEngine:
    connect_args: dict = {}
    if s.database_ssl_mode == "require":
        connect_args["ssl"] = "require"
    elif s.database_ssl_mode == "disable":
        connect_args["ssl"] = False

    return create_async_engine(
        s.database_url,
        echo=False,
        pool_size=10,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args=connect_args,
    )


def get_sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def dispose_engine(engine: AsyncEngine) -> None:
    await engine.dispose()
