---
phase: 01-backend-scaffold-schema-seed
plan: 02
subsystem: backend-api
tags: [fastapi, cors, routers, health, error-envelope, asgi]

requires:
  - phase: 01-backend-scaffold-schema-seed
    provides: backend core config, error handlers, schemas, and async engine helpers from 01-01
provides:
  - FastAPI app entrypoint with lifespan-managed async engine
  - CORS allowlist for the Vite frontend origin
  - Health endpoint at /health
  - Six reserved API router stubs under /api/v1
  - Sanitized error envelope for unhandled exceptions, including /__test__/boom
affects: [phase-02-auth, phase-03-persona-routers, phase-04-kyc, phase-05-voice, phase-06-tests]

tech-stack:
  added: []
  patterns:
    - Lifespan builds app.state.engine via build_engine(settings) and disposes it on shutdown
    - App-wide error responses use the ApiError envelope {status, message, detail?}
    - Router paths are reserved with 501 stubs until later phases fill business logic

key-files:
  created:
    - backend/app/main.py
    - backend/app/routers/health.py
    - backend/app/routers/auth.py
    - backend/app/routers/elder.py
    - backend/app/routers/requestor.py
    - backend/app/routers/companion.py
    - backend/app/routers/kyc.py
    - backend/app/routers/voice.py
  modified:
    - backend/app/core/errors.py

key-decisions:
  - "Kept /health outside /api/v1 while all feature routers mount under /api/v1, matching the frontend API prefix contract."
  - "Kept the /__test__/boom route mounted and tagged as __test__ so Phase 1 tests can exercise the unhandled-exception envelope."
  - "Added a lightweight catch-all middleware inside register_exception_handlers so ASGITransport verification receives the sanitized 500 response instead of a re-raised exception."

patterns-established:
  - "Stub routers raise HTTPException(501), which the global handlers serialize as {status:501, message:\"...\"}."
  - "CORS allow_origins comes from settings.cors_origins and contains http://localhost:5173 by default; '*' is not allowed."

requirements-completed: [FOUND-01, FOUND-03, FOUND-06]

duration: 4 min
completed: 2026-04-25
---

# Phase 01 Plan 02: FastAPI App Wiring Summary

**FastAPI app wiring with lifespan-managed engine setup, non-wildcard CORS, health check, API stubs, and sanitized error envelopes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T14:56:23Z
- **Completed:** 2026-04-25T15:00:31Z
- **Tasks:** 2 completed
- **Files modified:** 9

## Accomplishments

- Added `app.main:app` with `debug=False`, lifespan engine creation/disposal, CORS middleware, exception handler registration, `/health`, all six `/api/v1` routers, and `/__test__/boom`.
- Added router stubs for auth, elder, requestor, companion, KYC, and voice-to-profile so downstream phases can replace reserved paths without restructuring.
- Verified `http://localhost:5173` CORS preflight succeeds, `*` is absent from allowed origins, and error responses use the frontend `ApiError` shape.

## Task Commits

Each task was committed atomically:

1. **Task 2.1: Create app/main.py with lifespan, CORS, exception handlers, all router includes** - `091cb5a` (feat)
2. **Task 2.2: Create router stubs for health, auth, elder, requestor, companion, kyc, voice** - `0332276` (feat)
3. **Verification fix: type error middleware catch-all** - `e493582` (fix)

**Plan metadata:** included in final docs commit

## Files Created/Modified

- `backend/app/main.py` - FastAPI app, lifespan engine setup, CORS middleware, exception registration, health/router mounting, and `/__test__/boom`.
- `backend/app/routers/health.py` - `GET /health` returning exactly `{"status":"ok"}`.
- `backend/app/routers/auth.py` - `GET /api/v1/auth/__stub` returning 501 until Phase 2 auth endpoints replace it.
- `backend/app/routers/elder.py` - `GET /api/v1/elders/__stub` returning 501 until Phase 3 elder endpoints replace it.
- `backend/app/routers/requestor.py` - `GET /api/v1/requestor/__stub` returning 501 until Phase 3 requestor endpoints replace it.
- `backend/app/routers/companion.py` - `GET /api/v1/companions/__stub` returning 501 until Phase 3 companion endpoints replace it.
- `backend/app/routers/kyc.py` - `GET /api/v1/kyc/__stub` returning 501 until Phase 4 KYC endpoints replace it.
- `backend/app/routers/voice.py` - `GET /api/v1/voice-to-profile/__stub` returning 501 until Phase 5 voice endpoints replace it.
- `backend/app/core/errors.py` - Added a catch-all middleware wrapper so unhandled exceptions return the same sanitized envelope under ASGITransport and real HTTP.

## Registered Route Paths

