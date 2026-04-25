import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.integrations.transcribe_streaming import TranscribeStreamingSession
from app.services.voice_service import _cleanup_streaming, run_streaming_session


class FakeDbSession:
    def __init__(self) -> None:
        self.objects: list[object] = []
        self.commit = AsyncMock()

    def add(self, obj: object) -> None:
        self.objects.append(obj)


async def _empty_transcript_events():
    if False:
        yield None


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
