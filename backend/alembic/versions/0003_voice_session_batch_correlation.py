"""voice session batch correlation columns.

Revision ID: 0003_voice_batch_correlation
Revises: 0002_listing_demo_match_fields
Create Date: 2026-04-26 01:13:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_voice_batch_correlation"
down_revision: str | None = "0002_listing_demo_match_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("voice_sessions", sa.Column("audio_s3_key", sa.Text(), nullable=True))
    op.add_column(
        "voice_sessions",
        sa.Column("transcribe_job_name", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("voice_sessions", "transcribe_job_name")
    op.drop_column("voice_sessions", "audio_s3_key")
