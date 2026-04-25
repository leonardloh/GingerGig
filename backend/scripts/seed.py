"""Idempotent seed for Phase 1 (DATA-06, DATA-07).

Refuses to run unless ALLOW_SEED=1 OR the DSN host is localhost (D-21).
Re-runs preserve existing users.password_hash (D-08).
"""

import asyncio
import os
import sys
from typing import Any
from urllib.parse import urlparse

import bcrypt
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.ids import entity_id
from app.db.session import build_engine, dispose_engine, get_sessionmaker
from app.models import (
    Booking,
    CompanionAlert,
    CompanionAlertPreference,
    CompanionLink,
    Listing,
    ListingMenuItem,
    Review,
    TimelineEvent,
    User,
)
from scripts import seed_data


class SeedRefusedError(RuntimeError):
    """Raised when seed.py is invoked against a non-localhost DSN without ALLOW_SEED=1."""


_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
_DEMO_USER_SLUGS = {u["slug"] for u in seed_data.DEMO_USERS}


def _check_safety(database_url: str) -> None:
    if os.environ.get("ALLOW_SEED") == "1":
        return
    normalized_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    host = urlparse(normalized_url).hostname or ""
    if host in _LOCAL_HOSTS:
        return
    raise SeedRefusedError(
        f"Refusing to seed against {host!r}; set ALLOW_SEED=1 to override "
        "(make seed already does this for you)."
    )


def _hash_password(plaintext: str) -> str:
    return bcrypt.hashpw(
        plaintext.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    ).decode("ascii")


def _user_id(slug: str) -> Any:
    if slug in _DEMO_USER_SLUGS:
        return entity_id("user", slug)
    return entity_id("user", f"provider-{slug}")


async def _seed_users(session: AsyncSession) -> None:
    rows: list[dict[str, Any]] = []
    for u in seed_data.DEMO_USERS:
        rows.append(
            {
                "id": entity_id("user", u["slug"]),
                "email": u["email"],
                "phone": u.get("phone"),
                "password_hash": _hash_password(u["password"]),
                "name": u["name"],
                "role": u["role"],
                "locale": u["locale"],
                "kyc_status": u.get("kyc_status", "not_started"),
                "area": u.get("area"),
                "age": u.get("age"),
                "avatar_url": u.get("avatar_url"),
            }
        )
    for p in seed_data.PROVIDERS:
        rows.append(
            {
                "id": entity_id("user", f"provider-{p['slug']}"),
                "email": p["email"],
                "phone": p.get("phone"),
                "password_hash": _hash_password("provider-no-login"),
                "name": p["name"],
                "role": "elder",
                "locale": p.get("locale", "ms"),
                "kyc_status": p.get("kyc_status", "approved"),
                "area": p.get("area"),
                "age": p.get("age"),
                "avatar_url": p.get("avatar_url"),
            }
        )

    stmt = pg_insert(User).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=[User.id],
        set_={
            "email": stmt.excluded.email,
            "phone": stmt.excluded.phone,
            "name": stmt.excluded.name,
            "role": stmt.excluded.role,
            "locale": stmt.excluded.locale,
            "kyc_status": stmt.excluded.kyc_status,
            "area": stmt.excluded.area,
            "age": stmt.excluded.age,
            "avatar_url": stmt.excluded.avatar_url,
        },
    )
    await session.execute(stmt)


async def _seed_companion_links(session: AsyncSession) -> None:
    rows = [
        {
            "companion_user_id": _user_id(lk["companion_slug"]),
            "elder_user_id": _user_id(lk["elder_slug"]),
            "relationship": lk.get("relationship"),
        }
        for lk in seed_data.COMPANION_LINKS
    ]
    if not rows:
        return

    stmt = pg_insert(CompanionLink).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=[CompanionLink.companion_user_id, CompanionLink.elder_user_id],
        set_={
            "relationship": stmt.excluded.relationship,
        },
    )
    await session.execute(stmt)


