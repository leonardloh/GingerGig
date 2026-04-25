import type { CompanionAlertItem, CompanionDashboardData } from "../types";
import type { AlertPreferences } from "../endpoints/companion";
import { COMPANION_ALERTS, COMPANION_DASHBOARD } from "./data";
import { mockDelay } from "./delay";

export async function getCompanionDashboard(
  _elderId: string,
): Promise<CompanionDashboardData> {
  void _elderId;
  await mockDelay();
  return COMPANION_DASHBOARD;
}

export async function getCompanionAlerts(
  _elderId: string,
): Promise<CompanionAlertItem[]> {
  void _elderId;
  await mockDelay();
  return COMPANION_ALERTS;
}

export async function updateCompanionAlertPreferences(
  _elderId: string,
  _payload: AlertPreferences,
): Promise<void> {
  void _elderId;
  void _payload;
  await mockDelay(100, 300);
  // No-op in mock mode — preferences are not persisted
}
