import uuid
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class VoiceSession(Base, TimestampMixin):
    __tablename__ = "voice_sessions"
    __table_args__ = (
        CheckConstraint(
            "language IN ('en-US','zh-CN','ms-MY','ta-IN')",
            name="language_in_enum",
        ),
        CheckConstraint("mode IN ('stream','batch')", name="mode_in_enum"),
        CheckConstraint(
            "status IN ('recording','transcribing','extracting','ready','saved','failed')",
            name="status_in_enum",
        ),
        Index(
            "ix_voice_sessions_elder_id_created_at",
            "elder_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    elder_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    language: Mapped[str] = mapped_column(String(8), nullable=False)
    mode: Mapped[str] = mapped_column(String(8), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="recording")
    transcript: Mapped[str | None] = mapped_column(Text)
    audio_s3_key: Mapped[str | None] = mapped_column(Text)
    transcribe_job_name: Mapped[str | None] = mapped_column(Text)
    listing_draft: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
