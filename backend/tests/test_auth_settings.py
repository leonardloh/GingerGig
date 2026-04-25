import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_jwt_secret_min_length_is_enforced() -> None:
    with pytest.raises(ValidationError):
        Settings(
            database_url="postgresql+asyncpg://user:pass@localhost:5432/gingergig_test",
            jwt_secret="short",
        )


def test_jwt_secret_accepts_32_plus_characters() -> None:
    secret = "x" * 32
    settings = Settings(
        database_url="postgresql+asyncpg://user:pass@localhost:5432/gingergig_test",
        jwt_secret=secret,
    )

    assert settings.jwt_secret == secret
