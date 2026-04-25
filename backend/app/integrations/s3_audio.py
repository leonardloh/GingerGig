import uuid
from typing import Any, cast

import boto3  # type: ignore[import-untyped]
from botocore.config import Config  # type: ignore[import-untyped]
from botocore.exceptions import ClientError  # type: ignore[import-untyped]

from app.core.config import settings


class AudioObjectNotFoundError(Exception):
    """Raised when a submitted audio key does not exist in S3."""


class AudioObjectContentTypeError(Exception):
    """Raised when submitted audio metadata does not match the upload policy."""


def _s3_client() -> Any:
    kwargs: dict[str, Any] = {
        "region_name": "ap-southeast-1",
        "config": Config(signature_version="s3v4"),
    }
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", **kwargs)


def build_audio_key_elder(*, elder_id: uuid.UUID, ext: str) -> str:
    normalized_ext = ext.lower().lstrip(".")
    if not normalized_ext.isascii() or not normalized_ext.isalnum():
        normalized_ext = "wav"
    return f"elders/{elder_id}/voice/{uuid.uuid4().hex}.{normalized_ext}"


def presign_put_audio(
    *,
    key: str,
    content_type: str,
    expires_in: int = 3600,
) -> dict[str, str | int]:
    if not settings.s3_audio_bucket:
        raise RuntimeError("S3_AUDIO_BUCKET is not configured")

    upload_url = cast(
        str,
        _s3_client().generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.s3_audio_bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
            HttpMethod="PUT",
        ),
    )
    return {"uploadUrl": upload_url, "s3Key": key, "expiresIn": expires_in}


def head_audio_object(key: str) -> dict[str, Any]:
    if not settings.s3_audio_bucket:
        raise RuntimeError("S3_AUDIO_BUCKET is not configured")

    try:
        response = _s3_client().head_object(Bucket=settings.s3_audio_bucket, Key=key)
    except ClientError as exc:
        error_code = str(exc.response.get("Error", {}).get("Code", ""))
        if error_code in {"404", "NoSuchKey", "NotFound"}:
            raise AudioObjectNotFoundError("Audio upload not found") from exc
        raise
    return cast(dict[str, Any], response)


def validate_audio_object(
    *,
    key: str,
    allowed_content_types: set[str],
) -> str:
    metadata = head_audio_object(key)
    content_type = metadata.get("ContentType")
    if not isinstance(content_type, str) or content_type not in allowed_content_types:
        raise AudioObjectContentTypeError("Unsupported content type")
    return content_type
