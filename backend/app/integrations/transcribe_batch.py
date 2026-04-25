import json
import time
import urllib.request
from typing import Any, cast
from urllib.parse import urlparse

import boto3  # type: ignore[import-untyped]

from app.core.config import settings

TRANSCRIBE_BATCH_REGION = "ap-southeast-1"
BATCH_LANGUAGE_CODES = {"ms-MY": "ms-MY", "ta-IN": "ta-IN"}


def _transcribe_client() -> Any:
    return boto3.client("transcribe", region_name="ap-southeast-1")


def _s3_client() -> Any:
    return boto3.client("s3", region_name="ap-southeast-1")


def transcribe_language_code(language: str) -> str:
    try:
        return BATCH_LANGUAGE_CODES[language]
    except KeyError:
        raise ValueError(f"Unsupported batch language: {language}") from None


def start_batch_job(
    *,
    job_name: str,
    s3_uri: str,
    language_code: str,
    media_format: str,
) -> None:
    output_prefix = getattr(settings, "s3_transcribe_output_prefix", "transcribe-output").strip("/")
    _transcribe_client().start_transcription_job(
        TranscriptionJobName=job_name,
        LanguageCode=transcribe_language_code(language_code),
        Media={"MediaFileUri": s3_uri},
        MediaFormat=media_format,
        OutputBucketName=settings.s3_audio_bucket,
        OutputKey=f"{output_prefix}/{job_name}.json",
    )


def poll_until_done(
    job_name: str,
    max_wait_s: int = 120,
    interval_s: float = 1.5,
) -> str:
    deadline = time.monotonic() + max_wait_s
    client = _transcribe_client()

    while time.monotonic() < deadline:
        response = client.get_transcription_job(TranscriptionJobName=job_name)
        job = response["TranscriptionJob"]
        status = job["TranscriptionJobStatus"]
        if status == "COMPLETED":
            uri = job["Transcript"]["TranscriptFileUri"]
            return _transcript_text_from_payload(_fetch_transcript_payload(uri))
        if status == "FAILED":
            reason = job.get("FailureReason") or "Transcribe batch job failed"
            raise RuntimeError(reason)
        time.sleep(interval_s)

    raise TimeoutError("Transcribe batch job timed out")


def _fetch_transcript_payload(uri: str) -> dict[str, Any]:
    parsed = urlparse(uri)
    if parsed.scheme == "s3":
        response = _s3_client().get_object(
            Bucket=parsed.netloc,
            Key=parsed.path.lstrip("/"),
        )
        body = response["Body"].read()
    elif parsed.scheme in {"http", "https"}:
        with urllib.request.urlopen(uri, timeout=30) as response:  # noqa: S310
            body = response.read()
    else:
        raise RuntimeError("Unsupported Transcribe transcript URI scheme")
    return cast(dict[str, Any], json.loads(body.decode("utf-8")))


def _transcript_text_from_payload(payload: dict[str, Any]) -> str:
    transcripts = payload.get("results", {}).get("transcripts", [])
    if not transcripts:
        raise RuntimeError("Transcribe transcript was empty")
    transcript = cast(str, transcripts[0].get("transcript", "")).strip()
    if not transcript:
        raise RuntimeError("Transcribe transcript was empty")
    return transcript
