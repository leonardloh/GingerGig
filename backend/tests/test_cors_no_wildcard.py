"""Recommended: assert CORS allowlist does not contain '*' (FOUND-03)."""

from app.main import app


def test_cors_origins_do_not_include_wildcard() -> None:
    cors_middleware = [
        middleware
        for middleware in app.user_middleware
        if "CORS" in middleware.cls.__name__
        or "cors" in middleware.cls.__module__.lower()
    ]
    assert cors_middleware, "CORS middleware not registered"
    origins = cors_middleware[0].kwargs.get("allow_origins") or []
    assert "*" not in origins, f"wildcard CORS detected: {origins}"
    assert any(
        "localhost" in origin or "127.0.0.1" in origin or "gingergig" in origin
        for origin in origins
    ), f"unexpected CORS origins: {origins}"
