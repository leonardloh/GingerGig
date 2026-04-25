import type { BookingItem, ElderEarningsData, ElderListing } from "../types";
import type { Booking } from "../types";
import { ELDER_BOOKINGS, ELDER_COMPLETED, ELDER_EARNINGS, ELDER_LISTINGS } from "./data";
import { mockDelay } from "./delay";

export async function getElderListings(_elderId: string): Promise<ElderListing[]> {
  void _elderId;
  await mockDelay();
  return ELDER_LISTINGS;
}

export async function updateListing(
  listingId: string,
  payload: Partial<ElderListing>,
): Promise<ElderListing> {
  await mockDelay();
  const listing = ELDER_LISTINGS.find((l) => l.id === listingId);
  if (!listing) throw { status: 404, message: "Listing not found." };
  return { ...listing, ...payload };
}

export async function getElderBookings(_elderId: string): Promise<BookingItem[]> {
  void _elderId;
  await mockDelay();
  return [...ELDER_BOOKINGS, ...ELDER_COMPLETED];
}

export async function respondToBooking(
  bookingId: string,
  action: "accept" | "decline",
): Promise<Booking> {
  await mockDelay();
  const booking = ELDER_BOOKINGS.find((b) => b.id === bookingId);
  if (!booking) throw { status: 404, message: "Booking not found." };
  return {
    id: booking.id,
    listingId: "l1",
    requestorName: booking.requestor,
    requestorInitials: booking.requestorInitials,
    requestorAvatarUrl: booking.portrait,
    listingTitle: booking.item,
    qty: booking.qty,
    itemDescription: booking.item,
    status: action === "accept" ? "confirmed" : "cancelled",
    amount: parseFloat(booking.price.replace("RM", "")),
    currency: "MYR",
    scheduledAt: new Date().toISOString(),
  };
}

export async function getElderEarnings(_elderId: string): Promise<ElderEarningsData> {
  void _elderId;
  await mockDelay();
  return ELDER_EARNINGS;
}
