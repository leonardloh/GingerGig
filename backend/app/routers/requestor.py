from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import get_current_user
from app.deps.db import get_db
from app.models.booking import Booking as BookingModel
from app.models.listing import Listing as ListingModel
from app.models.listing import ListingMenuItem as ListingMenuItemModel
from app.models.user import User
from app.schemas.persona import Booking, CreateBookingPayload, Listing
from app.services.persona_queries import (
    booking_snapshot_fields,
    booking_to_response,
    listing_to_response,
    locale_expr,
    menu_items_for_listings,
    require_role,
)

router = APIRouter(prefix="/requestor", tags=["requestor"])


DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.get("/listings/search", response_model=list[Listing])
async def search_listings(
    db: DbDep,
    current_user: CurrentUserDep,
    query: str | None = None,
    max_distance_km: Annotated[str | None, Query()] = None,
    halal_only: bool = False,
    open_now: bool = False,
) -> list[Listing]:
    require_role(current_user, "requestor")

    title_expr = locale_expr(ListingModel, "title", current_user.locale, "title")
    match_reason_expr = locale_expr(
        ListingModel,
        "match_reason",
        current_user.locale,
        "matchReason",
    )
    stmt = (
        select(ListingModel, title_expr, match_reason_expr, User)
        .join(User, User.id == ListingModel.elder_id)
        .where(ListingModel.is_active.is_(True))
        .order_by(ListingModel.match_score.desc().nullslast(), ListingModel.rating.desc())
    )

    if halal_only:
        stmt = stmt.where(ListingModel.halal.is_(True))
    if query and (normalized_query := query.strip()):
        pattern = f"%{normalized_query}%"
        menu_item_match = (
            select(ListingMenuItemModel.id)
            .where(
                ListingMenuItemModel.listing_id == ListingModel.id,
                ListingMenuItemModel.name.ilike(pattern),
            )
            .exists()
        )
        stmt = stmt.where(
            or_(
                title_expr.ilike(pattern),
                ListingModel.title_ms.ilike(pattern),
                ListingModel.title_en.ilike(pattern),
                ListingModel.title_zh.ilike(pattern),
                ListingModel.title_ta.ilike(pattern),
                ListingModel.description.ilike(pattern),
                match_reason_expr.ilike(pattern),
                ListingModel.match_reason_ms.ilike(pattern),
                ListingModel.match_reason_en.ilike(pattern),
                ListingModel.match_reason_zh.ilike(pattern),
                ListingModel.match_reason_ta.ilike(pattern),
                User.name.ilike(pattern),
                User.area.ilike(pattern),
                ListingModel.distance_label.ilike(pattern),
                ListingModel.price_unit.ilike(pattern),
                cast(ListingModel.price, String).ilike(pattern),
                cast(ListingModel.price_max, String).ilike(pattern),
                menu_item_match,
            )
        )
    if open_now:
        # Seeded demo availability is day-level, not hour-level; keep active rows.
        pass

    result = await db.execute(stmt)
    rows = result.all()
    max_distance = _parse_max_distance(max_distance_km)
    if max_distance is not None:
        rows = [
            row
            for row in rows
            if (distance := _distance_label_to_km(row[0].distance_label)) is None
            or distance <= max_distance
        ]

    listing_ids: list[UUID] = [listing.id for listing, _title, _match_reason, _elder in rows]
    menu_by_listing = await menu_items_for_listings(db, listing_ids)
    return [
        listing_to_response(
            listing,
            title=title,
            menu=menu_by_listing.get(listing.id, []),
            elder=elder,
            match_reason=match_reason,
            locale=current_user.locale,
            include_match_fallback=True,
        )
        for listing, title, match_reason, elder in rows
    ]


@router.get("/bookings", response_model=list[Booking])
async def get_requestor_bookings(
    db: DbDep,
    current_user: CurrentUserDep,
) -> list[Booking]:
    require_role(current_user, "requestor")

    result = await db.execute(
        select(BookingModel)
        .where(BookingModel.requestor_user_id == current_user.id)
        .order_by(BookingModel.scheduled_at.desc(), BookingModel.created_at.desc())
    )
    return [booking_to_response(booking) for booking in result.scalars()]


@router.post("/bookings", response_model=Booking)
async def create_booking(
    payload: CreateBookingPayload,
    db: DbDep,
    current_user: CurrentUserDep,
) -> Booking:
    require_role(current_user, "requestor")

    title_expr = locale_expr(ListingModel, "title", current_user.locale, "title")
    result = await db.execute(
        select(ListingModel, title_expr, User)
        .join(User, User.id == ListingModel.elder_id)
        .where(
            ListingModel.id == payload.listingId,
            ListingModel.is_active.is_(True),
        )
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    listing, title, _elder = row
    menu_by_listing = await menu_items_for_listings(db, [listing.id])
    snapshot = booking_snapshot_fields(
        requestor=current_user,
        listing=listing,
        menu_items=menu_by_listing.get(listing.id, []),
        listing_title=title,
    )
    booking = BookingModel(
        id=uuid4(),
        requestor_user_id=current_user.id,
        listing_id=listing.id,
        status="pending",
        scheduled_at=payload.scheduledAt,
        notes=payload.notes,
        **snapshot,
    )
    db.add(booking)
    await db.flush()
    return booking_to_response(booking)


def _parse_max_distance(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _distance_label_to_km(value: str | None) -> float | None:
    if not value:
        return None
    normalized = value.strip().lower()
    try:
        if normalized.endswith("km"):
            return float(normalized.removesuffix("km").strip())
        if normalized.endswith("m"):
            return float(normalized.removesuffix("m").strip()) / 1000
    except ValueError:
        return None
    return None
