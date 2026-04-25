# Phase 2: Auth + Bearer Middleware - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 2-Auth + Bearer Middleware
**Areas discussed:** Session Duration, KYC Access Gate, Registration Policy, Protected Route Helpers, WebSocket Auth Token

---

## Phase Direction

| Option | Description | Selected |
|--------|-------------|----------|
| Discuss each auth policy area in detail | Walk through session duration, KYC gating, validation, helpers, and WebSocket token naming one by one | |
| Keep auth as simple as possible for a demo | Use practical defaults and avoid production-grade complexity not needed for judging | ✓ |

**User's choice:** "don't over complicated these, make these as simple as possible as this is just a simple demo"

**Notes:** The captured context translates this into demo-first defaults: fixed long-lived JWT, no refresh flow, minimal validation, permissive KYC authentication during onboarding, thin protected-route helpers, and `token` query parameter for future WebSocket auth.

---

## Real vs Mock Auth

| Option | Description | Selected |
|--------|-------------|----------|
| Keep real auth but simple | Use bcrypt-backed password verification and real registration/login semantics, while avoiding refresh and hardening features | |
| Mock auth only | Recognize demo accounts, return usable demo bearer tokens, and keep downstream `get_current_user` working without production login security | ✓ |

**User's choice:** `1` for "mock auth only" after clarifying "no need to implement login, just mock it."

**Notes:** Phase 2 context was revised to treat bcrypt/password verification as out of scope. The phase still provides token-shaped responses and current-user dependencies so Phase 3+ can identify Siti, Amir, or Faiz.

---

## Claude's Discretion

- Exact token lifetime implementation details, with 24 hours recommended as the simple default.
- Whether `/auth/register` persists a user or returns a deterministic demo-compatible response.
- Helper function/module names, provided they stay thin and preserve the frontend contract.
- Claim names beyond required `sub` and `exp`.

## Deferred Ideas

- Refresh-token flow.
- Persisted sessions.
- Real bcrypt password verification.
- Production registration semantics.
- Login rate limiting.
- MFA / OTP.
- Password reset / email verification.
- Social login.
- Complex password strength rules.
