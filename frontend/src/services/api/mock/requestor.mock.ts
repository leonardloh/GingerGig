import type { Booking, Provider } from "../types";
import type { SearchListingsParams } from "../endpoints/requestor";
import { ELDER_BOOKINGS, PROVIDERS } from "./data";
import { mockDelay } from "./delay";

export async function searchListings(params: SearchListingsParams): Promise<Provider[]> {
  await mockDelay();
  let results = [...PROVIDERS];

  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.service.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        (p.serviceEn ?? "").toLowerCase().includes(q),
    );
  }

  if (params.halalOnly) {
    results = results.filter((p) => p.halal);
  }

  if (typeof params.maxDistanceKm === "number") {
    results = results.filter((p) => {
      const km = parseFloat(p.distance);
      return km <= params.maxDistanceKm!;
    });
  }

  return results;
}

export async function getProvider(providerId: string): Promise<Provider> {
  await mockDelay();
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw { status: 404, message: "Provider not found." };
  return provider;
}

export async function createBooking(payload: {
  listingId: string;
  scheduledAt: string;
  notes?: string;
}): Promise<Booking> {
  await mockDelay(300, 700);
  return {
    id: `b-${Date.now()}`,
    listingId: payload.listingId,
    requestorName: "Amir Razak",
    requestorInitials: "AR",
    requestorAvatarUrl: null,
    listingTitle: "Masakan Melayu Tradisional",
    qty: "1 portion",
    itemDescription: "Rendang + Nasi Lemak",
    status: "pending",
    amount: 36,
    currency: "MYR",
    scheduledAt: payload.scheduledAt,
    notes: payload.notes,
  };
}

export async function getRequestorBookings(): Promise<Booking[]> {
  await mockDelay();
  return ELDER_BOOKINGS.map((b) => ({
    id: b.id,
    listingId: "l1",
    requestorName: b.requestor,
    requestorInitials: b.requestorInitials,
    requestorAvatarUrl: b.portrait,
    listingTitle: b.item,
    qty: b.qty,
    itemDescription: b.item,
    status: b.status,
    amount: parseFloat(b.price.replace("RM", "")),
    currency: "MYR",
    scheduledAt: new Date().toISOString(),
  }));
}
