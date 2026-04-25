import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.integrations.transcribe_streaming import TranscribeStreamingSession
from app.main import app
from app.services.qwen_service import LISTING_EXTRACTION_FAILED_MSG, ListingExtractionError
from app.services.voice_service import (
    STREAMING_CLOSE_AUTH,
    STREAMING_CLOSE_BATCH_ONLY,
    STREAMING_CLOSE_ERROR,
    TranscriptResult,
    _cleanup_streaming,
    _forward_transcribe_results,
    run_streaming_session,
)


class FakeDbSession:
    def __init__(self) -> None:
        self.objects: list[object] = []
        self.commit = AsyncMock()

    def add(self, obj: object) -> None:
        self.objects.append(obj)


class FakeSessionContext:
    async def __aenter__(self) -> object:
        return object()

    async def __aexit__(self, *args: object) -> None:
        return None


class FakeSessionMaker:
    def __call__(self) -> FakeSessionContext:
        return FakeSessionContext()


async def _empty_transcript_events():
    if False:
        yield None


async def _many_partial_events():
    for index in range(20):
        yield TranscriptResult(text=f"partial {index}", is_partial=True)


async def _one_final_event():
    yield TranscriptResult(text="I cook nasi lemak for neighbours.", is_partial=False)


def _patch_ws_db(monkeypatch: pytest.MonkeyPatch) -> None:
    app.state.engine = object()
    monkeypatch.setattr("app.routers.voice.get_sessionmaker", lambda _: FakeSessionMaker())


