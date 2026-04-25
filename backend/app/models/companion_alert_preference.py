import uuid

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class CompanionAlertPreference(Base, TimestampMixin):
    __tablename__ = "companion_alert_preferences"

    companion_user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    elder_user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    inactivity_24h: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    overwork_signals: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    earnings_milestones: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true",
    )
    new_bookings: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    reviews: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
