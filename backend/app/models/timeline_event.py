import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class TimelineEvent(Base, TimestampMixin):
    __tablename__ = "timeline_events"
    __table_args__ = (
        Index(
            "ix_timeline_events_elder_user_id_occurred_at",
            "elder_user_id",
            "occurred_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    elder_user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    relative_label: Mapped[str | None] = mapped_column(String(60))
    event_type: Mapped[str | None] = mapped_column(String(40))
    related_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True))
    text_ms: Mapped[str] = mapped_column(Text, nullable=False)
    text_en: Mapped[str] = mapped_column(Text, nullable=False)
    text_zh: Mapped[str] = mapped_column(Text, nullable=False)
    text_ta: Mapped[str] = mapped_column(Text, nullable=False)
