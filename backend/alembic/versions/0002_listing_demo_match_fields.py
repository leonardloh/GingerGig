"""listing demo match fields for DB-backed requestor cards.

Revision ID: 0002_listing_demo_match_fields
Revises: 0001_initial_schema
Create Date: 2026-04-25 16:35:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_listing_demo_match_fields"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("listings", sa.Column("distance_label", sa.Text(), nullable=True))
    op.add_column("listings", sa.Column("match_score", sa.SmallInteger(), nullable=True))
    op.add_column("listings", sa.Column("match_reason_ms", sa.Text(), nullable=True))
    op.add_column("listings", sa.Column("match_reason_en", sa.Text(), nullable=True))
    op.add_column("listings", sa.Column("match_reason_zh", sa.Text(), nullable=True))
    op.add_column("listings", sa.Column("match_reason_ta", sa.Text(), nullable=True))
    op.create_check_constraint(
        op.f("ck_listings_match_score_range"),
        "listings",
        "match_score IS NULL OR (match_score >= 0 AND match_score <= 100)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        sa.text(
            "ALTER TABLE listings DROP CONSTRAINT IF EXISTS ck_listings_match_score_range"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE listings DROP CONSTRAINT IF EXISTS "
            "ck_listings_ck_listings_match_score_range"
        )
    )
    op.drop_column("listings", "match_reason_ta")
    op.drop_column("listings", "match_reason_zh")
    op.drop_column("listings", "match_reason_en")
    op.drop_column("listings", "match_reason_ms")
    op.drop_column("listings", "match_score")
    op.drop_column("listings", "distance_label")