- `/health`
- `/api/v1/auth/__stub`
- `/api/v1/elders/__stub`
- `/api/v1/requestor/__stub`
- `/api/v1/companions/__stub`
- `/api/v1/kyc/__stub`
- `/api/v1/voice-to-profile/__stub`
- `/__test__/boom`

## CORS Origin List

- `http://localhost:5173`

`*` is not present in `allow_origins`.

## Decisions Made

- `/health` remains unprefixed because Phase 1 success criteria and research call for a simple top-level health check.
- `allow_credentials=False` is used because the frontend sends bearer tokens, not cookies.
- The intentional `/__test__/boom` route stays mounted for Phase 1 test coverage and returns `{"status":500,"message":"Internal server error"}` with no traceback in the response body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Router modules needed before `app.main` could import**
- **Found during:** Task 2.1
- **Issue:** The plan ordered `main.py` before router files, but `main.py` imports those modules and Task 2.1 verification requires route registration.
- **Fix:** Created the reserved router modules during the same execution pass, then committed the app entrypoint and router stubs separately.
- **Files modified:** `backend/app/main.py`, `backend/app/routers/*.py`
- **Verification:** Import smoke and endpoint stub checks passed.
- **Committed in:** `091cb5a`, `0332276`

**2. [Rule 1 - Bug] ASGITransport re-raised the deliberate boom exception**
- **Found during:** Task 2.2 verification
- **Issue:** `httpx.ASGITransport(app=app)` re-raised the `RuntimeError` from `/__test__/boom` even though the response envelope was registered, blocking the planned verification command.
- **Fix:** Added a catch-all middleware wrapper in `register_exception_handlers` to return the sanitized 500 envelope before the exception can bubble to the test transport.
- **Files modified:** `backend/app/core/errors.py`
- **Verification:** `/__test__/boom` returns `{"status":500,"message":"Internal server error"}` and response text has no `Traceback`; `uv run mypy app` passes.
- **Committed in:** `0332276`, `e493582`

### Minor Formatting Adjustment

`ruff` split aliased `app.routers` imports in `backend/app/main.py`; behavior is unchanged.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug).  
**Impact on plan:** Both fixes were necessary for the plan's own verification commands and do not expand the API surface beyond the planned routes.

## Issues Encountered

- The first CORS introspection command used `Middleware.options`, but Starlette exposes constructor args as `Middleware.kwargs`; the verification was rerun with `kwargs` and passed.
- The first uvicorn smoke command failed because the inline shell quoting around the exact JSON body check was wrong. The same uvicorn boot/health check was rerun with corrected quoting and passed.

## Known Stubs

- `backend/app/routers/auth.py` - Phase 2 replaces `/api/v1/auth/__stub` with `/auth/register`, `/auth/login`, and `/auth/me`.
- `backend/app/routers/elder.py` - Phase 3 replaces `/api/v1/elders/__stub` with elder listings, bookings, earnings, listing patch, and booking response endpoints.
- `backend/app/routers/requestor.py` - Phase 3 replaces `/api/v1/requestor/__stub` with listing search/detail and requestor booking endpoints.
- `backend/app/routers/companion.py` - Phase 3 replaces `/api/v1/companions/__stub` with dashboard, alerts, timeline, and alert-preference endpoints.
- `backend/app/routers/kyc.py` - Phase 4 replaces `/api/v1/kyc/__stub` with session, verify, status, and retry endpoints.
- `backend/app/routers/voice.py` - Phase 5 replaces `/api/v1/voice-to-profile/__stub` with streaming, batch, and status endpoints.

## Verification

- PASS: `DATABASE_URL=postgresql+asyncpg://x/y JWT_SECRET=... uv run python -c "from app.main import app; ..."` import smoke asserted `/health`, `/__test__/boom`, at least one `/api/v1` route, `debug=False`, and CORS middleware.
- PASS: `httpx.AsyncClient(transport=ASGITransport(app=app))` checked `/health`, all six stub routes, and `/__test__/boom`.
- PASS: CORS preflight from `Origin: http://localhost:5173` to `/api/v1/auth/__stub` returned `access-control-allow-origin: http://localhost:5173`; `allow_origins` does not contain `*`.
- PASS: `uv run ruff check .`
- PASS: `uv run mypy app`
- PASS: `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000` booted and served `GET /health` with `{"status":"ok"}`.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Ready for `01-03-PLAN.md` to add SQLAlchemy models. Phase 2-5 router implementers can now import the mounted router modules and replace the intentional `__stub` routes with real endpoints.

## Self-Check: PASSED

- All key files listed in the plan exist.
- All three code commits exist in git history.
- Plan-level verification passed after the command adjustments noted above.

---
*Phase: 01-backend-scaffold-schema-seed*
*Completed: 2026-04-25*
