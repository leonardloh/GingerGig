const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Parses the `VITE_API_TIMEOUT_MS` env variable into a positive integer.
 * Returns `DEFAULT_TIMEOUT_MS` (15 000 ms) if the value is missing, empty,
 * non-numeric, zero, or negative.
 */
function parseTimeout(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

/**
 * CDN base URL — no trailing slash.
 * Empty string in local dev so paths resolve to origin (e.g. `/logo.png`).
 * Set to your CloudFront distribution URL in production:
 *   VITE_CDN_URL=https://d1234abcd.cloudfront.net
 */
const cdnBase: string = (import.meta.env.VITE_CDN_URL ?? "").replace(/\/$/, "");

/**
 * Resolves a public asset path against the CDN base URL.
 *
 * Usage:
 *   cdnUrl("/logo.png")        → "/logo.png"           (local dev)
 *   cdnUrl("/logo.png")        → "https://d1234.cloudfront.net/logo.png"  (production)
 *
 * Path must start with "/".
 */
export function cdnUrl(path: string): string {
  return `${cdnBase}${path}`;
}

/**
 * Runtime environment configuration resolved from Vite env variables.
 *
 * Set values in a `.env` file (committed defaults) or `.env.local` for secrets.
 * See `frontend/.env` for all available keys with documentation.
 */
export const env = {
  /** Base URL of the GingerGig backend, e.g. `https://api.gingergig.my`. No trailing slash. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  /** Request timeout in milliseconds. Requests that exceed this are aborted with status 408. */
  apiTimeoutMs: parseTimeout(import.meta.env.VITE_API_TIMEOUT_MS),
  /**
   * When true, all `api.*` calls return typed mock data with a simulated network
   * delay instead of hitting the real backend. Set VITE_USE_MOCK_API=false once
   * the FastAPI backend is running and pointed to by VITE_API_BASE_URL.
   */
  useMockApi: import.meta.env.VITE_USE_MOCK_API === "true",
  /**
   * CDN base URL for static assets (images, icons).
   * Empty in local dev — assets resolve from origin.
   * In production, set VITE_CDN_URL to your CloudFront distribution URL.
   */
  cdnBaseUrl: cdnBase,
};
