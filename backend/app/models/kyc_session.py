import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class KycSession(Base, TimestampMixin):
    __tablename__ = "kyc_sessions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('not_started','pending','approved','failed','manual_review')",
            name="status_in_enum",
        ),
        CheckConstraint(
            "decision IS NULL OR decision IN ('approved','failed','manual_review')",
            name="decision_in_enum",
        ),
        Index(
            "ix_kyc_sessions_user_id_created_at",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_kyc_sessions_job_id",
            "job_id",
            postgresql_where=text("job_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ic_front_s3_key: Mapped[str | None] = mapped_column(Text)
    ic_back_s3_key: Mapped[str | None] = mapped_column(Text)
    selfie_s3_key: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="not_started")
    job_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True))
    ic_number: Mapped[str | None] = mapped_column(String(20))
    ic_name: Mapped[str | None] = mapped_column(String(120))
    ic_dob: Mapped[date | None] = mapped_column(Date)
    similarity_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    decision: Mapped[str | None] = mapped_column(String(16))
    decision_reason: Mapped[str | None] = mapped_column(Text)
    textract_raw: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    rekognition_raw: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
