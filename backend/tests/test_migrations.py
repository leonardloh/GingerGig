"""D-17 #2: the database is at head and contains all 11 Phase 1 tables."""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

pytestmark = pytest.mark.asyncio(loop_scope="session")

EXPECTED_TABLES = {
    "users",
    "companion_links",
    "listings",
    "listing_menu_items",
    "bookings",
    "reviews",
    "companion_alerts",
    "companion_alert_preferences",
    "timeline_events",
    "kyc_sessions",
    "voice_sessions",
}


async def test_alembic_upgrade_creates_all_tables(engine: AsyncEngine) -> None:
    """Plan 04 applied the migration; verify the current schema state."""
    async with engine.connect() as conn:
        rows = await conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        )
        tables = {row[0] for row in rows.fetchall()}
        revision = (
            await conn.execute(text("SELECT version_num FROM alembic_version"))
        ).scalar_one()

    missing = EXPECTED_TABLES - tables
    assert not missing, f"missing tables: {missing}; got: {tables}"
    assert revision == "0001_initial_schema", (
        f"expected revision 0001_initial_schema, got {revision}"
    )


async def test_timestamp_columns_are_timezone_aware(engine: AsyncEngine) -> None:
    """Every TimestampMixin column must be TIMESTAMPTZ, not a naive timestamp."""
    async with engine.connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT table_name, column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = ANY(:tables)
                  AND column_name IN ('created_at', 'updated_at')
                """
            ),
            {"tables": sorted(EXPECTED_TABLES)},
        )

    bad = [
        f"{row.table_name}.{row.column_name}={row.data_type}"
        for row in rows.fetchall()
        if row.data_type != "timestamp with time zone"
    ]
    assert not bad, f"timestamp columns must be TIMESTAMPTZ: {bad}"
