"""JWT encode/decode helpers centralised to prevent algorithm-confusion bugs."""
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import settings

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 24 * 60 * 60


def encode_jwt(payload: dict[str, Any]) -> str:
    to_encode = payload.copy()
    to_encode.setdefault(
        "exp",
        datetime.now(UTC) + timedelta(seconds=ACCESS_TOKEN_EXPIRE_SECONDS),
    )
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[JWT_ALGORITHM],
        options={"require": ["exp", "sub"]},
    )
