import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','confirmed','completed','cancelled')",
            name="status_in_enum",
        ),
        CheckConstraint("currency = 'MYR'", name="currency_myr"),
        Index("ix_bookings_listing_id_status", "listing_id", "status"),
        Index(
            "ix_bookings_requestor_user_id_status",
            "requestor_user_id",
            "status",
        ),
        Index(
            "ix_bookings_completed_at",
            "completed_at",
            postgresql_where=text("status = 'completed'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="RESTRICT"),
        nullable=False,
    )
    requestor_user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    requestor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    requestor_initials: Mapped[str] = mapped_column(String(4), nullable=False)
    requestor_avatar_url: Mapped[str | None] = mapped_column(Text)
    listing_title: Mapped[str] = mapped_column(Text, nullable=False)
    quantity_label: Mapped[str] = mapped_column(String(60), nullable=False)
    item_description: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="MYR")
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
