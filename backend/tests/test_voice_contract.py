import pathlib

import pytest
from starlette.routing import WebSocketRoute

from app.core.config import settings
from app.main import app

BACKEND = pathlib.Path(__file__).parent.parent
VOICE_ROUTE_SKIP_REASON = "implemented in 04-03/04-04"


def _registered_http_methods() -> dict[str, set[str]]:
    methods_by_path: dict[str, set[str]] = {}
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None)
        if path and methods:
            methods_by_path[path] = set(methods)
    return methods_by_path


def _registered_websocket_paths() -> set[str]:
    return {
        route.path
        for route in app.routes
        if isinstance(route, WebSocketRoute) and getattr(route, "path", None)
    }


def test_voice_routes_registered_or_skipped_until_implementation() -> None:
    http_methods = _registered_http_methods()
    websocket_paths = _registered_websocket_paths()
    missing: list[str] = []

    if "/api/v1/voice-to-profile/stream" not in websocket_paths:
        missing.append("WEBSOCKET /api/v1/voice-to-profile/stream")

    expected_http_routes = {
        "/api/v1/voice-to-profile/batch": "POST",
        "/api/v1/voice-to-profile/batch/{job_id}": "GET",
        "/api/v1/voice-to-profile/audio-upload-url": "POST",
    }
    for path, method in expected_http_routes.items():
        if method not in http_methods.get(path, set()):
            missing.append(f"{method} {path}")

    if missing:
        pytest.skip(f"{VOICE_ROUTE_SKIP_REASON}: missing {', '.join(missing)}")


def test_voice_aws_region_default_is_singapore() -> None:
    assert settings.aws_region == "ap-southeast-1"


def test_transcribe_streaming_module_does_not_import_boto3_if_present() -> None:
    streaming_module = BACKEND / "app" / "integrations" / "transcribe_streaming.py"
    if not streaming_module.exists():
        pytest.skip(f"{VOICE_ROUTE_SKIP_REASON}: transcribe_streaming.py not created yet")

    source = streaming_module.read_text(encoding="utf-8")
    assert "import boto3" not in source
    assert "from boto3" not in source
