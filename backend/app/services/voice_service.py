from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, Protocol

from fastapi import WebSocket
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocketDisconnect

from app.integrations.transcribe_streaming import (
    TranscribeStreamingSession,
    TranscriptResult,
    start_streaming_session,
)
from app.models.user import User
from app.models.voice_session import VoiceSession
from app.schemas.voice import ListingDraft, VoiceStreamHandshake
from app.services.qwen_service import (
    LISTING_EXTRACTION_FAILED_MSG,
    ListingExtractionError,
    extract_listing,
)

logger = logging.getLogger(__name__)

MAX_STREAMING_SESSION_SECONDS = 90
PARTIAL_MIN_INTERVAL_SECONDS = 0.25
STREAMING_CLOSE_BATCH_ONLY = 4400
STREAMING_CLOSE_AUTH = 4401
STREAMING_CLOSE_ERROR = 4500

AudioQueueItem = bytes | None


class StreamingSessionFactory(Protocol):
    async def __call__(self, language_code: str) -> TranscribeStreamingSession: ...


class ListingExtractor(Protocol):
    async def __call__(self, transcript: str, language: str) -> ListingDraft: ...


@dataclass(slots=True)
class PartialThrottleState:
    last_sent_at: float | None = None
    last_text: str | None = None


def should_send_partial(
    now: float,
    last_sent_at: float | None,
    last_text: str | None,
    new_text: str,
) -> bool:
    text = new_text.strip()
    if not text or text == last_text:
        return False
    if last_sent_at is not None and now - last_sent_at < PARTIAL_MIN_INTERVAL_SECONDS:
        return False
    return True


async def run_streaming_session(
    websocket: WebSocket,
    user: User,
    db_session: AsyncSession,
    *,
    streaming_session_factory: StreamingSessionFactory = start_streaming_session,
    listing_extractor: ListingExtractor = extract_listing,
    max_duration_seconds: int = MAX_STREAMING_SESSION_SECONDS,
) -> None:
    """Run voice streaming.

    Client protocol: first send text JSON `{"language":"en-US"|"zh-CN"}`.
    Then send 16kHz little-endian mono PCM as binary frames. After the last
    audio chunk, send text JSON `{"type":"end"}` to trigger Qwen extraction.
    """

    started_at = time.monotonic()
    input_stream: Any | None = None
    reader_task: asyncio.Task[None] | None = None
    client_reader_task: asyncio.Task[None] | None = None
    voice_session: VoiceSession | None = None

    try:
        async with asyncio.timeout(max_duration_seconds):
            handshake = await _receive_handshake(websocket)
            if handshake is None:
                return

            voice_session = VoiceSession(
                id=uuid.uuid4(),
                elder_id=user.id,
                language=handshake.language,
                mode="stream",
                status="recording",
            )
            db_session.add(voice_session)
            await db_session.commit()

            streaming_session = await streaming_session_factory(handshake.language)
            input_stream = streaming_session.input_stream
            final_segments: list[str] = []
            audio_queue: asyncio.Queue[AudioQueueItem] = asyncio.Queue()

            # Two-task streaming shape: one reads client frames into a queue,
            # the other reads Transcribe output and forwards throttled partials.
            client_reader_task = asyncio.create_task(_read_client_audio(websocket, audio_queue))
            reader_task = asyncio.create_task(
                _forward_transcribe_results(
                    websocket,
                    streaming_session.transcript_events,
                    final_segments,
                )
            )

            await _send_audio_to_transcribe(audio_queue, input_stream, client_reader_task)
            await _mark_voice_session(db_session, voice_session, "transcribing")
            await _end_input_stream(input_stream)

            with contextlib.suppress(asyncio.TimeoutError):
                await asyncio.wait_for(reader_task, timeout=3)

            transcript = " ".join(final_segments).strip()
            if not transcript:
                await _send_error(websocket, "No transcript received")
                await _mark_voice_session(
                    db_session,
                    voice_session,
                    "failed",
                    error="No transcript received",
                )
                return

            await _mark_voice_session(
                db_session,
                voice_session,
                "extracting",
                transcript=transcript,
            )
            try:
                listing = await listing_extractor(transcript, handshake.language)
            except ListingExtractionError:
                await _send_error(websocket, LISTING_EXTRACTION_FAILED_MSG)
                await _mark_voice_session(
                    db_session,
                    voice_session,
                    "failed",
                    error=LISTING_EXTRACTION_FAILED_MSG,
                )
                return

            await _mark_voice_session(
                db_session,
                voice_session,
                "ready",
                transcript=transcript,
                listing=listing,
            )
            await websocket.send_json(
                {"type": "final", "listing": listing.model_dump(by_alias=True)}
            )
    except TimeoutError:
        if voice_session is not None:
            await _mark_voice_session(
                db_session,
                voice_session,
                "failed",
                error="Voice session timed out",
            )
        await _send_error(websocket, "Voice session timed out")
        await _close_websocket(websocket, code=STREAMING_CLOSE_ERROR)
    except WebSocketDisconnect:
        if voice_session is not None:
            await _mark_voice_session(
                db_session,
                voice_session,
                "failed",
                error="WebSocket disconnected",
            )
    finally:
        await _cleanup_streaming(
            input_stream=input_stream,
            reader_task=reader_task,
            client_reader_task=client_reader_task,
            websocket=websocket,
        )
        logger.info(
            "voice_ws_close",
            extra={
                "voice_session_id": str(voice_session.id) if voice_session else None,
                "user_id": str(user.id),
                "duration_seconds": round(time.monotonic() - started_at, 3),
            },
        )


