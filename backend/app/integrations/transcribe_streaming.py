from __future__ import annotations

import os
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from amazon_transcribe.client import TranscribeStreamingClient

from app.core.config import settings

TRANSCRIBE_STREAMING_REGION = "ap-southeast-1"
TRANSCRIBE_SAMPLE_RATE_HZ = 16000
TRANSCRIBE_MEDIA_ENCODING = "pcm"
SUPPORTED_STREAMING_LANGUAGES = {"en-US": "en-US", "zh-CN": "zh-CN"}


@dataclass(slots=True)
class TranscriptResult:
    text: str
    is_partial: bool


@dataclass(slots=True)
class TranscribeStreamingSession:
    input_stream: Any
    transcript_events: AsyncIterator[TranscriptResult]


def _client_region() -> str:
    """Voice streaming is deliberately pinned to AWS Singapore for cost/latency."""
    return TRANSCRIBE_STREAMING_REGION if settings.aws_region else TRANSCRIBE_STREAMING_REGION


def _install_settings_credentials() -> None:
    """Expose .env-loaded settings to the awslabs Transcribe SDK credential chain."""

    if settings.aws_access_key_id:
        os.environ.setdefault("AWS_ACCESS_KEY_ID", settings.aws_access_key_id)
    if settings.aws_secret_access_key:
        os.environ.setdefault("AWS_SECRET_ACCESS_KEY", settings.aws_secret_access_key)
    if settings.aws_session_token:
        os.environ.setdefault("AWS_SESSION_TOKEN", settings.aws_session_token)
    os.environ.setdefault("AWS_DEFAULT_REGION", _client_region())


def create_transcribe_streaming_client() -> TranscribeStreamingClient:
    _install_settings_credentials()
    return TranscribeStreamingClient(region=_client_region())


async def start_streaming_session(
    language_code: str,
    *,
    client: TranscribeStreamingClient | None = None,
) -> TranscribeStreamingSession:
    transcribe_language = SUPPORTED_STREAMING_LANGUAGES.get(language_code)
    if transcribe_language is None:
        raise ValueError(f"Unsupported streaming language: {language_code}")

    active_client = client or create_transcribe_streaming_client()
    stream = await active_client.start_stream_transcription(
        language_code=transcribe_language,
        media_sample_rate_hz=TRANSCRIBE_SAMPLE_RATE_HZ,
        media_encoding=TRANSCRIBE_MEDIA_ENCODING,
    )
    return TranscribeStreamingSession(
        input_stream=stream.input_stream,
        transcript_events=iter_transcript_results(stream.output_stream),
    )


async def iter_transcript_results(output_stream: Any) -> AsyncIterator[TranscriptResult]:
    async for event in output_stream:
        transcript = getattr(event, "transcript", None)
        results = getattr(transcript, "results", []) if transcript is not None else []
        for result in results:
            alternatives = getattr(result, "alternatives", [])
            if not alternatives:
                continue
            text = getattr(alternatives[0], "transcript", "").strip()
            if text:
                yield TranscriptResult(
                    text=text,
                    is_partial=bool(getattr(result, "is_partial", False)),
                )
