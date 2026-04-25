# Phase 2: Auth + Bearer Middleware - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a demo auth shim with bearer-token dependencies for protected API routes. The prototype's three quick-login chips must authenticate against `POST /api/v1/auth/login`, return a token, and allow subsequent protected requests through the frontend's existing `Authorization: Bearer` injection.

Out of scope: real login security, bcrypt password verification, password policy, refresh tokens, persisted frontend sessions, MFA/OTP, password reset, login rate limiting, social login, production-grade account recovery, and any frontend UI changes.

</domain>

<decisions>
## Implementation Decisions

### Demo-First Auth Policy
- **D-01:** Keep Phase 2 as simple as possible for the demo. Implement a mock/demo auth flow only: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, bearer-token validation, and the helpers downstream routers need.
- **D-02:** `/auth/login` only needs to recognize the seeded demo accounts (Siti, Amir, Faiz/Companion) and return a usable bearer token. Do not implement real password verification.
- **D-03:** Tokens should be long enough for judging and development without refresh-token complexity. Use a simple fixed expiry, preferably 24 hours, surfaced through `expiresIn`.
- **D-04:** Do not add refresh tokens, session persistence, logout endpoint, account recovery, email verification, MFA, OTP, login throttling, or production password hardening in v1. These are explicitly deferred.

### KYC Access Gate
- **D-05:** `/auth/register` may be a demo-compatible stub that creates or returns a token-shaped response matching the frontend contract. It returns `kycRequired: true` only for elders.
- **D-06:** Do not over-enforce KYC in Phase 2. A valid elder token may authenticate while KYC is pending so the frontend can continue the onboarding/KYC flow. Later elder business actions can check KYC only if their phase requires it.

### Registration and Error Handling
- **D-07:** Validate only the basics needed for a clean demo: required fields, valid email syntax through Pydantic, valid role, and valid locale.
- **D-08:** Skip password policy and bcrypt hashing/checking in Phase 2. Password input can be accepted for frontend compatibility, but it is not a production security boundary.
- **D-09:** Invalid demo credentials return `401 {status, message: "Invalid credentials"}` with no account-enumeration detail. Keep duplicate-email handling simple; if registration writes a user, return `409` for an existing email, otherwise return a deterministic demo response.

### Protected Route Helpers
- **D-10:** Build `get_current_user` and `get_current_user_ws` in Phase 2. Add small role helpers only if they simplify Phase 3 planning, but keep them thin wrappers around `get_current_user`.
- **D-11:** `get_current_user_ws` should read the token from a simple `token` query parameter for future WebSocket routes.

### Demo Token Invariants
- **D-12:** Prefer simple signed JWTs for demo tokens so downstream dependencies can decode `sub` and identify the current user. Keep encode/decode centralized in `backend/app/core/security.py`; decode must require `exp` and `sub` and pass `algorithms=["HS256"]` explicitly.
- **D-13:** In non-debug environments, the app must refuse to start if `JWT_SECRET` is unset or shorter than 32 bytes. Keep existing pydantic settings validation as the enforcement point unless planning finds a smaller local pattern.

### Claude's Discretion
- Exact token lifetime implementation details, whether `/auth/register` persists users or returns a demo-only response, claim names beyond required `sub` and `exp`, and helper function/module names are flexible as long as they preserve the frontend contract and demo-token invariants above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Locked milestone constraints, anti-features, dependency pitfalls, frontend no-change rule.
- `.planning/REQUIREMENTS.md` §Authentication — AUTH-01 through AUTH-07.
- `.planning/ROADMAP.md` §Phase 2 — Phase goal and five success criteria.
- `.planning/STATE.md` — Carried-forward locked decisions from Phase 1 and current workflow state.
- `.planning/phases/01-backend-scaffold-schema-seed/01-CONTEXT.md` — Phase 1 decisions that Phase 2 inherits, including schema, seed, JWT, and test harness constraints. Bcrypt is deliberately not used for Phase 2's mock auth.

### Backend files
- `backend/app/routers/auth.py` — Current auth router stub to replace with register/login/me endpoints.
- `backend/app/core/security.py` — Central JWT helper surface; Phase 2 fills the stubs here.
- `backend/app/core/config.py` — `JWT_SECRET` settings validation and environment configuration.
- `backend/app/models/user.py` — User table fields available for auth and profile responses.
- `backend/app/deps/db.py` — Per-request `AsyncSession` dependency pattern.
- `backend/app/schemas/common.py` — ApiError envelope model.
- `backend/pyproject.toml` — Required dependencies and pytest/ruff/mypy tooling. `pyjwt[crypto]` is relevant for demo tokens; bcrypt remains installed but is not part of Phase 2 mock auth.

### Frontend contract
- `frontend/src/services/api/endpoints/auth.ts` — Client expects `register`, `login`, `logout`, and `getMe`; login/register store returned bearer token in memory.
- `frontend/src/services/api/http.ts` — Adds `Authorization: Bearer <token>` and expects backend errors in ApiError shape.
- `frontend/src/services/api/types.ts` — Auth DTOs: `RegisterPayload`, `RegisterResponse`, `Session`, `UserProfile`.
- `frontend/src/prototype/PrototypeApp.jsx` — Demo quick-login chips for Siti, Amir, and Companion must keep working.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/core/security.py` already exists as the intended central home for JWT encode/decode helpers.
- `backend/app/core/config.py` already validates `jwt_secret` with a minimum length of 32 characters.
- `backend/app/models/user.py` already stores `email`, `password_hash`, `name`, `role`, `locale`, `kyc_status`, `phone`, `area`, `age`, and `avatar_url`.
- `backend/tests/conftest.py` provides the async DB/test-client harness Phase 2 tests should reuse.

### Established Patterns
- Routers live under `backend/app/routers/` and are mounted under `/api/v1`.
- Backend constrained values use string columns plus DB `CHECK` constraints, with Python mirrors in `app/core/enums.py`.
- Errors must serialize as `{status, message, detail?}` for the frontend `ApiError` wrapper.
- Test style is pytest + pytest-asyncio + `httpx.AsyncClient` with `ASGITransport`.

### Integration Points
- `/auth/login` and `/auth/register` must return token-shaped responses that `frontend/src/services/api/http.ts` can store and attach.
- `/auth/me` is the first protected route and should prove that `Authorization: Bearer` works.
- `get_current_user` becomes the dependency Phase 3/4/5 routers build on.
- `get_current_user_ws` exists for Phase 5 voice WebSocket authentication and reads `?token=...`.

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants the phase kept simple because this is a demo.
- User confirmed Phase 2 should be mock auth only; no real login implementation.
- Prefer demo reliability over production auth hardening.
- Avoid adding frontend-visible validation rules unless the existing UI already supports explaining them.

</specifics>

<deferred>
## Deferred Ideas

- Refresh-token flow.
- Persisted sessions via httpOnly cookies or localStorage.
- Real bcrypt password verification for login.
- Production password hashing on registration.
- Login rate limiting.
- MFA / OTP.
- Password reset / email verification.
- Social login.
- Complex password strength rules.

</deferred>

---

*Phase: 02-auth-bearer-middleware*
*Context gathered: 2026-04-25*
