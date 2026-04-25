"""D-17 #3: scripts.seed is idempotent across consecutive runs.

Canonical row snapshots remain unchanged and Siti's password_hash is preserved (D-08).
"""

# ruff: noqa: S608

import os

import bcrypt
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

pytestmark = pytest.mark.asyncio(loop_scope="session")

TABLES = [
    "users",
    "companion_links",
    "listings",
    "listing_menu_items",
    "bookings",
    "reviews",
    "companion_alerts",
    "companion_alert_preferences",
    "timeline_events",
]


async def _run_seed() -> None:
    os.environ["ALLOW_SEED"] = "1"
    database_url = os.environ.get("TEST_DATABASE_URL") or os.environ["DATABASE_URL"]
    if database_url.startswith("postgresql://"):
        database_url = "postgresql+asyncpg://" + database_url.removeprefix("postgresql://")
    os.environ["DATABASE_URL"] = database_url
    os.environ["TEST_DATABASE_URL"] = database_url
    from scripts import seed

    seed.settings = seed.settings.model_copy(
        update={"database_url": os.environ["DATABASE_URL"]}
    )
    rc = await seed.main()
    assert rc == 0, f"seed exit code {rc}"


async def _snapshot(engine: AsyncEngine) -> tuple[dict[str, str], str | None]:
    async with engine.connect() as conn:
        snapshots = {}
        for table in TABLES:
            snapshot_sql = text(
                "SELECT md5(COALESCE("
                "jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text, "
                "'[]')) "
                f"FROM {table} AS t"
            )
            snapshots[table] = (
                await conn.execute(snapshot_sql)
            ).scalar_one()
        siti_hash = (
            await conn.execute(
                text("SELECT password_hash FROM users WHERE email='siti@gingergig.my'")
            )
        ).scalar_one_or_none()
    return snapshots, siti_hash


async def test_seed_idempotent(engine: AsyncEngine) -> None:
    await _run_seed()
    snapshot1, hash1 = await _snapshot(engine)
    assert snapshot1["users"], "users snapshot hash is empty"
    async with engine.connect() as conn:
        users_count = (await conn.execute(text("SELECT COUNT(*) FROM users"))).scalar_one()
    assert users_count >= 8, (
        f"expected at least 8 users (3 demo + 5 providers), got {users_count}"
    )
    assert hash1 is not None, "siti@gingergig.my missing; Plan 05 seed not applied"

    await _run_seed()
    snapshot2, hash2 = await _snapshot(engine)
    assert snapshot1 == snapshot2, "canonical seed snapshots drifted across re-run"
    assert hash1 == hash2, "siti's password_hash changed across re-run"


async def test_seed_persists_listing_match_metadata(engine: AsyncEngine) -> None:
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT distance_label, match_score, match_reason_en
                    FROM listings
                    WHERE match_score IS NOT NULL
                      AND match_reason_en IS NOT NULL
                      AND distance_label IS NOT NULL
                    ORDER BY match_score DESC
                    LIMIT 1
                    """
                )
            )
        ).one_or_none()

    assert row is not None, "expected at least one seeded listing with match metadata"
    assert 0 <= row.match_score <= 100
    assert row.match_reason_en
    assert row.distance_label


async def test_demo_accounts_password_demo(engine: AsyncEngine) -> None:
    async with engine.connect() as conn:
        for email in ("siti@gingergig.my", "amir@gingergig.my", "faiz@gingergig.my"):
            password_hash = (
                await conn.execute(
                    text("SELECT password_hash FROM users WHERE email=:email"),
                    {"email": email},
                )
            ).scalar_one_or_none()
            assert password_hash is not None, f"{email} not seeded"
            assert bcrypt.checkpw(b"demo", password_hash.encode("ascii")), (
                f"{email} password_hash does not verify against 'demo'"
            )