async def _seed_listings(session: AsyncSession) -> None:
    rows = [
        {
            "id": entity_id("listing", li["slug"]),
            "elder_id": _user_id(li["elder_slug"]),
            "category": li["category"],
            "title_ms": li["title_ms"],
            "title_en": li["title_en"],
            "title_zh": li.get("title_zh"),
            "title_ta": li.get("title_ta"),
            "description": li["description"],
            "price": li["price"],
            "price_max": li.get("price_max"),
            "price_unit": li["price_unit"],
            "currency": li.get("currency", "MYR"),
            "halal": li.get("halal", False),
            "rating": li.get("rating", 0),
            "review_count": li.get("review_count", 0),
            "is_active": li.get("is_active", True),
            "days": li.get("days", []),
        }
        for li in seed_data.LISTINGS
    ]
    if not rows:
        return

    stmt = pg_insert(Listing).values(rows)
    cols = [
        "elder_id",
        "category",
        "title_ms",
        "title_en",
        "title_zh",
        "title_ta",
        "description",
        "price",
        "price_max",
        "price_unit",
        "currency",
        "halal",
        "rating",
        "review_count",
        "is_active",
        "days",
    ]
    stmt = stmt.on_conflict_do_update(
        index_elements=[Listing.id],
        set_={c: stmt.excluded[c] for c in cols},
    )
    await session.execute(stmt)


async def _seed_listing_menu_items(session: AsyncSession) -> None:
    rows = [
        {
            "id": entity_id("menu_item", mi["slug"]),
            "listing_id": entity_id("listing", mi["listing_slug"]),
            "name": mi["name"],
            "price": mi["price"],
            "sort_order": mi.get("sort_order", 0),
        }
        for mi in seed_data.LISTING_MENU_ITEMS
    ]
    if not rows:
        return

    stmt = pg_insert(ListingMenuItem).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=[ListingMenuItem.id],
        set_={c: stmt.excluded[c] for c in ["listing_id", "name", "price", "sort_order"]},
    )
    await session.execute(stmt)


async def _seed_bookings(session: AsyncSession) -> None:
    rows = [
        {
            "id": entity_id("booking", bk["slug"]),
            "listing_id": entity_id("listing", bk["listing_slug"]),
            "requestor_user_id": _user_id(bk["requestor_slug"]),
            "requestor_name": bk["requestor_name"],
            "requestor_initials": bk["requestor_initials"],
            "requestor_avatar_url": bk.get("requestor_avatar_url"),
            "listing_title": bk["listing_title"],
            "quantity_label": bk["quantity_label"],
            "item_description": bk.get("item_description"),
            "notes": bk.get("notes"),
            "scheduled_at": bk["scheduled_at"],
            "amount": bk["amount"],
            "currency": bk.get("currency", "MYR"),
            "status": bk["status"],
            "completed_at": bk.get("completed_at"),
        }
        for bk in seed_data.BOOKINGS
    ]
    if not rows:
        return

    stmt = pg_insert(Booking).values(rows)
    cols = [
        "listing_id",
        "requestor_user_id",
        "requestor_name",
        "requestor_initials",
        "requestor_avatar_url",
        "listing_title",
        "quantity_label",
        "item_description",
        "notes",
        "scheduled_at",
        "amount",
        "currency",
        "status",
        "completed_at",
    ]
    stmt = stmt.on_conflict_do_update(
        index_elements=[Booking.id],
        set_={c: stmt.excluded[c] for c in cols},
    )
    await session.execute(stmt)


async def _seed_reviews(session: AsyncSession) -> None:
    rows = [
        {
            "id": entity_id("review", r["slug"]),
            "booking_id": (
                entity_id("booking", r["booking_slug"])
                if r.get("booking_slug")
                else None
            ),
            "listing_id": entity_id("listing", r["listing_slug"]),
            "author_user_id": _user_id(r["author_slug"]) if r.get("author_slug") else None,
            "author_name": r["author_name"],
            "rating": r["rating"],
            "body": r["body"],
            "relative_date": r.get("relative_date"),
        }
        for r in seed_data.REVIEWS
    ]
    if not rows:
        return

    stmt = pg_insert(Review).values(rows)
    cols = [
        "booking_id",
        "listing_id",
        "author_user_id",
        "author_name",
        "rating",
        "body",
        "relative_date",
    ]
    stmt = stmt.on_conflict_do_update(
        index_elements=[Review.id],
        set_={c: stmt.excluded[c] for c in cols},
    )
    await session.execute(stmt)