async def _receive_handshake(websocket: WebSocket) -> VoiceStreamHandshake | None:
    try:
        payload = await websocket.receive_json()
        if isinstance(payload, dict) and payload.get("language") in {"ms-MY", "ta-IN"}:
            await _close_websocket(websocket, code=STREAMING_CLOSE_BATCH_ONLY, reason="batch only")
            return None
        handshake = VoiceStreamHandshake.model_validate(payload)
    except (json.JSONDecodeError, ValidationError, WebSocketDisconnect):
        await _close_websocket(
            websocket,
            code=STREAMING_CLOSE_BATCH_ONLY,
            reason="invalid language",
        )
        return None

    if handshake.language not in {"en-US", "zh-CN"}:
        await _close_websocket(websocket, code=STREAMING_CLOSE_BATCH_ONLY, reason="batch only")
        return None
    return handshake


async def _read_client_audio(
    websocket: WebSocket,
    audio_queue: asyncio.Queue[AudioQueueItem],
) -> None:
    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                raise WebSocketDisconnect(code=message.get("code", 1000))
            if message.get("bytes") is not None:
                await audio_queue.put(message["bytes"])
                continue
            text = message.get("text")
            if text is None:
                continue
            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                continue
            if payload == {"type": "end"}:
                await audio_queue.put(None)
                return
    except WebSocketDisconnect:
        await audio_queue.put(None)
        raise


async def _send_audio_to_transcribe(
    audio_queue: asyncio.Queue[AudioQueueItem],
    input_stream: Any,
    client_reader_task: asyncio.Task[None],
) -> None:
    while True:
        if client_reader_task.done():
            with contextlib.suppress(WebSocketDisconnect):
                client_reader_task.result()
        chunk = await audio_queue.get()
        if chunk is None:
            if client_reader_task.done():
                with contextlib.suppress(WebSocketDisconnect):
                    client_reader_task.result()
            return
        await input_stream.send_audio_event(audio_chunk=chunk)


async def _forward_transcribe_results(
    websocket: WebSocket,
    transcript_events: Any,
    final_segments: list[str],
) -> None:
    throttle = PartialThrottleState()
    async for result in transcript_events:
        if not isinstance(result, TranscriptResult):
            continue
        if result.is_partial:
            now = time.monotonic()
            if should_send_partial(now, throttle.last_sent_at, throttle.last_text, result.text):
                await websocket.send_json({"type": "partial", "text": result.text})
                throttle.last_sent_at = now
                throttle.last_text = result.text.strip()
        else:
            final_segments.append(result.text)


async def _mark_voice_session(
    db_session: AsyncSession,
    voice_session: VoiceSession,
    status: str,
    *,
    transcript: str | None = None,
    listing: ListingDraft | None = None,
    error: str | None = None,
) -> None:
    voice_session.status = status
    if transcript is not None:
        voice_session.transcript = transcript
    if listing is not None:
        voice_session.listing_draft = listing.model_dump(mode="json")
    if error is not None:
        voice_session.error = error
    await db_session.commit()


async def _send_error(websocket: WebSocket, message: str) -> None:
    with contextlib.suppress(RuntimeError, WebSocketDisconnect):
        await websocket.send_json({"type": "error", "message": message})


async def _cleanup_streaming(
    *,
    input_stream: Any | None,
    reader_task: asyncio.Task[None] | None,
    client_reader_task: asyncio.Task[None] | None,
    websocket: WebSocket,
) -> None:
    if input_stream is not None:
        await _end_input_stream(input_stream)
    for task in (reader_task, client_reader_task):
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError, WebSocketDisconnect):
                await task
    await _close_websocket(websocket)


async def _end_input_stream(input_stream: Any) -> None:
    with contextlib.suppress(Exception):
        await input_stream.end_stream()


async def _close_websocket(
    websocket: WebSocket,
    *,
    code: int = 1000,
    reason: str | None = None,
) -> None:
    with contextlib.suppress(RuntimeError, WebSocketDisconnect):
        if reason is None:
            await websocket.close(code=code)
        else:
            await websocket.close(code=code, reason=reason)
