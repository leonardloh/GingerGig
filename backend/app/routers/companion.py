from datetime import UTC
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import get_current_user
from app.deps.db import get_db
from app.models.booking import Booking as BookingModel
from app.models.companion_alert import CompanionAlert as CompanionAlertModel
from app.models.listing import Listing as ListingModel
from app.models.user import User
from app.schemas.persona import CompanionAlert, CompanionDashboard
from app.services.persona_queries import (
    initials,
    last_7_days_window_kl,
    locale_expr,
    require_companion_link,
    require_role,
)

router = APIRouter(prefix="/companions", tags=["companion"])


DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.get("/elders/{elderId}/dashboard", response_model=CompanionDashboard)
async def get_companion_dashboard(
    elderId: UUID,
    db: DbDep,
    current_user: CurrentUserDep,
) -> JSONResponse:
    require_role(current_user, "companion")
    await require_companion_link(db, current_user.id, elderId)

    elder = await db.get(User, elderId)
    if elder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")

    start_utc, end_utc = last_7_days_window_kl()
    weekly_earnings_result = await db.execute(
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
    weekly_earnings = weekly_earnings_result.scalar_one()

    active_days_result = await db.execute(
        select(
            func.count(
                func.distinct(
                    func.date(func.timezone("Asia/Kuala_Lumpur", BookingModel.scheduled_at))
                )
            )
        )
        .join(ListingModel, ListingModel.id == BookingModel.listing_id)
        .where(
            ListingModel.elder_id == elderId,
            BookingModel.status.in_(("confirmed", "completed")),
            BookingModel.scheduled_at >= start_utc.astimezone(UTC),
            BookingModel.scheduled_at < end_utc.astimezone(UTC),
        )
    )
    active_days = active_days_result.scalar_one()

    completed_bookings_result = await db.execute(
        select(func.count(BookingModel.id))
        .join(ListingModel, ListingModel.id == BookingModel.listing_id)
        .where(
            ListingModel.elder_id == elderId,
            BookingModel.status == "completed",
        )
    )
    completed_bookings = completed_bookings_result.scalar_one()

    dashboard = {
        "status": "Active this week",
        "weeklyEarnings": float(weekly_earnings),
        "activeDays": active_days,
        "completedBookings": completed_bookings,
        "elder": {
            "id": str(elder.id),
            "name": elder.name,
            "initials": _demo_elder_initials(elder.name),
            "area": elder.area,
            "portraitUrl": elder.avatar_url,
        },
    }
    return JSONResponse(content=jsonable_encoder(dashboard))


def _demo_elder_initials(name: str) -> str:
    if name == "Makcik Siti":
        return "SH"
    return initials(name)


@router.get("/elders/{elderId}/alerts", response_model=list[CompanionAlert])
async def get_companion_alerts(
    elderId: UUID,
    db: DbDep,
    current_user: CurrentUserDep,
) -> list[CompanionAlert]:
    require_role(current_user, "companion")
    await require_companion_link(db, current_user.id, elderId)

    title_expr = locale_expr(CompanionAlertModel, "title", current_user.locale, "title")
    message_expr = locale_expr(CompanionAlertModel, "text", current_user.locale, "message")
    result = await db.execute(
        select(CompanionAlertModel, title_expr, message_expr)
        .where(CompanionAlertModel.elder_user_id == elderId)
        .order_by(CompanionAlertModel.created_at.desc())
    )
    return [
        CompanionAlert(
            id=str(alert.id),
            type=_alert_type(alert.kind, alert.severity),
            title=title,
            message=message,
            createdAt=alert.created_at,
        )
        for alert, title, message in result.all()
    ]


def _alert_type(kind: str, severity: str) -> str:
    if kind in {"celebration", "success"} or severity == "success":
        return "celebration"
    return "care"