async def _seed_companion_alerts(session: AsyncSession) -> None:
    rows = [
        {
            "id": entity_id("alert", a["slug"]),
            "elder_user_id": _user_id(a["elder_slug"]),
            "kind": a["kind"],
            "severity": a.get("severity", "info"),
            "title_ms": a["title_ms"],
            "title_en": a["title_en"],
            "title_zh": a["title_zh"],
            "title_ta": a["title_ta"],
            "text_ms": a["text_ms"],
            "text_en": a["text_en"],
            "text_zh": a["text_zh"],
            "text_ta": a["text_ta"],
            "read_at": a.get("read_at"),
        }
        for a in seed_data.COMPANION_ALERTS
    ]
    if not rows:
        return

    stmt = pg_insert(CompanionAlert).values(rows)
    cols = [
        "elder_user_id",
        "kind",
        "severity",
        "title_ms",
        "title_en",
        "title_zh",
        "title_ta",
        "text_ms",
        "text_en",
        "text_zh",
        "text_ta",
        "read_at",
    ]
    stmt = stmt.on_conflict_do_update(
        index_elements=[CompanionAlert.id],
        set_={c: stmt.excluded[c] for c in cols},
    )
    await session.execute(stmt)


async def _seed_companion_alert_preferences(session: AsyncSession) -> None:
    rows = [
        {
            "companion_user_id": _user_id(p["companion_slug"]),
            "elder_user_id": _user_id(p["elder_slug"]),
            "inactivity_24h": p.get("inactivity_24h", True),
            "overwork_signals": p.get("overwork_signals", True),
            "earnings_milestones": p.get("earnings_milestones", True),
            "new_bookings": p.get("new_bookings", True),
            "reviews": p.get("reviews", True),
        }
        for p in seed_data.COMPANION_ALERT_PREFERENCES
    ]
    if not rows:
        return

    stmt = pg_insert(CompanionAlertPreference).values(rows)
    cols = [
        "inactivity_24h",
        "overwork_signals",
        "earnings_milestones",
        "new_bookings",
        "reviews",
    ]
    stmt = stmt.on_conflict_do_update(
        index_elements=[
            CompanionAlertPreference.companion_user_id,
            CompanionAlertPreference.elder_user_id,
        ],
        set_={c: stmt.excluded[c] for c in cols},
    )
    await session.execute(stmt)


async def _seed_timeline_events(session: AsyncSession) -> None:
    rows = [
        {
            "id": entity_id("timeline", t["slug"]),
            "elder_user_id": _user_id(t["elder_slug"]),
            "occurred_at": t["occurred_at"],
            "relative_label": t.get("relative_label"),
            "event_type": t.get("event_type"),
            "related_id": t.get("related_id"),
            "text_ms": t["text_ms"],
            "text_en": t["text_en"],
            "text_zh": t["text_zh"],
            "text_ta": t["text_ta"],
        }
        for t in seed_data.TIMELINE
    ]
    if not rows:
        return

    stmt = pg_insert(TimelineEvent).values(rows)
    cols = [
        "elder_user_id",
        "occurred_at",
        "relative_label",
        "event_type",
        "related_id",
        "text_ms",
        "text_en",
        "text_zh",
        "text_ta",
    ]
    stmt = stmt.on_conflict_do_update(
        index_elements=[TimelineEvent.id],
        set_={c: stmt.excluded[c] for c in cols},
    )
    await session.execute(stmt)


async def main() -> int:
    _check_safety(settings.database_url)

    engine = build_engine(settings)
    sm = get_sessionmaker(engine)
    try:
        async with sm() as session:
            async with session.begin():
                await _seed_users(session)
                await _seed_companion_links(session)
                await _seed_listings(session)
                await _seed_listing_menu_items(session)
                await _seed_bookings(session)
                await _seed_reviews(session)
                await _seed_companion_alerts(session)
                await _seed_companion_alert_preferences(session)
                await _seed_timeline_events(session)
    finally:
        await dispose_engine(engine)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
