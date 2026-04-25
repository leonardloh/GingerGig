from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_sessionmaker


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    sm = get_sessionmaker(request.app.state.engine)
    async with sm() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
