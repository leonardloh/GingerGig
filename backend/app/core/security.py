"""JWT encode/decode helpers. Centralised here per CONTEXT.md PROJECT decisions to
prevent the algorithm-confusion CVE-2022-29217 / CVE-2024-33663.

Phase 2 implements; Phase 1 only locks the API surface so Phase 2 can't deviate.
"""
from typing import Any

# Phase 2 will: import jwt  (from pyjwt[crypto])
# Phase 2 will: from app.core.config import settings


def encode_jwt(payload: dict[str, Any]) -> str:
    """Phase 2: jwt.encode(payload, settings.jwt_secret, algorithm="HS256")."""
    raise NotImplementedError("Phase 2 implements")


def decode_jwt(token: str) -> dict[str, Any]:
    """Phase 2 MUST call:

        jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],                       # explicit allowlist
            options={"require": ["exp", "sub"]},        # mandatory claims
        )

    DO NOT use `jwt.decode(token, secret)` with two args — algorithm-confusion
    vulnerability (CVE-2022-29217). DO NOT touch python-jose.
    """
    raise NotImplementedError("Phase 2 implements")
