import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

VoiceLanguage = Literal["ms-MY", "ta-IN", "en-US", "zh-CN"]
StreamingVoiceLanguage = Literal["en-US", "zh-CN"]
BatchVoiceLanguage = Literal["ms-MY", "ta-IN"]


class ListingDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    service_offer: str
    category: Literal[
        "home_cooking",
        "traditional_crafts",
        "pet_sitting",
        "household_help",
        "other",
    ]
    price_amount: float | None = None
    price_unit: Literal["per_meal", "per_hour", "per_day", "per_month"] | None = None
    capacity: int | None = None
    dietary_tags: list[str]
    location_hint: str | None = None
    language: VoiceLanguage

    @field_validator("price_amount", mode="before")
    @classmethod
    def coerce_price_amount(cls, value: object) -> object:
        if value is None or isinstance(value, int | float):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None
            match = re.search(r"[-+]?\d+(?:[.,]\d+)?", stripped)
            if match is None:
                return value
            return float(match.group(0).replace(",", "."))
        return value


class VoiceBatchRequest(BaseModel):
    s3Key: str
    language: BatchVoiceLanguage


class AudioUploadUrlRequest(BaseModel):
    contentType: str
    language: BatchVoiceLanguage


class AudioUploadUrlResponse(BaseModel):
    uploadUrl: str
    s3Key: str
    expiresIn: int


class VoiceBatchSubmitResponse(BaseModel):
    jobId: UUID | str
    status: Literal["pending"] = "pending"
    estimatedSeconds: int = 10


class VoiceBatchStatusResponse(BaseModel):
    jobId: UUID | str
    status: Literal["pending", "transcribing", "extracting", "ready", "failed"]
    estimatedSeconds: int | None = None
    listing: ListingDraft | None = None
    message: str | None = None


class VoiceStreamHandshake(BaseModel):
    language: StreamingVoiceLanguage


class VoiceStreamPartialMessage(BaseModel):
    type: Literal["partial"] = "partial"
    text: str


class VoiceStreamFinalMessage(BaseModel):
    type: Literal["final"] = "final"
    listing: ListingDraft
