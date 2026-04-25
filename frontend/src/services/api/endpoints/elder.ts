import { apiRequest } from "../http";
import type { Booking, EarningsSummary, Listing } from "../types";

/**
 * GET /api/v1/elders/:elderId/listings
 *
 * Returns all service listings created by this elder, both active and inactive.
 *
 * @param elderId - The elder's user ID
 * @returns Array of the elder's listings
 * @throws {ApiError} 404 if the elder does not exist
 */
export function getElderListings(elderId: string) {
  return apiRequest<Listing[]>(`/elders/${elderId}/listings`);
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
export function updateListing(listingId: string, payload: Partial<Listing>) {
  return apiRequest<Listing>(`/listings/${listingId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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
export function getElderBookings(elderId: string) {
  return apiRequest<Booking[]>(`/elders/${elderId}/bookings`);
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
export function getElderEarnings(elderId: string) {
  return apiRequest<EarningsSummary>(`/elders/${elderId}/earnings/summary`);
}