def test_websocket_without_token_closes_unauthorized(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_ws_db(monkeypatch)

    client = TestClient(app)
    try:
        with client.websocket_connect("/api/v1/voice-to-profile/stream") as websocket:
            with pytest.raises(WebSocketDisconnect) as exc:
                websocket.receive_json()
    finally:
        client.close()

    assert exc.value.code == STREAMING_CLOSE_AUTH


def test_websocket_requestor_token_closes_forbidden(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_ws_db(monkeypatch)

    async def fake_current_user(token: str | None, db: object) -> object:
        assert token == "requestor-token"
        return SimpleNamespace(id=uuid.uuid4(), role="requestor")

    monkeypatch.setattr("app.routers.voice.get_current_user_ws", fake_current_user)

    client = TestClient(app)
    try:
        with client.websocket_connect(
            "/api/v1/voice-to-profile/stream?token=requestor-token"
        ) as websocket:
            with pytest.raises(WebSocketDisconnect) as exc:
                websocket.receive_json()
    finally:
        client.close()

    assert exc.value.code == STREAMING_CLOSE_AUTH


@pytest.mark.asyncio
async def test_streaming_session_rejects_batch_only_language() -> None:
    websocket = SimpleNamespace(
        receive_json=AsyncMock(return_value={"language": "ms-MY"}),
        send_json=AsyncMock(),
        close=AsyncMock(),
    )
    factory = AsyncMock()

    await run_streaming_session(
        websocket,
        SimpleNamespace(id=uuid.uuid4()),
        FakeDbSession(),
        streaming_session_factory=factory,
    )

    factory.assert_not_called()
    assert any(
        call.kwargs == {"code": STREAMING_CLOSE_BATCH_ONLY, "reason": "batch only"}
        for call in websocket.close.await_args_list
    )


@pytest.mark.asyncio
async def test_partial_transcripts_are_throttled_to_four_per_second() -> None:
    websocket = SimpleNamespace(send_json=AsyncMock())

    await _forward_transcribe_results(websocket, _many_partial_events(), [])

    partial_messages = [
        call.args[0]
        for call in websocket.send_json.await_args_list
        if call.args[0].get("type") == "partial"
    ]
    assert len(partial_messages) <= 2


@pytest.mark.asyncio
async def test_streaming_session_ends_transcribe_stream_on_disconnect() -> None:
    websocket = SimpleNamespace(
        receive_json=AsyncMock(return_value={"language": "en-US"}),
        receive=AsyncMock(return_value={"type": "websocket.disconnect", "code": 1006}),
        send_json=AsyncMock(),
        close=AsyncMock(),
    )
    input_stream = SimpleNamespace(send_audio_event=AsyncMock(), end_stream=AsyncMock())

    async def fake_session_factory(language_code: str) -> TranscribeStreamingSession:
        assert language_code == "en-US"
        return TranscribeStreamingSession(
            input_stream=input_stream,
            transcript_events=_empty_transcript_events(),
        )

    await run_streaming_session(
        websocket,
        SimpleNamespace(id=uuid.uuid4()),
        FakeDbSession(),
        streaming_session_factory=fake_session_factory,
    )

    assert input_stream.end_stream.await_count >= 1


@pytest.mark.asyncio
async def test_streaming_extraction_failure_sends_safe_error_message() -> None:
    websocket = SimpleNamespace(
        receive_json=AsyncMock(return_value={"language": "en-US"}),
        receive=AsyncMock(
            side_effect=[
                {"type": "websocket.receive", "bytes": b"\x00\x00"},
                {"type": "websocket.receive", "text": '{"type":"end"}'},
            ]
        ),
        send_json=AsyncMock(),
        close=AsyncMock(),
    )
    input_stream = SimpleNamespace(send_audio_event=AsyncMock(), end_stream=AsyncMock())
    raw_validation_text = "password-like model output should not leak"

    async def fake_session_factory(language_code: str) -> TranscribeStreamingSession:
        assert language_code == "en-US"
        return TranscribeStreamingSession(
            input_stream=input_stream,
            transcript_events=_one_final_event(),
        )

    async def failing_extractor(transcript: str, language: str) -> object:
        assert transcript == "I cook nasi lemak for neighbours."
        assert language == "en-US"
        raise ListingExtractionError(raw_validation_text)

    await run_streaming_session(
        websocket,
        SimpleNamespace(id=uuid.uuid4()),
        FakeDbSession(),
        streaming_session_factory=fake_session_factory,
        listing_extractor=failing_extractor,
    )

    websocket.send_json.assert_any_await(
        {"type": "error", "message": LISTING_EXTRACTION_FAILED_MSG}
    )
    assert raw_validation_text not in str(websocket.send_json.await_args_list)


@pytest.mark.asyncio
async def test_streaming_transport_failure_marks_failed_and_sends_safe_error() -> None:
    websocket = SimpleNamespace(
        receive_json=AsyncMock(return_value={"language": "en-US"}),
        receive=AsyncMock(
            side_effect=[
                {"type": "websocket.receive", "bytes": b"\x00\x00"},
                {"type": "websocket.receive", "text": '{"type":"end"}'},
            ]
        ),
        send_json=AsyncMock(),
        close=AsyncMock(),
    )
    input_stream = SimpleNamespace(send_audio_event=AsyncMock(), end_stream=AsyncMock())
    db_session = FakeDbSession()
    raw_transport_text = "dashscope timeout request id should not leak"

    async def fake_session_factory(language_code: str) -> TranscribeStreamingSession:
        assert language_code == "en-US"
        return TranscribeStreamingSession(
            input_stream=input_stream,
            transcript_events=_one_final_event(),
        )

    async def failing_extractor(transcript: str, language: str) -> object:
        assert transcript == "I cook nasi lemak for neighbours."
        assert language == "en-US"
        raise RuntimeError(raw_transport_text)

    await run_streaming_session(
        websocket,
        SimpleNamespace(id=uuid.uuid4()),
        db_session,
        streaming_session_factory=fake_session_factory,
        listing_extractor=failing_extractor,
    )

    voice_session = db_session.objects[0]
    assert voice_session.status == "failed"
    assert voice_session.error == LISTING_EXTRACTION_FAILED_MSG
    websocket.send_json.assert_any_await(
        {"type": "error", "message": LISTING_EXTRACTION_FAILED_MSG}
    )
    assert raw_transport_text not in str(websocket.send_json.await_args_list)
    assert any(
        call.kwargs == {"code": STREAMING_CLOSE_ERROR}
        for call in websocket.close.await_args_list
    )


@pytest.mark.asyncio
async def test_cleanup_cancels_reader_task_in_finally_path() -> None:
    async def wait_forever() -> None:
        await asyncio.sleep(60)

    reader_task = asyncio.create_task(wait_forever())
    websocket = SimpleNamespace(close=AsyncMock())

    await _cleanup_streaming(
        input_stream=SimpleNamespace(end_stream=AsyncMock()),
        reader_task=reader_task,
        client_reader_task=None,
        websocket=websocket,
    )

    assert reader_task.cancelled()
