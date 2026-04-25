from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class MenuItem(BaseModel):
    id: str
    name: str
    price: Decimal | float


class Review(BaseModel):
    id: str
    reviewerName: str
    rating: int
    comment: str
    createdAt: datetime


class Listing(BaseModel):
    id: str
    elderId: str
    title: str
    description: str
    price: Decimal | float
    priceMax: Decimal | float | None = None
    priceUnit: str
    currency: str
    category: str
    rating: Decimal | float
    reviewCount: int
    halal: bool
    isActive: bool
    days: list[str]
    menu: list[MenuItem]
    titleMs: str | None = None
    titleEn: str | None = None
    titleZh: str | None = None
    titleTa: str | None = None
    elderName: str | None = None
    elderInitials: str | None = None
    elderArea: str | None = None
    elderPortraitUrl: str | None = None
    distance: str | None = None
    matchScore: int | None = None
    matchReason: str | None = None


class ListingDetail(Listing):
    reviews: list[Review]


class ListingPatch(BaseModel):
    titleMs: str | None = None
    titleEn: str | None = None
    titleZh: str | None = None
    titleTa: str | None = None
    description: str | None = None
    price: Decimal | float | None = None
    priceMax: Decimal | float | None = None
    priceUnit: str | None = None
    category: str | None = None
    halal: bool | None = None
    days: list[str] | None = None
    isActive: bool | None = None


class Booking(BaseModel):
    id: str
    listingId: str
    requestorName: str
    requestorInitials: str
    requestorAvatarUrl: str | None = None
    listingTitle: str
    qty: int
    itemDescription: str
    status: Literal["pending", "confirmed", "completed", "cancelled"]
    amount: Decimal | float
    currency: str
    scheduledAt: datetime
    notes: str | None = None


class BookingResponsePayload(BaseModel):
    action: Literal["accept", "decline"]


class CreateBookingPayload(BaseModel):
    listingId: str
    scheduledAt: datetime
    notes: str | None = None


class EarningsSummary(BaseModel):
    monthTotal: Decimal | float
    lifetimeTotal: Decimal | float
    completedCount: int


class CompanionElderSnapshot(BaseModel):
    id: str
    name: str
    initials: str
    area: str | None = None
    portraitUrl: str | None = None


class CompanionDashboard(BaseModel):
    status: str
    weeklyEarnings: EarningsSummary
    activeDays: int
    completedBookings: int
    elder: CompanionElderSnapshot


class CompanionAlert(BaseModel):
    id: str
    type: Literal["care", "celebration"]
    title: str
    message: str
    createdAt: datetime


class TimelineEvent(BaseModel):
    id: str
    eventType: str
    text: str
    time: str
    occurredAt: datetime
    relatedId: str | None = None


class AlertPreferences(BaseModel):
    inactivity24h: bool
    overworkSignals: bool
    earningsMilestones: bool
    newBookings: bool
    reviews: bool
