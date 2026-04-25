/**
 * Central API object — picks mock or real implementations based on
 * VITE_USE_MOCK_API plus a runtime "demo mode" flag.
 *
 * Usage in any component or screen:
 *
 *   import { api } from '@/services/api';
 *
 *   useEffect(() => {
 *     api.elder.getElderListings(userId).then(setListings);
 *   }, [userId]);
 *
 * The real-vs-mock decision is evaluated on every property access (via
 * getters) so that toggling demo mode at runtime is immediately reflected
 * in subsequent calls. To swap to the real backend permanently, set
 * VITE_USE_MOCK_API=false in .env (or .env.production) and point
 * VITE_API_BASE_URL at the running FastAPI server.
 */

import { env } from "../../config/env";

import * as authReal from "./endpoints/auth";
import * as elderReal from "./endpoints/elder";
import * as requestorReal from "./endpoints/requestor";
import * as companionReal from "./endpoints/companion";
import * as kycReal from "./endpoints/kyc";
import * as voiceReal from "./endpoints/voice";

import * as authMock from "./mock/auth.mock";
import * as elderMock from "./mock/elder.mock";
import * as requestorMock from "./mock/requestor.mock";
import * as companionMock from "./mock/companion.mock";
import * as kycMock from "./mock/kyc.mock";

const DEMO_MODE_KEY = "gg_demo_mode";

/**
 * Force every subsequent api.* call to use mock implementations,
 * regardless of VITE_USE_MOCK_API. Persisted in sessionStorage so it
 * survives page reloads inside the same browser tab.
 *
 * Called by the demo-account quick-login cards on the login screen.
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) window.sessionStorage.setItem(DEMO_MODE_KEY, "true");
  else window.sessionStorage.removeItem(DEMO_MODE_KEY);
}

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(DEMO_MODE_KEY) === "true";
}

function useMock(): boolean {
  return env.useMockApi || isDemoMode();
}

export const api = {
  get auth() { return useMock() ? authMock : authReal; },
  get elder() { return useMock() ? elderMock : elderReal; },
  get requestor() { return useMock() ? requestorMock : requestorReal; },
  get companion() { return useMock() ? companionMock : companionReal; },
  get kyc() { return useMock() ? kycMock : kycReal; },
  get voice() { return voiceReal; },
} as const;
