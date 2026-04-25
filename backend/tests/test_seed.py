"""D-17 #3: scripts.seed is idempotent across consecutive runs.

Row counts remain unchanged and Siti's password_hash is preserved (D-08).
"""

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


async def _snapshot(engine: AsyncEngine) -> tuple[dict[str, int], str | None]:
    async with engine.connect() as conn:
        counts = {}
        for table in TABLES:
            counts[table] = (
                await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            ).scalar_one()
        siti_hash = (
            await conn.execute(
                text("SELECT password_hash FROM users WHERE email='siti@gingergig.my'")
            )
        ).scalar_one_or_none()
    return counts, siti_hash


async def test_seed_idempotent(engine: AsyncEngine) -> None:
    counts1, hash1 = await _snapshot(engine)
    assert counts1["users"] >= 8, (
        f"expected at least 8 users (3 demo + 5 providers), got {counts1['users']}"
    )
    assert hash1 is not None, "siti@gingergig.my missing; Plan 05 seed not applied"

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

    counts2, hash2 = await _snapshot(engine)
    assert counts1 == counts2, f"row counts drifted: {counts1} -> {counts2}"
    assert hash1 == hash2, "siti's password_hash changed across re-run"


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
