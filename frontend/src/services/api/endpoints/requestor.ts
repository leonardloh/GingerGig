import { apiRequest } from "../http";
import type { Booking, Listing, ListingDetail, Provider } from "../types";

/** Filters for searching available elder service listings. */
export interface SearchListingsParams {
  /** Free-text search against listing title and description. */
  query?: string;
  /** Restrict results to listings within this radius of the requestor's location. */
  maxDistanceKm?: number;
  /** When true, only return listings from halal-certified providers. */
  halalOnly?: boolean;
  /** When true, only return listings whose availability includes the current time. */
  openNow?: boolean;
}

/**
 * GET /api/v1/requestor/listings/search
 *
 * Searches available elder service listings with optional filters.
 * Only active listings are returned. Results are sorted by distance
 * when `maxDistanceKm` is provided.
 *
 * @param params - Optional filters (query, distance, halal, availability)
 * @returns Array of matching listings
 */
function formatListingPrice(listing: Listing | ListingDetail): string {
  const min = `RM${listing.price}`;
  return listing.priceMax ? `${min}-${listing.priceMax}` : min;
}

function formatMenuPrice(price: number | string): string {
  return typeof price === "number" ? `RM${price}` : price;
}

function adaptListingToProvider(listing: Listing | ListingDetail): Provider {
  return {
    id: listing.id,
    name: listing.elderName || "Provider",
    age: listing.elderAge ?? 64,
    area: listing.elderArea || "",
    distance: listing.distance || "",
    initials: listing.elderInitials || "GG",
    portrait: listing.elderPortraitUrl ?? null,
    service: listing.title,
    serviceEn: listing.titleEn ?? undefined,
    serviceMs: listing.titleMs ?? undefined,
    serviceZh: listing.titleZh ?? undefined,
    serviceTa: listing.titleTa ?? undefined,
    category: listing.category,
    rating: Number(listing.rating ?? 0),
    reviews: listing.reviewCount,
    price: formatListingPrice(listing),
    priceUnit: listing.priceUnit,
    halal: listing.halal,
    tone: "warm",
    description: listing.description,
    matchScore: listing.matchScore ?? Math.round(Math.min(Number(listing.rating) || 0, 5) * 20),
    matchReason: listing.matchReason ?? undefined,
    menu: listing.menu.map((item) => ({
      name: item.name,
      price: formatMenuPrice(item.price),
    })),
    days: listing.days,
  };
}

export async function searchListings(params: SearchListingsParams): Promise<Provider[]> {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (typeof params.maxDistanceKm === "number") {
    search.set("max_distance_km", String(params.maxDistanceKm));
  }
  if (params.halalOnly) search.set("halal_only", "true");
  if (params.openNow) search.set("open_now", "true");

  const listings = await apiRequest<Listing[]>(
    `/requestor/listings/search?${search.toString()}`,
  );
  return listings.map(adaptListingToProvider);
}

/**
 * GET /api/v1/requestor/providers/:providerId
 *
 * Returns the full provider card for a single elder — used on the detail screen.
 *
 * @param providerId - The provider's user ID (same as elder ID)
 * @returns Full Provider object including menu, days, match scores
 * @throws {ApiError} 404 if the provider does not exist or is not active
 */
export async function getProvider(providerId: string): Promise<Provider> {
  const listing = await apiRequest<ListingDetail>(`/listings/${providerId}`);
  return adaptListingToProvider(listing);
}

/**
 * POST /api/v1/requestor/bookings
 *
 * Creates a new booking for a listing. The booking starts in `pending` status
 * and the elder must accept or decline via `respondToBooking()`.
 *
 * @param payload - Booking details: which listing, when, and optional notes
 * @returns The newly created booking in `pending` status
 * @throws {ApiError} 404 if the listing does not exist or is no longer active
 * @throws {ApiError} 409 if the listing is already booked for that time slot
 */
export function createBooking(payload: {
  listingId: string;
  scheduledAt: string;
  notes?: string;
}) {
  return apiRequest<Booking>("/requestor/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/v1/requestor/bookings
 *
 * Returns all bookings made by the authenticated requestor, across all statuses.
 * The requestor is identified from the JWT `sub` claim — no ID parameter needed.
 *
 * @returns Array of the requestor's bookings
 */
export function getRequestorBookings() {
  return apiRequest<Booking[]>("/requestor/bookings");
}
