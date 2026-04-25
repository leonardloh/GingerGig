import { env } from "../../config/env";
import type { ApiError } from "./types";

const API_PREFIX = "/api/v1";

let accessToken: string | null = null;

/**
 * Stores the Bearer token that is attached to every subsequent API request.
 * Call with `null` to clear the token on logout.
 */
export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

interface RequestOptions extends RequestInit {
  /** Override the default timeout from env.apiTimeoutMs for this request only. */
  timeoutMs?: number;
}

/**
 * Attempts to parse the error body as JSON; falls back to undefined if the
 * response has no body or the body is not valid JSON.
 */
async function parseError(response: Response): Promise<ApiError> {
  let detail: unknown;
  try {
    detail = await response.json();
  } catch {
    detail = undefined;
  }

  return {
    status: response.status,
    message: response.statusText || "Request failed",
    detail,
  };
}

/**
 * Core HTTP client for all GingerGig API calls.
 *
 * Automatically:
 * - Prepends `API_PREFIX` (`/api/v1`) to every path
 * - Attaches the stored Bearer token when present
 * - Sets `Content-Type: application/json` when a body is provided
 * - Aborts and throws `{ status: 408 }` if the request exceeds `timeoutMs`
 * - Returns `undefined` (typed as T) for 204 No Content responses
 * - Throws a typed `ApiError` for any non-2xx response
 *
 * @param path - Path relative to the API prefix, e.g. `"/auth/login"`
 * @param options - Standard `RequestInit` options plus an optional `timeoutMs` override
 * @returns Parsed JSON response body cast to T
 * @throws {ApiError} For non-2xx responses or request timeout
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? env.apiTimeoutMs;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${env.apiBaseUrl}${API_PREFIX}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await parseError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw {
        status: 408,
        message: "Request timed out",
        detail: undefined,
      } satisfies ApiError;
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}
