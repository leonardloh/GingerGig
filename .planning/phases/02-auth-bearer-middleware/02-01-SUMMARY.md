---
phase: 02-auth-bearer-middleware
plan: 01
subsystem: auth
tags: [fastapi, jwt, pyjwt, bearer, pytest]

requires:
  - phase: 01-backend-scaffold-schema-seed
    provides: users table, seed data, FastAPI router shell, test harness
provides:
  - Demo login/register/me auth routes under /api/v1/auth
  - Central HS256 JWT encode/decode helpers with required exp and sub claims
  - HTTP and WebSocket current-user dependencies for downstream protected routes
  - Focused auth tests for demo routes, token safety, and JWT secret validation
affects: [03-persona-routers-elder-requestor-companion, 04-ekyc-pipeline, 05-voice-to-profile-pipeline]

tech-stack:
  added: []
  patterns:
    - Centralized PyJWT decode in app.core.security
    - FastAPI dependencies declared with Annotated and Depends
    - Demo-only auth shim avoids runtime password verification

key-files:
  created:
    - backend/app/schemas/auth.py
    - backend/app/deps/auth.py
    - backend/tests/test_auth_demo.py
    - backend/tests/test_auth_dependencies.py
    - backend/tests/test_auth_settings.py
  modified:
    - backend/app/core/security.py
    - backend/app/routers/auth.py

key-decisions:
  - "Phase 2 keeps authentication demo-only: seeded demo emails receive JWTs without password verification."
  - "JWT decode remains centralized in app.core.security with algorithms=[JWT_ALGORITHM] and required exp/sub claims."
  - "FastAPI dependency signatures use Annotated to satisfy the repository's Ruff B008 rule."

patterns-established:
  - "Protected routes should depend on get_current_user from app.deps.auth."
  - "Future WebSocket routes should pass their token query parameter through get_current_user_ws."
  - "Runtime auth files must not add bcrypt/checkpw/hashpw until a future production auth hardening phase."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07]

duration: 4 min
completed: 2026-04-25
---

# Phase 02 Plan 01: Demo Auth Shim and Bearer Dependencies Summary

**Demo bearer-token auth now issues HS256 JWTs for seeded users, exposes current-user dependencies, and returns frontend-compatible auth DTOs.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T16:12:20Z
- **Completed:** 2026-04-25T16:16:37Z
- **Tasks:** 5 completed
- **Files modified:** 8

## Accomplishments

- Implemented `encode_jwt` and `decode_jwt` in `backend/app/core/security.py` with 24h expiry defaults, explicit HS256 allowlist, and required `exp`/`sub` claims.
- Added auth schemas matching the frontend's camelCase contract, including extended `UserProfile` fields.
- Added HTTP and WebSocket bearer dependencies that load `User` rows from JWT `sub`.
- Replaced the auth stub with demo login, register, and me routes while avoiding runtime password verification.
- Added focused tests for demo login/register/me, token rejection, no runtime bcrypt usage, and JWT secret settings validation.

## Task Commits

Each task was committed atomically where feasible:

1. **Task 1: Implement central demo JWT helpers** - `df09d49` (feat)
2. **Task 2: Add auth DTOs matching the frontend contract** - `fcd34fc` (feat)
3. **Task 3: Add bearer-token dependencies for HTTP and WebSocket routes** - `77b644f` (feat)
4. **Task 4: Replace auth router stub with demo login, register, and me routes** - `40e1545` (feat)
5. **Verification fix: Align auth dependencies with lint rules** - `f971eba` (fix)
6. **Task 5: Add focused tests for demo auth routes and token safety** - `a91aaf7` (test)

**Plan metadata:** committed separately after summary/state/roadmap/requirements updates.

## Files Created/Modified

- `backend/app/core/security.py` - Central PyJWT helpers.
- `backend/app/schemas/auth.py` - Auth request/response/profile DTOs.
- `backend/app/deps/auth.py` - Bearer current-user dependencies.
- `backend/app/routers/auth.py` - Demo login/register/me routes.
- `backend/tests/test_auth_demo.py` - Route-level demo auth tests.
- `backend/tests/test_auth_dependencies.py` - Token safety and no-runtime-bcrypt tests.
- `backend/tests/test_auth_settings.py` - JWT secret validation tests.

## Decisions Made

- Kept Phase 2 auth demo-only per `02-CONTEXT.md`: password fields are accepted for contract compatibility but not verified.
- Used `Annotated[..., Depends(...)]` for new FastAPI dependencies because the repository's Ruff config rejects function calls in default arguments.
- Left refresh tokens, persisted sessions, production password verification, rate limiting, MFA, and frontend changes out of scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ruff B008 rejected dependency default calls**
- **Found during:** Plan verification
- **Issue:** The plan's direct `Depends(...)` default-argument shape triggered the repo's Ruff `B008` rule.
- **Fix:** Switched new dependency signatures to `Annotated[..., Depends(...)]` and added a scoped `noqa` for the explicit demo-only password hash placeholder.
- **Files modified:** `backend/app/deps/auth.py`, `backend/app/routers/auth.py`
- **Verification:** `uv run ruff check .` passes.
- **Committed in:** `f971eba`

---

**Total deviations:** 1 auto-fixed (1 blocking lint issue).
**Impact on plan:** Behavior is unchanged; the adjustment keeps the implementation aligned with local lint policy.

## Issues Encountered

- DB-backed tests could not run to completion in this shell because neither `TEST_DATABASE_URL` nor `DATABASE_URL` is set. Static/settings tests, Ruff, mypy, and manual grep checks passed.

## User Setup Required

None - no external service configuration required for the implementation. DB-backed verification requires an existing migrated Postgres test database via `TEST_DATABASE_URL` or `DATABASE_URL`.

## Verification

- `uv run pytest tests/test_auth_demo.py tests/test_auth_dependencies.py -q` - blocked: 7 DB-backed tests errored at fixture setup because `TEST_DATABASE_URL`/`DATABASE_URL` is unset; 1 static test passed.
- `uv run pytest tests/test_auth_settings.py -q` - passed: 2 tests.
- `uv run pytest -q` - blocked: DB-backed tests errored at fixture setup because `TEST_DATABASE_URL`/`DATABASE_URL` is unset; 11 tests passed before/alongside 14 setup errors.
- `uv run ruff check .` - passed.
- `uv run mypy app` - passed.
- Manual grep checks passed: `jwt.decode` appears only in `backend/app/core/security.py`; HS256 algorithm allowlist is present; runtime auth files contain no `bcrypt`, `checkpw`, or `hashpw`.

## Next Phase Readiness

Phase 2 implementation is ready for Phase 3 once DB-backed tests are rerun in an environment with `TEST_DATABASE_URL` or `DATABASE_URL` set.

---
*Phase: 02-auth-bearer-middleware*
*Completed: 2026-04-25*
