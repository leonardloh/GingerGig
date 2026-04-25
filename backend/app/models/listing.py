import uuid
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin


class Listing(Base, TimestampMixin):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint(
            "category IN ('cat_cooking','cat_crafts','cat_pet','cat_household','cat_other')",
            name="category_in_enum",
        ),
        CheckConstraint(
            "price_unit IN ('per_meal','per_hour','per_day','per_month','per_visit',"
            "'per_piece','per_box')",
            name="price_unit_in_enum",
        ),
        CheckConstraint("currency = 'MYR'", name="currency_myr"),
        CheckConstraint(
            "match_score IS NULL OR (match_score >= 0 AND match_score <= 100)",
            name="ck_listings_match_score_range",
        ),
        Index("ix_listings_elder_id", "elder_id"),
        Index(
            "ix_listings_category_active",
            "category",
            "is_active",
            postgresql_where=text("is_active"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    elder_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    title_ms: Mapped[str] = mapped_column(Text, nullable=False)
    title_en: Mapped[str] = mapped_column(Text, nullable=False)
    title_zh: Mapped[str | None] = mapped_column(Text)
    title_ta: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    price_max: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    price_unit: Mapped[str] = mapped_column(String(16), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="MYR")
    halal: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, server_default="0")
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    days: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default="{}")
    distance_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    match_reason_ms: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_reason_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_reason_zh: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_reason_ta: Mapped[str | None] = mapped_column(Text, nullable=True)


class ListingMenuItem(Base, TimestampMixin):
    __tablename__ = "listing_menu_items"
    __table_args__ = (
        Index(
            "ix_listing_menu_items_listing_id_sort_order",
            "listing_id",
            "sort_order",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0")
