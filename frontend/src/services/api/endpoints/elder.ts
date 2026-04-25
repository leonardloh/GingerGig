import { apiRequest } from "../http";
import type { Booking, BookingItem, EarningsSummary, ElderEarningsData, ElderListing, Listing } from "../types";

function formatCurrencyValue(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}

function formatMoney(amount: number | string, currency = "MYR"): string {
  const value = formatCurrencyValue(amount);
  return currency === "MYR" ? `RM${value}` : `${currency} ${value}`;
}

function formatPriceRange(listing: Listing): string {
  const min = formatMoney(listing.price, listing.currency);
  return listing.priceMax ? `${min}-${formatCurrencyValue(listing.priceMax)}` : min;
}

function formatBookingDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function adaptListing(listing: Listing): ElderListing {
  return {
    id: listing.id,
    title: listing.title,
    titleEn: listing.titleEn ?? undefined,
    category: listing.category,
    price: formatPriceRange(listing),
    priceUnit: listing.priceUnit,
    rating: Number(listing.rating ?? 0),
    bookings: listing.reviewCount,
    isActive: listing.isActive,
  };
}

function adaptBooking(booking: Booking): BookingItem {
  return {
    id: booking.id,
    requestor: booking.requestorName,
    requestorInitials: booking.requestorInitials,
    portrait: booking.requestorAvatarUrl ?? null,
    date: formatBookingDate(booking.scheduledAt),
    qty: booking.qty,
    item: booking.listingTitle || booking.itemDescription,
    status: booking.status,
    price: formatMoney(booking.amount, booking.currency),
  };
}

/**
 * GET /api/v1/elders/:elderId/listings
 *
 * Returns all service listings created by this elder, both active and inactive.
 *
 * @param elderId - The elder's user ID
 * @returns Array of the elder's listings
 * @throws {ApiError} 404 if the elder does not exist
 */
export async function getElderListings(elderId: string): Promise<ElderListing[]> {
  const listings = await apiRequest<Listing[]>(`/elders/${elderId}/listings`);
  return listings.map(adaptListing);
}

/**
 * PATCH /api/v1/listings/:listingId
 *
 * Partially updates a listing. Only the fields provided in `payload` are changed.
 * Useful for toggling `isActive` or editing price and description without
 * re-submitting the entire listing.
 *
 * @param listingId - The ID of the listing to update
 * @param payload - Partial listing fields to update
 * @returns The updated listing
 * @throws {ApiError} 403 if the authenticated elder does not own this listing
 * @throws {ApiError} 404 if the listing does not exist
 */
export async function updateListing(listingId: string, payload: Partial<ElderListing>): Promise<ElderListing> {
  const listing = await apiRequest<Listing>(`/listings/${listingId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return adaptListing(listing);
}

/**
 * GET /api/v1/elders/:elderId/bookings
 *
 * Returns all bookings for services offered by this elder, across all statuses
 * (pending, confirmed, completed, cancelled).
 *
 * @param elderId - The elder's user ID
 * @returns Array of bookings for this elder's listings
 */
export async function getElderBookings(elderId: string): Promise<BookingItem[]> {
  const bookings = await apiRequest<Booking[]>(`/elders/${elderId}/bookings`);
  return bookings.map(adaptBooking);
}

/**
 * POST /api/v1/bookings/:bookingId/respond
 *
 * Accepts or declines an incoming booking request.
 * Only the elder who owns the listing can respond.
 * Accepting moves the booking to `confirmed`; declining moves it to `cancelled`.
 *
 * @param bookingId - The booking to respond to
 * @param action - `"accept"` to confirm or `"decline"` to cancel
 * @returns The updated booking with the new status
 * @throws {ApiError} 403 if the authenticated user does not own the associated listing
 * @throws {ApiError} 409 if the booking is no longer in `pending` state
 */
export function respondToBooking(
  bookingId: string,
  action: "accept" | "decline",
) {
  return apiRequest<Booking>(`/bookings/${bookingId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

/**
 * GET /api/v1/elders/:elderId/earnings/summary
 *
 * Returns aggregated earnings data for the elder: month-to-date total,
 * lifetime total, and count of completed bookings.
 *
 * @param elderId - The elder's user ID
 * @returns Earnings summary (monthTotal, lifetimeTotal, completedCount)
 */
export async function getElderEarnings(elderId: string): Promise<ElderEarningsData> {
  const earnings = await apiRequest<EarningsSummary>(`/elders/${elderId}/earnings/summary`);
  return {
    monthTotal: Number(earnings.monthTotal ?? 0),
    lifetimeTotal: Number(earnings.lifetimeTotal ?? 0),
    completedCount: earnings.completedCount,
    weeklyBar: [320, 410, 480, 510, 500, Number(earnings.monthTotal ?? 0)],
  };
}
