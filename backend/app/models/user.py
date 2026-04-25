import uuid

from sqlalchemy import CheckConstraint, Index, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('elder','requestor','companion')",
            name="role_in_enum",
        ),
        CheckConstraint(
            "locale IN ('ms','en','zh','ta')",
            name="locale_in_enum",
        ),
        CheckConstraint(
            "kyc_status IN ('not_started','pending','approved','failed','manual_review')",
            name="kyc_status_in_enum",
        ),
        Index("ix_users_role", "role"),
        Index("ix_users_locale", "locale"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    locale: Mapped[str] = mapped_column(String(2), nullable=False, server_default="en")
    kyc_status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default="not_started",
    )
    area: Mapped[str | None] = mapped_column(String(120))
    age: Mapped[int | None] = mapped_column(SmallInteger)
    avatar_url: Mapped[str | None] = mapped_column(Text)
