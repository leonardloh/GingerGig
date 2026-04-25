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
 * Runtime environment configuration resolved from Vite env variables.
 *
 * Set values in a `.env.local` file (not committed) or in CI environment variables.
 * See `frontend/.env.example` for all available keys.
 */
export const env = {
  /** Base URL of the GingerGig backend, e.g. `https://api.gingergig.my`. No trailing slash. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  /** Request timeout in milliseconds. Requests that exceed this are aborted with status 408. */
  apiTimeoutMs: parseTimeout(import.meta.env.VITE_API_TIMEOUT_MS),
};
