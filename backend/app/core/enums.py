from enum import StrEnum


class UserRole(StrEnum):
    elder = "elder"
    requestor = "requestor"
    companion = "companion"


class Locale(StrEnum):
    ms = "ms"
    en = "en"
    zh = "zh"
    ta = "ta"


class KycStatus(StrEnum):
    not_started = "not_started"
    pending = "pending"
    approved = "approved"
    failed = "failed"
    manual_review = "manual_review"


class BookingStatus(StrEnum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"


class ListingCategory(StrEnum):
    cat_cooking = "cat_cooking"
    cat_crafts = "cat_crafts"
    cat_pet = "cat_pet"
    cat_household = "cat_household"
    cat_other = "cat_other"


class PriceUnit(StrEnum):
    per_meal = "per_meal"
    per_hour = "per_hour"
    per_day = "per_day"
    per_month = "per_month"
    per_visit = "per_visit"
    per_piece = "per_piece"
    per_box = "per_box"


class AlertKind(StrEnum):
    care = "care"
    celebration = "celebration"


class AlertSeverity(StrEnum):
    info = "info"
    warning = "warning"
    critical = "critical"


class KycSessionStatus(StrEnum):
    not_started = "not_started"
    pending = "pending"
    approved = "approved"
    failed = "failed"
    manual_review = "manual_review"


class KycDecision(StrEnum):
    approved = "approved"
    failed = "failed"
    manual_review = "manual_review"


class VoiceLanguage(StrEnum):
    en_US = "en-US"
    zh_CN = "zh-CN"
    ms_MY = "ms-MY"
    ta_IN = "ta-IN"


class VoiceMode(StrEnum):
    stream = "stream"
    batch = "batch"


class VoiceSessionStatus(StrEnum):
    recording = "recording"
    transcribing = "transcribing"
    extracting = "extracting"
    ready = "ready"
    saved = "saved"
    failed = "failed"
