import { apiRequest, setApiAccessToken } from "../http";
import type { RegisterPayload, RegisterResponse, Session, UserProfile } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * POST /api/v1/auth/register
 *
 * Creates a new account. eKYC is required for ALL roles:
 *   - Elder     : required by Malaysian law to receive payments (AML/CFT)
 *   - Requestor : visits providers' homes — must be vetted for safety
 *   - Companion : accesses sensitive elder data — identity must be confirmed
 *
 * The backend always returns kycRequired=true and kycStatus="not_started".
 * Frontend should call kyc.initiateSession() to get presigned S3 upload URLs.
 */
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setApiAccessToken(response.accessToken);
  return response;
}

/**
 * POST /api/v1/auth/login
 *
 * Authenticates an existing user and stores the returned access token
 * in the shared HTTP client so subsequent calls are authorised.
 *
 * @param payload - Email and password credentials
 * @returns Session containing the access token and token metadata
 * @throws {ApiError} 401 if credentials are invalid
 */
export async function login(payload: LoginPayload): Promise<Session> {
  const session = await apiRequest<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setApiAccessToken(session.accessToken);
  return session;
}

/**
 * Clears the stored access token from the HTTP client.
 * Call this when the user signs out — no backend call is made.
 */
export function logout() {
  setApiAccessToken(null);
}

/**
 * GET /api/v1/auth/me
 *
 * Returns the profile of the currently authenticated user.
 * Requires a valid access token to have been set via `login()` or `register()`.
 *
 * @returns The authenticated user's profile (id, name, role, locale)
 * @throws {ApiError} 401 if no valid token is present
 */
export function getMe() {
  return apiRequest<UserProfile>("/auth/me");
}
