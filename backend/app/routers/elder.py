from datetime import UTC
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import get_current_user
from app.deps.db import get_db
from app.models.booking import Booking as BookingModel
from app.models.listing import Listing as ListingModel
from app.models.user import User
from app.schemas.persona import (
    Booking,
    BookingResponsePayload,
    EarningsSummary,
    Listing,
    ListingDetail,
    ListingPatch,
)
from app.services.persona_queries import (
    booking_to_response,
    listing_detail_to_response,
    listing_locale_select,
    listing_to_response,
    menu_items_for_listings,
    month_window_kl,
    require_companion_link,
    require_role,
    require_self,
    reviews_for_listing,
)

router = APIRouter(tags=["elder"])


DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.get("/elders/{elderId}/listings", response_model=list[Listing])
async def get_elder_listings(
    elderId: UUID,
    db: DbDep,
    current_user: CurrentUserDep,
) -> list[Listing]:
    require_role(current_user, "elder")
    require_self(current_user, elderId)

    result = await db.execute(
        listing_locale_select(current_user.locale)
        .where(ListingModel.elder_id == elderId)
        .order_by(ListingModel.created_at.desc())
    )


@router.get("/elders/{elderId}/bookings", response_model=list[Booking])
async def get_elder_bookings(
    elderId: UUID,
    db: DbDep,
    current_user: CurrentUserDep,
) -> list[Booking]:
    require_role(current_user, "elder")
    require_self(current_user, elderId)

    result = await db.execute(
        select(BookingModel)
        .join(ListingModel, ListingModel.id == BookingModel.listing_id)
        .where(ListingModel.elder_id == elderId)
        .order_by(BookingModel.scheduled_at.desc(), BookingModel.created_at.desc())
    )
    return [booking_to_response(booking) for booking in result.scalars()]


@router.post("/bookings/{bookingId}/respond", response_model=Booking)
async def respond_to_booking(
    bookingId: UUID,
    payload: BookingResponsePayload,
    db: DbDep,
    current_user: CurrentUserDep,
) -> Booking:
    require_role(current_user, "elder")

    result = await db.execute(
        select(BookingModel, ListingModel)
        .join(ListingModel, ListingModel.id == BookingModel.listing_id)
        .where(BookingModel.id == bookingId)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking, listing = row
    if str(listing.elder_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if booking.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking is no longer pending",
        )

    booking.status = "confirmed" if payload.action == "accept" else "cancelled"
    await db.flush()
    return booking_to_response(booking)


@router.get("/elders/{elderId}/earnings/summary", response_model=EarningsSummary)
async def get_elder_earnings_summary(
    elderId: UUID,
    db: DbDep,
    current_user: CurrentUserDep,
) -> EarningsSummary:
    require_role(current_user, "elder")
    require_self(current_user, elderId)

    lifetime_total_expr = func.coalesce(func.sum(BookingModel.amount), Decimal("0"))
    count_expr = func.count(BookingModel.id)
    totals = await db.execute(
        select(lifetime_total_expr, count_expr)
        .join(ListingModel, ListingModel.id == BookingModel.listing_id)
        .where(
            ListingModel.elder_id == elderId,
            BookingModel.status == "completed",
        )
    )
    lifetime_total, completed_count = totals.one()

    start_utc, end_utc = month_window_kl()
    month_total_result = await db.execute(
        select(func.coalesce(func.sum(BookingModel.amount), Decimal("0")))
        .join(ListingModel, ListingModel.id == BookingModel.listing_id)
        .where(
            ListingModel.elder_id == elderId,
            BookingModel.status == "completed",
            BookingModel.completed_at.is_not(None),
            BookingModel.completed_at >= start_utc.astimezone(UTC),
            BookingModel.completed_at < end_utc.astimezone(UTC),
        )
    )
    month_total = month_total_result.scalar_one()

    return EarningsSummary(
        monthTotal=float(month_total),
        lifetimeTotal=float(lifetime_total),
        completedCount=completed_count,
    )
    rows = result.all()
    menu_by_listing = await menu_items_for_listings(
        db,
        [listing.id for listing, _title, _match_reason in rows],
    )
    return [
        listing_to_response(
            listing,
            title=title,
            menu=menu_by_listing.get(listing.id, []),
            match_reason=match_reason,
            locale=current_user.locale,
        )
        for listing, title, match_reason in rows
    ]


@router.patch("/listings/{listingId}", response_model=Listing)
async def patch_listing(
    listingId: UUID,
    payload: ListingPatch,
    db: DbDep,
    current_user: CurrentUserDep,
) -> Listing:
    require_role(current_user, "elder")

    listing = await db.get(ListingModel, listingId)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if str(listing.elder_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    field_map = {
        "titleMs": "title_ms",
        "titleEn": "title_en",
        "titleZh": "title_zh",
        "titleTa": "title_ta",
        "description": "description",
        "price": "price",
        "priceMax": "price_max",
        "priceUnit": "price_unit",
        "category": "category",
        "halal": "halal",
        "days": "days",
        "isActive": "is_active",
    }
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(listing, field_map[field], value)

    await db.flush()
    result = await db.execute(
        listing_locale_select(current_user.locale).where(ListingModel.id == listingId)
    )
    row = result.one()
    refreshed_listing, title, match_reason = row
    menu_by_listing = await menu_items_for_listings(db, [listingId])
    return listing_to_response(
        refreshed_listing,
        title=title,
        menu=menu_by_listing.get(listingId, []),
        match_reason=match_reason,
        locale=current_user.locale,
    )


@router.get("/listings/{listingId}", response_model=ListingDetail)
async def get_listing_detail(
    listingId: UUID,
    db: DbDep,
    current_user: CurrentUserDep,
) -> ListingDetail:
    result = await db.execute(
        listing_locale_select(current_user.locale)
        .join(User, User.id == ListingModel.elder_id)
        .where(ListingModel.id == listingId)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    listing, title, match_reason = row
    if current_user.role == "requestor":
        if not listing.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found",
            )
    elif current_user.role == "elder":
        if str(listing.elder_id) != str(current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    elif current_user.role == "companion":
        await require_companion_link(db, current_user.id, listing.elder_id)
        if not listing.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found",
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    elder = await db.get(User, listing.elder_id)
    menu_by_listing = await menu_items_for_listings(db, [listingId])
    reviews = await reviews_for_listing(db, listingId)
    return listing_detail_to_response(
        listing,
        title=title,
        menu=menu_by_listing.get(listingId, []),
        elder=elder,
        reviews=reviews,
        match_reason=match_reason,
        locale=current_user.locale,
    )


