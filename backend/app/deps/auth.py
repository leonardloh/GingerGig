from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_jwt
from app.deps.db import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _user_from_token(token: str | None, db: AsyncSession) -> User:
    if not token:
        raise credentials_exception()

    try:
        payload = decode_jwt(token)
        user_id = UUID(str(payload["sub"]))
    except (KeyError, PyJWTError, ValueError):
        raise credentials_exception() from None

    user = await db.get(User, user_id)
    if user is None:
        raise credentials_exception()
    return user


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise credentials_exception()
    return await _user_from_token(credentials.credentials, db)


async def get_current_user_ws(token: str | None, db: AsyncSession) -> User:
    return await _user_from_token(token, db)
