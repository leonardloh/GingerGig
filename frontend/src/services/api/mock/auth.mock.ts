import type { RegisterPayload, RegisterResponse, Session, UserProfile } from "../types";
import type { LoginPayload } from "../endpoints/auth";
import { DEMO_ACCOUNTS, makeMockSession, makeMockProfile } from "./data";
import { mockDelay } from "./delay";

let currentAccount = DEMO_ACCOUNTS[0];

export async function login(payload: LoginPayload): Promise<Session> {
  await mockDelay();
  const account = DEMO_ACCOUNTS.find(
    (a) => a.email === payload.email.trim().toLowerCase() && a.password === payload.password,
  );
  if (!account) {
    throw { status: 401, message: "Invalid email or password." };
  }
  currentAccount = account;
  return makeMockSession(account);
}

export async function register(_payload: RegisterPayload): Promise<RegisterResponse> {
  void _payload;
  await mockDelay(200, 600);
  return {
    userId: `user-${Date.now()}`,
    accessToken: `mock-token-new-${Date.now()}`,
    tokenType: "bearer",
    expiresIn: 86400,
    kycRequired: true,        // eKYC required for all roles
    kycStatus: "not_started",
  };
}

export async function getMe(): Promise<UserProfile> {
  await mockDelay(80, 200);
  return makeMockProfile(currentAccount);
}

export function logout(): void {
  currentAccount = DEMO_ACCOUNTS[0];
}
