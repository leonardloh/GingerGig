"""initial schema — all 11 tables for Phase 1.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-25 15:15:00.000000

Tables (in FK dependency order): users, companion_links, listings,
listing_menu_items, bookings, reviews, companion_alerts,
companion_alert_preferences, timeline_events, kyc_sessions, voice_sessions.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamp_columns() -> tuple[sa.Column, sa.Column]:
    return (
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table("users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("password_hash", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("locale", sa.String(length=2), server_default="en", nullable=False),
        sa.Column(
            "kyc_status",
            sa.String(length=16),
            server_default="not_started",
            nullable=False,
        ),
        sa.Column("area", sa.String(length=120), nullable=True),
        sa.Column("age", sa.SmallInteger(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        *timestamp_columns(),
        sa.CheckConstraint(
            "role IN ('elder','requestor','companion')",
            name=op.f("ck_users_role_in_enum"),
        ),
        sa.CheckConstraint(
            "locale IN ('ms','en','zh','ta')",
            name=op.f("ck_users_locale_in_enum"),
        ),
        sa.CheckConstraint(
            "kyc_status IN ('not_started','pending','approved','failed','manual_review')",
            name=op.f("ck_users_kyc_status_in_enum"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_index("ix_users_role", "users", ["role"], unique=False)
    op.create_index("ix_users_locale", "users", ["locale"], unique=False)

    op.create_table("companion_links",
        sa.Column("companion_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("elder_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relationship", sa.String(length=40), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["companion_user_id"],
            ["users.id"],
            name=op.f("fk_companion_links_companion_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["elder_user_id"],
            ["users.id"],
            name=op.f("fk_companion_links_elder_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "companion_user_id",
            "elder_user_id",
            name=op.f("pk_companion_links"),
        ),
    )
    op.create_index(
        "ix_companion_links_elder_user_id",
        "companion_links",
        ["elder_user_id"],
        unique=False,
    )

    op.create_table("listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("elder_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("title_ms", sa.Text(), nullable=False),
        sa.Column("title_en", sa.Text(), nullable=False),
        sa.Column("title_zh", sa.Text(), nullable=True),
        sa.Column("title_ta", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("price_max", sa.Numeric(10, 2), nullable=True),
        sa.Column("price_unit", sa.String(length=16), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="MYR", nullable=False),
        sa.Column("halal", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("rating", sa.Numeric(3, 2), server_default="0", nullable=False),
        sa.Column("review_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "days",
            postgresql.ARRAY(sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            "category IN ('cat_cooking','cat_crafts','cat_pet','cat_household','cat_other')",
            name=op.f("ck_listings_category_in_enum"),
        ),
        sa.CheckConstraint(
            "price_unit IN ('per_meal','per_hour','per_day','per_month','per_visit',"
            "'per_piece','per_box')",
            name=op.f("ck_listings_price_unit_in_enum"),
        ),
        sa.CheckConstraint("currency = 'MYR'", name=op.f("ck_listings_currency_myr")),
        sa.ForeignKeyConstraint(
            ["elder_id"],
            ["users.id"],
            name=op.f("fk_listings_elder_id_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_listings")),
    )
    op.create_index("ix_listings_elder_id", "listings", ["elder_id"], unique=False)
    op.create_index(
        "ix_listings_category_active",
        "listings",
        ["category", "is_active"],
        unique=False,
        postgresql_where=sa.text("is_active"),
    )

    op.create_table("listing_menu_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("sort_order", sa.SmallInteger(), server_default="0", nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["listing_id"],
            ["listings.id"],
            name=op.f("fk_listing_menu_items_listing_id_listings"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_listing_menu_items")),
    )
    op.create_index(
        "ix_listing_menu_items_listing_id_sort_order",
        "listing_menu_items",
        ["listing_id", "sort_order"],
        unique=False,
    )

    op.create_table("bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requestor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requestor_name", sa.String(length=120), nullable=False),
        sa.Column("requestor_initials", sa.String(length=4), nullable=False),
        sa.Column("requestor_avatar_url", sa.Text(), nullable=True),
        sa.Column("listing_title", sa.Text(), nullable=False),
        sa.Column("quantity_label", sa.String(length=60), nullable=False),
        sa.Column("item_description", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="MYR", nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
        sa.CheckConstraint(
            "status IN ('pending','confirmed','completed','cancelled')",
            name=op.f("ck_bookings_status_in_enum"),
        ),
        sa.CheckConstraint("currency = 'MYR'", name=op.f("ck_bookings_currency_myr")),
        sa.ForeignKeyConstraint(
            ["listing_id"],
            ["listings.id"],
            name=op.f("fk_bookings_listing_id_listings"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["requestor_user_id"],
            ["users.id"],
            name=op.f("fk_bookings_requestor_user_id_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bookings")),
    )
    op.create_index(
        "ix_bookings_listing_id_status",
        "bookings",
        ["listing_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_bookings_requestor_user_id_status",
        "bookings",
        ["requestor_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_bookings_completed_at",
        "bookings",
        ["completed_at"],
        unique=False,
        postgresql_where=sa.text("status = 'completed'"),
    )

    op.create_table("reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("author_name", sa.String(length=120), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("relative_date", sa.String(length=40), nullable=True),
        *timestamp_columns(),
        sa.CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name=op.f("ck_reviews_rating_range"),
        ),
        sa.ForeignKeyConstraint(
            ["author_user_id"],
            ["users.id"],
            name=op.f("fk_reviews_author_user_id_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["booking_id"],
            ["bookings.id"],
            name=op.f("fk_reviews_booking_id_bookings"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["listing_id"],
            ["listings.id"],
            name=op.f("fk_reviews_listing_id_listings"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reviews")),
    )
    op.create_index(
        "ix_reviews_listing_id_created_at",
        "reviews",
        ["listing_id", "created_at"],
        unique=False,
    )

    op.create_table("companion_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("elder_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("severity", sa.String(length=16), server_default="info", nullable=False),
        sa.Column("title_ms", sa.Text(), nullable=False),
        sa.Column("title_en", sa.Text(), nullable=False),
        sa.Column("title_zh", sa.Text(), nullable=False),
        sa.Column("title_ta", sa.Text(), nullable=False),
        sa.Column("text_ms", sa.Text(), nullable=False),
        sa.Column("text_en", sa.Text(), nullable=False),
        sa.Column("text_zh", sa.Text(), nullable=False),
        sa.Column("text_ta", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
        sa.CheckConstraint(
            "kind IN ('care','celebration')",
            name=op.f("ck_companion_alerts_kind_in_enum"),
        ),
        sa.CheckConstraint(
            "severity IN ('info','warning','critical')",
            name=op.f("ck_companion_alerts_severity_in_enum"),
        ),
        sa.ForeignKeyConstraint(
            ["elder_user_id"],
            ["users.id"],
            name=op.f("fk_companion_alerts_elder_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_companion_alerts")),
    )
    op.create_index(
        "ix_companion_alerts_elder_user_id_created_at",
        "companion_alerts",
        ["elder_user_id", "created_at"],
        unique=False,
    )

    op.create_table("companion_alert_preferences",
        sa.Column("companion_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("elder_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inactivity_24h", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("overwork_signals", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("earnings_milestones", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("new_bookings", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("reviews", sa.Boolean(), server_default="true", nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["companion_user_id"],
            ["users.id"],
            name=op.f("fk_companion_alert_preferences_companion_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["elder_user_id"],
            ["users.id"],
            name=op.f("fk_companion_alert_preferences_elder_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "companion_user_id",
            "elder_user_id",
            name=op.f("pk_companion_alert_preferences"),
        ),
    )

    op.create_table("timeline_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("elder_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("relative_label", sa.String(length=60), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=True),
        sa.Column("related_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("text_ms", sa.Text(), nullable=False),
        sa.Column("text_en", sa.Text(), nullable=False),
        sa.Column("text_zh", sa.Text(), nullable=False),
        sa.Column("text_ta", sa.Text(), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["elder_user_id"],
            ["users.id"],
            name=op.f("fk_timeline_events_elder_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_timeline_events")),
    )
    op.create_index(
        "ix_timeline_events_elder_user_id_occurred_at",
        "timeline_events",
        ["elder_user_id", "occurred_at"],
        unique=False,
    )

    op.create_table("kyc_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ic_front_s3_key", sa.Text(), nullable=True),
        sa.Column("ic_back_s3_key", sa.Text(), nullable=True),
        sa.Column("selfie_s3_key", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), server_default="not_started", nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ic_number", sa.String(length=20), nullable=True),
        sa.Column("ic_name", sa.String(length=120), nullable=True),
        sa.Column("ic_dob", sa.Date(), nullable=True),
        sa.Column("similarity_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 2), nullable=True),
        sa.Column("decision", sa.String(length=16), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("textract_raw", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("rekognition_raw", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
        sa.CheckConstraint(
            "status IN ('not_started','pending','approved','failed','manual_review')",
            name=op.f("ck_kyc_sessions_status_in_enum"),
        ),
        sa.CheckConstraint(
            "decision IS NULL OR decision IN ('approved','failed','manual_review')",
            name=op.f("ck_kyc_sessions_decision_in_enum"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_kyc_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_kyc_sessions")),
    )
    op.create_index(
        "ix_kyc_sessions_user_id_created_at",
        "kyc_sessions",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_kyc_sessions_job_id",
        "kyc_sessions",
        ["job_id"],
        unique=False,
        postgresql_where=sa.text("job_id IS NOT NULL"),
    )

    op.create_table("voice_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("elder_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language", sa.String(length=8), nullable=False),
        sa.Column("mode", sa.String(length=8), nullable=False),
        sa.Column("status", sa.String(length=16), server_default="recording", nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("listing_draft", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        *timestamp_columns(),
        sa.CheckConstraint(
            "language IN ('en-US','zh-CN','ms-MY','ta-IN')",
            name=op.f("ck_voice_sessions_language_in_enum"),
        ),
        sa.CheckConstraint(
            "mode IN ('stream','batch')",
            name=op.f("ck_voice_sessions_mode_in_enum"),
        ),
        sa.CheckConstraint(
            "status IN ('recording','transcribing','extracting','ready','saved','failed')",
            name=op.f("ck_voice_sessions_status_in_enum"),
        ),
        sa.ForeignKeyConstraint(
            ["elder_id"],
            ["users.id"],
            name=op.f("fk_voice_sessions_elder_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_voice_sessions")),
    )
    op.create_index(
        "ix_voice_sessions_elder_id_created_at",
        "voice_sessions",
        ["elder_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("voice_sessions")
    op.drop_table("kyc_sessions")
    op.drop_table("timeline_events")
    op.drop_table("companion_alert_preferences")
    op.drop_table("companion_alerts")
    op.drop_table("reviews")
    op.drop_table("bookings")
    op.drop_table("listing_menu_items")
    op.drop_table("listings")
    op.drop_table("companion_links")
    op.drop_table("users")
