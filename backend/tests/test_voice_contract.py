import pathlib

from starlette.routing import WebSocketRoute

from app.core.config import settings
from app.main import app

BACKEND = pathlib.Path(__file__).parent.parent


def _registered_websocket_paths() -> set[str]:
    return {
        route.path
        for route in app.routes
        if isinstance(route, WebSocketRoute) and getattr(route, "path", None)
    }


def test_voice_http_routes_are_in_openapi() -> None:
    paths = app.openapi()["paths"]

    assert "post" in paths["/api/v1/voice-to-profile/batch"]
    assert "get" in paths["/api/v1/voice-to-profile/batch/{job_id}"]
    assert "post" in paths["/api/v1/voice-to-profile/audio-upload-url"]


def test_voice_websocket_route_is_registered() -> None:
    assert "/api/v1/voice-to-profile/stream" in _registered_websocket_paths()


def test_voice_aws_region_default_is_singapore() -> None:
    assert settings.aws_region == "ap-southeast-1"


def test_transcribe_streaming_module_does_not_import_boto3() -> None:
    streaming_module = BACKEND / "app" / "integrations" / "transcribe_streaming.py"
    assert streaming_module.exists()

    source = streaming_module.read_text(encoding="utf-8")
    assert "import boto3" not in source
    assert "from boto3" not in source


def test_voice_transcribe_modules_pin_singapore_region() -> None:
    streaming_source = (
        BACKEND / "app" / "integrations" / "transcribe_streaming.py"
    ).read_text(encoding="utf-8")
    batch_source = (BACKEND / "app" / "integrations" / "transcribe_batch.py").read_text(
        encoding="utf-8"
    )

    assert "ap-southeast-1" in streaming_source
    assert "ap-southeast-1" in batch_source
