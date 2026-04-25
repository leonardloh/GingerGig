# Phase 2: Auth + Bearer Middleware - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver real JWT authentication with bcrypt-backed demo accounts and bearer-token dependencies for protected API routes. The prototype's three quick-login chips must authenticate against `POST /api/v1/auth/login`, return a JWT, and allow subsequent protected requests through the frontend's existing `Authorization: Bearer` injection.

Out of scope: refresh tokens, persisted frontend sessions, MFA/OTP, password reset, login rate limiting, social login, production-grade account recovery, and any frontend UI changes.

</domain>

<decisions>
## Implementation Decisions

### Demo-First Auth Policy
- **D-01:** Keep Phase 2 as simple as possible for the demo. Implement only email/password registration, email/password login, `GET /auth/me`, bearer-token validation, and the helpers downstream routers need.
- **D-02:** JWT sessions should be long enough for judging and development without refresh-token complexity. Use a simple fixed expiry, preferably 24 hours, surfaced through `expiresIn`.
- **D-03:** Do not add refresh tokens, session persistence, logout endpoint, account recovery, email verification, MFA, OTP, or login throttling in v1. These are explicitly deferred.

### KYC Access Gate
- **D-04:** Registration returns `kycRequired: true` only for elders and sets their initial `kycStatus` to `not_started` or the current DB value.
- **D-05:** Do not over-enforce KYC in Phase 2. A valid elder token may authenticate while KYC is pending so the frontend can continue the onboarding/KYC flow. Later elder business actions can check KYC only if their phase requires it.

### Registration and Error Handling
- **D-06:** Validate only the basics needed for a clean demo: required fields, valid email syntax through Pydantic, valid role, valid locale, and duplicate email conflict.
- **D-07:** Password policy stays minimal: require a non-empty password and hash it with bcrypt. Do not add complex strength rules that the existing frontend cannot explain.
- **D-08:** Duplicate email returns `409` with the standard ApiError envelope. Invalid credentials return `401 {status, message: "Invalid credentials"}` with no account-enumeration detail.

### Protected Route Helpers
- **D-09:** Build `get_current_user` and `get_current_user_ws` in Phase 2. Add small role helpers only if they simplify Phase 3 planning, but keep them thin wrappers around `get_current_user`.
- **D-10:** `get_current_user_ws` should read the JWT from a simple `token` query parameter for future WebSocket routes.

### Security Invariants
- **D-11:** All bcrypt `hashpw` and `checkpw` calls must run via `await asyncio.to_thread(...)` so auth work does not block the event loop.
- **D-12:** JWT encode/decode stays centralized in `backend/app/core/security.py`; decode must require `exp` and `sub` and pass `algorithms=["HS256"]` explicitly.
- **D-13:** In non-debug environments, the app must refuse to start if `JWT_SECRET` is unset or shorter than 32 bytes. Keep existing pydantic settings validation as the enforcement point unless planning finds a smaller local pattern.

### Claude's Discretion
- Exact token lifetime implementation details, claim names beyond required `sub` and `exp`, and helper function/module names are flexible as long as they preserve the frontend contract and the security invariants above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Locked milestone constraints, anti-features, dependency pitfalls, frontend no-change rule.
- `.planning/REQUIREMENTS.md` §Authentication — AUTH-01 through AUTH-07.
- `.planning/ROADMAP.md` §Phase 2 — Phase goal and five success criteria.
- `.planning/STATE.md` — Carried-forward locked decisions from Phase 1 and current workflow state.
- `.planning/phases/01-backend-scaffold-schema-seed/01-CONTEXT.md` — Phase 1 decisions that Phase 2 inherits, including schema, seed, bcrypt, JWT, and test harness constraints.

### Backend files
- `backend/app/routers/auth.py` — Current auth router stub to replace with register/login/me endpoints.
- `backend/app/core/security.py` — Central JWT helper surface; Phase 2 fills the stubs here.
- `backend/app/core/config.py` — `JWT_SECRET` settings validation and environment configuration.
- `backend/app/models/user.py` — User table fields available for auth and profile responses.
- `backend/app/deps/db.py` — Per-request `AsyncSession` dependency pattern.
- `backend/app/schemas/common.py` — ApiError envelope model.
- `backend/pyproject.toml` — Required dependencies: `pyjwt[crypto]`, `bcrypt>=4.2,<5.0.0`, pytest/ruff/mypy tooling.

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
- `/auth/login` and `/auth/register` must return tokens that `frontend/src/services/api/http.ts` can store and attach.
- `/auth/me` is the first protected route and should prove that `Authorization: Bearer` works.
- `get_current_user` becomes the dependency Phase 3/4/5 routers build on.
- `get_current_user_ws` exists for Phase 5 voice WebSocket authentication and reads `?token=...`.

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants the phase kept simple because this is a demo.
- Prefer demo reliability over production auth hardening.
- Avoid adding frontend-visible validation rules unless the existing UI already supports explaining them.

</specifics>

<deferred>
## Deferred Ideas

- Refresh-token flow.
- Persisted sessions via httpOnly cookies or localStorage.
- Login rate limiting.
- MFA / OTP.
- Password reset / email verification.
- Social login.
- Complex password strength rules.

</deferred>

---

*Phase: 02-auth-bearer-middleware*
*Context gathered: 2026-04-25*
