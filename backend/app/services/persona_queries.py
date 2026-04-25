from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, datetime, time, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.models.booking import Booking as BookingModel
from app.models.companion_link import CompanionLink
from app.models.listing import Listing as ListingModel
from app.models.listing import ListingMenuItem as ListingMenuItemModel
from app.models.review import Review as ReviewModel
from app.models.user import User
from app.schemas.persona import Booking, Listing, ListingDetail, MenuItem, Review

KL_TZ = ZoneInfo("Asia/Kuala_Lumpur")
VALID_LOCALES = {"ms", "en", "zh", "ta"}


def locale_column(model: Any, stem: str, locale: str) -> ColumnElement[str]:
    normalized_locale = locale if locale in VALID_LOCALES else "en"
    columns = _locale_columns(model, stem)
    return columns.get(normalized_locale, columns["en"])


def locale_expr(
    model: Any,
    stem: str,
    locale: str,
    label: str | None = None,
) -> ColumnElement[str]:
    english_column = locale_column(model, stem, "en")
    return func.coalesce(locale_column(model, stem, locale), english_column).label(label or stem)


def initials(name: str) -> str:
    parts = [part for part in name.split() if part]
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0][:2].upper()
    return "".join(part[0] for part in parts[:2]).upper()


def require_role(user: User, role: str) -> None:
    if user.role != role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def require_self(user: User, user_id: uuid.UUID) -> None:
    if str(user.id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


async def require_companion_link(
    db: AsyncSession,
    companion_id: uuid.UUID,
    elder_id: uuid.UUID,
) -> None:
    result = await db.execute(
        select(CompanionLink).where(
            CompanionLink.companion_user_id == companion_id,
            CompanionLink.elder_user_id == elder_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


async def menu_items_for_listings(
    db: AsyncSession,
    listing_ids: list[uuid.UUID],
) -> dict[uuid.UUID, list[MenuItem]]:
    if not listing_ids:
        return {}

    result = await db.execute(
        select(ListingMenuItemModel)
        .where(ListingMenuItemModel.listing_id.in_(listing_ids))
        .order_by(ListingMenuItemModel.listing_id, ListingMenuItemModel.sort_order)
    )
    by_listing: dict[uuid.UUID, list[MenuItem]] = defaultdict(list)
    for item in result.scalars():
        by_listing[item.listing_id].append(
            MenuItem(id=str(item.id), name=item.name, price=item.price)
        )
    return dict(by_listing)


async def reviews_for_listing(db: AsyncSession, listing_id: uuid.UUID) -> list[Review]:
    result = await db.execute(
        select(ReviewModel)
        .where(ReviewModel.listing_id == listing_id)
        .order_by(ReviewModel.created_at.desc())
    )
    return [
        Review(
            id=str(review.id),
            reviewerName=review.author_name,
            rating=review.rating,
            comment=review.body,
            createdAt=review.created_at,
        )
        for review in result.scalars()
    ]


def booking_to_response(booking: BookingModel) -> Booking:
    return Booking(
        id=str(booking.id),
        listingId=str(booking.listing_id),
        requestorName=booking.requestor_name,
        requestorInitials=booking.requestor_initials,
        requestorAvatarUrl=booking.requestor_avatar_url,
        listingTitle=booking.listing_title,
        qty=booking.quantity_label,
        itemDescription=booking.item_description or booking.listing_title,
        status=booking.status,
        amount=booking.amount,
        currency=booking.currency,
        scheduledAt=booking.scheduled_at,
        notes=booking.notes,
    )


def listing_to_response(
    listing: ListingModel,
    *,
    title: str | None = None,
    menu: list[MenuItem] | None = None,
    elder: User | None = None,
    match_reason: str | None = None,
    locale: str = "en",
    include_match_fallback: bool = False,
) -> Listing:
    resolved_match_score = listing.match_score
    resolved_match_reason = match_reason
    if include_match_fallback:
        resolved_match_score = resolved_match_score or fallback_match_score(
            listing.rating,
            listing.distance_label,
        )
        resolved_match_reason = resolved_match_reason or fallback_match_reason(locale)

    return Listing(
        id=str(listing.id),
        elderId=str(listing.elder_id),
        title=title or listing.title_en,
        description=listing.description,
        price=listing.price,
        priceMax=listing.price_max,
        priceUnit=listing.price_unit,
        currency=listing.currency,
        category=listing.category,
        rating=listing.rating,
        reviewCount=listing.review_count,
        halal=listing.halal,
        isActive=listing.is_active,
        days=listing.days,
        menu=menu or [],
        titleMs=listing.title_ms,
        titleEn=listing.title_en,
        titleZh=listing.title_zh,
        titleTa=listing.title_ta,
        elderName=elder.name if elder else None,
        elderInitials=initials(elder.name) if elder else None,
        elderArea=elder.area if elder else None,
        elderPortraitUrl=elder.avatar_url if elder else None,
        distance=listing.distance_label,
        matchScore=resolved_match_score,
        matchReason=resolved_match_reason,
    )


def listing_detail_to_response(
    listing: ListingModel,
    *,
    title: str | None = None,
    menu: list[MenuItem] | None = None,
    elder: User | None = None,
    reviews: list[Review] | None = None,
    match_reason: str | None = None,
    locale: str = "en",
) -> ListingDetail:
    listing_response = listing_to_response(
        listing,
        title=title,
        menu=menu,
        elder=elder,
        match_reason=match_reason,
        locale=locale,
        include_match_fallback=True,
    )
    return ListingDetail(**listing_response.model_dump(), reviews=reviews or [])


def booking_snapshot_fields(
    *,
    requestor: User,
    listing: ListingModel,
    menu_items: list[MenuItem],
    listing_title: str | None = None,
) -> dict[str, object]:
    first_item = menu_items[0] if menu_items else None
    quantity_label = "1 portion" if listing.price_unit in {"per_meal", "per_box"} else "1 booking"
    item_description = first_item.name if first_item else (listing_title or listing.title_en)
    amount = first_item.price if first_item else listing.price

    return {
        "requestor_name": requestor.name,
        "requestor_initials": initials(requestor.name),
        "requestor_avatar_url": requestor.avatar_url,
        "listing_title": listing_title or listing.title_en,
        "quantity_label": quantity_label,
        "item_description": item_description,
        "amount": amount,
        "currency": listing.currency,
    }


def month_window_kl(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = (now or datetime.now(UTC)).astimezone(KL_TZ)
    start_local = datetime.combine(current.date().replace(day=1), time.min, tzinfo=KL_TZ)
    if start_local.month == 12:
        end_local = start_local.replace(year=start_local.year + 1, month=1)
    else:
        end_local = start_local.replace(month=start_local.month + 1)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def last_7_days_window_kl(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = (now or datetime.now(UTC)).astimezone(KL_TZ)
    end_local = datetime.combine(current.date() + timedelta(days=1), time.min, tzinfo=KL_TZ)
    start_local = end_local - timedelta(days=7)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def fallback_match_score(rating: Decimal | float | int, distance_label: str | None) -> int:
    score = min(95, max(50, int(float(rating) * 18)))
    if distance_label:
        if distance_label.endswith("m"):
            score += 5
        elif distance_label.startswith("1."):
            score += 3
    return min(score, 100)


def fallback_match_reason(locale: str) -> str:
    reasons = {
        "ms": "Highly rated nearby provider with availability that matches your search.",
        "en": "Highly rated nearby provider with availability that matches your search.",
        "zh": "Highly rated nearby provider with availability that matches your search.",
        "ta": "Highly rated nearby provider with availability that matches your search.",
    }
    return reasons.get(locale, reasons["en"])


def listing_locale_select(locale: str) -> Select[tuple[ListingModel, str, str | None]]:
    return select(
        ListingModel,
        locale_expr(ListingModel, "title", locale, "title"),
        locale_expr(ListingModel, "match_reason", locale, "matchReason"),
    )


def _locale_columns(model: Any, stem: str) -> dict[str, ColumnElement[str]]:
    if stem == "title":
        return {
            "ms": model.title_ms,
            "en": model.title_en,
            "zh": model.title_zh,
            "ta": model.title_ta,
        }
    if stem == "text":
        return {
            "ms": model.text_ms,
            "en": model.text_en,
            "zh": model.text_zh,
            "ta": model.text_ta,
        }
    if stem == "match_reason":
        return {
            "ms": model.match_reason_ms,
            "en": model.match_reason_en,
            "zh": model.match_reason_zh,
            "ta": model.match_reason_ta,
        }
    raise ValueError(f"Unsupported locale stem: {stem}")
