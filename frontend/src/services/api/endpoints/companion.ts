import { apiRequest } from "../http";
import type { CompanionAlert, CompanionDashboard } from "../types";

/**
 * Each companion is paired with one elder they watch over.
 * The `elderId` here identifies that elder — the backend resolves
 * the companion identity from the JWT `sub` claim.
 */
export function getCompanionDashboard(elderId: string): Promise<CompanionDashboard> {
  return apiRequest<CompanionDashboard>(`/companions/elders/${elderId}/dashboard`);
}

/**
 * GET /api/v1/companions/elders/:elderId/alerts
 *
 * Returns active care alerts for the elder this companion is watching over.
 * Alert types include inactivity warnings, overwork signals, earning milestones,
 * new bookings, and reviews.
 *
 * @param elderId - The ID of the elder being watched
 * @returns Array of active alerts, newest first
 */
export function getCompanionAlerts(elderId: string): Promise<CompanionAlert[]> {
  return apiRequest<CompanionAlert[]>(`/companions/elders/${elderId}/alerts`);
}

/** Notification preferences for a companion's alert subscriptions. */
export interface AlertPreferences {
  /** Notify when the elder has been inactive for more than 24 hours. */
  inactivity24h: boolean;
  /** Notify when the elder's booking schedule may be overloading them. */
  overworkSignals: boolean;
  /** Notify when the elder hits earnings milestones. */
  earningsMilestones: boolean;
  /** Notify when the elder receives a new booking request. */
  newBookings: boolean;
  /** Notify when the elder receives a new review. */
  reviews: boolean;
}

/**
 * PUT /api/v1/companions/elders/:elderId/alert-preferences
 *
 * Replaces the companion's alert notification preferences for this elder.
 * All preference fields must be provided (full replacement, not partial update).
 *
 * @param elderId - The ID of the elder being watched
 * @param payload - Complete set of notification preferences
 * @throws {ApiError} 403 if the authenticated user is not a companion for this elder
 */
export function updateCompanionAlertPreferences(
  elderId: string,
  payload: AlertPreferences,
): Promise<void> {
  return apiRequest<void>(`/companions/elders/${elderId}/alert-preferences`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
