import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class CompanionAlert(Base, TimestampMixin):
    __tablename__ = "companion_alerts"
    __table_args__ = (
        CheckConstraint("kind IN ('care','celebration')", name="kind_in_enum"),
        CheckConstraint(
            "severity IN ('info','warning','critical')",
            name="severity_in_enum",
        ),
        Index(
            "ix_companion_alerts_elder_user_id_created_at",
            "elder_user_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    elder_user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, server_default="info")
    title_ms: Mapped[str] = mapped_column(Text, nullable=False)
    title_en: Mapped[str] = mapped_column(Text, nullable=False)
    title_zh: Mapped[str] = mapped_column(Text, nullable=False)
    title_ta: Mapped[str] = mapped_column(Text, nullable=False)
    text_ms: Mapped[str] = mapped_column(Text, nullable=False)
    text_en: Mapped[str] = mapped_column(Text, nullable=False)
    text_zh: Mapped[str] = mapped_column(Text, nullable=False)
    text_ta: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
