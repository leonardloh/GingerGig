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

## Claude's Discretion

- Exact token lifetime implementation details, with 24 hours recommended as the simple default.
- Helper function/module names, provided they stay thin and preserve the frontend contract.
- Claim names beyond required `sub` and `exp`.

## Deferred Ideas

- Refresh-token flow.
- Persisted sessions.
- Login rate limiting.
- MFA / OTP.
- Password reset / email verification.
- Social login.
- Complex password strength rules.
