"""Voice-to-profile routes expose WebSocket `/api/v1/voice-to-profile/stream?token=<JWT>`,
`POST`/`GET` batch job endpoints, `POST` audio upload URL, and AWS voice integrations
pinned to `ap-southeast-1`.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Coroutine
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Request,
    WebSocket,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_sessionmaker
from app.deps.auth import get_current_user, get_current_user_ws
from app.deps.db import get_db
from app.integrations import s3_audio, transcribe_batch
from app.models.user import User
from app.models.voice_session import VoiceSession
from app.schemas.voice import (
    AudioUploadUrlRequest,
    AudioUploadUrlResponse,
    ListingDraft,
    VoiceBatchRequest,
    VoiceBatchStatusResponse,
    VoiceBatchSubmitResponse,
)
from app.services.persona_queries import require_role
from app.services.qwen_service import (
    LISTING_EXTRACTION_FAILED_MSG,
    ListingExtractionError,
    extract_listing,
)
from app.services.voice_service import STREAMING_CLOSE_AUTH, run_streaming_session

router = APIRouter(prefix="/voice-to-profile", tags=["voice"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]

SUPPORTED_BATCH_CONTENT_TYPES = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/flac": "flac",
}


@router.post(
    "/audio-upload-url",
    response_model=AudioUploadUrlResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_audio_upload_url(
    payload: AudioUploadUrlRequest,
    current_user: CurrentUserDep,
) -> dict[str, str | int]:
    require_role(current_user, "elder")
    ext = SUPPORTED_BATCH_CONTENT_TYPES.get(payload.contentType)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported content type",
        )

    key = s3_audio.build_audio_key_elder(elder_id=current_user.id, ext=ext)
    return s3_audio.presign_put_audio(key=key, content_type=payload.contentType)


@router.post(
    "/batch",
    response_model=VoiceBatchSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_voice_batch(
    payload: VoiceBatchRequest,
    request: Request,
    db: DbDep,
    current_user: CurrentUserDep,
) -> VoiceBatchSubmitResponse:
    require_role(current_user, "elder")
    _require_elder_audio_key(elder_id=current_user.id, key=payload.s3Key)

    voice_session = VoiceSession(
        id=uuid.uuid4(),
        elder_id=current_user.id,
        language=payload.language,
        mode="batch",
        status="recording",
        audio_s3_key=payload.s3Key,
    )
    db.add(voice_session)
    await db.commit()

    _schedule_batch_job(
        run_batch_voice_job(request.app, voice_session.id, payload.s3Key, payload.language)
    )
    return VoiceBatchSubmitResponse(jobId=voice_session.id, status="pending", estimatedSeconds=10)


@router.get("/batch/{job_id}", response_model=VoiceBatchStatusResponse)
async def get_voice_batch_status(
    job_id: uuid.UUID,
    db: DbDep,
    current_user: CurrentUserDep,
) -> VoiceBatchStatusResponse:
    """Return batch status.

    Ready jobs include a validated listing draft, non-Qwen failures return a
    safe failed payload, and persistent Qwen extraction failure is surfaced as
    HTTP 502 `Listing extraction failed`.
    """

    result = await db.execute(
        select(VoiceSession).where(
            VoiceSession.id == job_id,
            VoiceSession.elder_id == current_user.id,
            VoiceSession.mode == "batch",
        )
    )
    voice_session = result.scalar_one_or_none()
    if voice_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if voice_session.status == "failed" and voice_session.error == LISTING_EXTRACTION_FAILED_MSG:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=LISTING_EXTRACTION_FAILED_MSG,
        )

    response_status = "pending" if voice_session.status == "recording" else voice_session.status
    listing = None
    if voice_session.listing_draft is not None:
        listing = ListingDraft.model_validate(voice_session.listing_draft)

    estimated_seconds = 10 if response_status in {"pending", "transcribing", "extracting"} else None
    return VoiceBatchStatusResponse(
        jobId=voice_session.id,
        status=response_status,
        estimatedSeconds=estimated_seconds,
        listing=listing,
        message=voice_session.error if voice_session.status == "failed" else None,
    )


async def run_batch_voice_job(
    app: FastAPI,
    voice_session_id: uuid.UUID,
    s3_key: str,
    language: str,
) -> None:
    sm = get_sessionmaker(app.state.engine)
    async with sm() as session:
        voice_session = await session.get(VoiceSession, voice_session_id)
        if voice_session is None:
            return

        job_name = f"gingergig-voice-{voice_session_id.hex}"
        try:
            voice_session.audio_s3_key = s3_key
            voice_session.transcribe_job_name = job_name
            voice_session.status = "transcribing"
            await session.commit()

            s3_uri = f"s3://{settings.s3_audio_bucket}/{s3_key}"
            media_format = _media_format_from_key(s3_key)
            await asyncio.to_thread(
                transcribe_batch.start_batch_job,
                job_name=job_name,
                s3_uri=s3_uri,
                language_code=language,
                media_format=media_format,
            )
            transcript = await asyncio.to_thread(transcribe_batch.poll_until_done, job_name)

            voice_session.status = "extracting"
            voice_session.transcript = transcript
            await session.commit()

            listing = await extract_listing(transcript, language)
            voice_session.status = "ready"
            voice_session.listing_draft = listing.model_dump(mode="json")
            voice_session.error = None
            await session.commit()
        except ListingExtractionError:
            voice_session.status = "failed"
            voice_session.error = LISTING_EXTRACTION_FAILED_MSG
            await session.commit()
        except Exception as exc:
            voice_session.status = "failed"
            voice_session.error = _safe_batch_error(exc)
            await session.commit()


def _require_elder_audio_key(*, elder_id: uuid.UUID, key: str) -> None:
    expected_prefix = f"elders/{elder_id}/voice/"
    if not key.startswith(expected_prefix):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _media_format_from_key(key: str) -> str:
    media_format = key.rsplit(".", maxsplit=1)[-1].lower()
    if media_format not in {"wav", "mp3", "flac", "mp4", "ogg", "amr"}:
        raise RuntimeError("Unsupported audio format")
    return media_format


def _safe_batch_error(exc: Exception) -> str:
    if isinstance(exc, TimeoutError):
        return "Voice batch timed out"
    message = str(exc).strip()
    return message if message else "Voice batch processing failed"


def _schedule_batch_job(coro: Coroutine[object, object, None]) -> None:
    asyncio.create_task(coro)


@router.websocket("/stream")
async def stream_voice_to_profile(
    websocket: WebSocket,
    token: str | None = Query(default=None),
) -> None:
    """Authenticate the elder WebSocket token before starting streaming capture."""
    await websocket.accept()

    sm = get_sessionmaker(websocket.app.state.engine)
    async with sm() as db:
        try:
            user = await get_current_user_ws(token, db)
            require_role(user, "elder")
        except HTTPException:
            await websocket.close(code=STREAMING_CLOSE_AUTH)
            return

        await run_streaming_session(websocket, user, db)
