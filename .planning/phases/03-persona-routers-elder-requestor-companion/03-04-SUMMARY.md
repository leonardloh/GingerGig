---
phase: 03-persona-routers-elder-requestor-companion
plan: 04
subsystem: backend
tags: [fastapi, sqlalchemy, persona, requestor, search, bookings]

requires:
  - phase: 03-02
    provides: Persona DTO schemas, locale projections, listing/booking mappers, and seeded match fields
  - phase: 03-03
    provides: Top-level listing detail route at /api/v1/listings/{listingId}
provides:
  - DB-backed requestor listing search with elder snapshots, menus, and seeded smart-match fields
  - Requestor-only booking creation with server-inferred denormalized snapshots
  - Requestor-only booking history filtered by authenticated user id
affects: [phase-03-persona-routers, backend-tests, frontend-api-contract]

tech-stack:
  added: []
  patterns:
    - Thin requestor routes using get_current_user, get_db, SQLAlchemy selects, and persona query mappers
    - DB-first listing matchScore/matchReason with deterministic fallback only when DB fields are null
    - Requestor booking writes infer snapshots server-side from current user, listing, menu, and locale-projected title

key-files:
  created:
    - .planning/phases/03-persona-routers-elder-requestor-companion/03-04-SUMMARY.md
  modified:
    - backend/app/routers/requestor.py

key-decisions:
  - "Kept listing detail delegated to backend/app/routers/elder.py so /api/v1/listings/{listingId} remains top-level, not /api/v1/requestor/listings/{listingId}."
  - "Accepted empty max_distance_km query values as no filter because the frontend/test contract can send an empty string."

patterns-established:
  - "Requestor search builds fixed SQL locale expressions for title and match reason, then batches menus by listing id."
  - "Requestor booking creation uses booking_snapshot_fields() and booking_to_response() rather than changing the frontend payload."

requirements-completed:
  - REQ-01
  - REQ-02
  - REQ-03
  - REQ-04
  - REQ-05

duration: 4 min
completed: 2026-04-25
---

# Phase 03 Plan 04: Requestor Search and Bookings Router Summary

**Requestor routes now search active listings from Postgres, preserve top-level listing detail, create pending bookings, and list Amir's booking history through protected FastAPI endpoints.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T16:48:00Z
- **Completed:** 2026-04-25T16:52:10Z
- **Tasks:** 4 completed
- **Files modified:** 2

## Accomplishments

- Replaced the requestor stub with `GET /requestor/listings/search`, including role checks, active-listing filtering, halal/query filters, elder snapshots, menus, and DB-first `matchScore`/`matchReason`.
- Verified listing detail remains owned by the no-prefix elder router at `/api/v1/listings/{listingId}` and is not mounted under `/api/v1/requestor`.
- Added `POST /requestor/bookings` and `GET /requestor/bookings` with requestor-only authorization, pending booking creation, denormalized snapshots, and authenticated-user filtering.

## Task Commits

Each code task was committed atomically where practical:

1. **Task 03-04-01: Implement requestor listing search with seeded DB match fields** - `1f87491` (feat)
2. **Task 03-04-02: Keep listing detail delegated to the no-prefix router** - no code commit; verified existing `03-03` route ownership.
3. **Task 03-04-03: Implement requestor booking creation with denormalized snapshots** - `11c3d3d` (feat)
4. **Task 03-04-04: Implement requestor booking history route** - `35b8c6f` (feat)

**Plan metadata:** pending at summary creation time.

## Verification

- `cd backend && uv run pytest tests/test_persona_requestor.py -q` - PASS, 8 tests passed.
- `cd backend && uv run pytest tests/test_persona_requestor.py tests/test_persona_locale_and_authz.py -q` - PARTIAL: 11 passed, 2 failed because `03-05` companion dashboard/alerts routes are still unimplemented and return 404.
- `cd backend && rg "/listings/search|/bookings|max_distance_km|halal_only|matchScore|matchReason" app/routers/requestor.py app/services/persona_queries.py` - PASS, expected markers found.
- `cd backend && rg "/listings/\\{listingId\\}" app/routers/elder.py` - PASS, top-level listing detail route found in the no-prefix elder router.
- `cd backend && ! rg "qwen|DashScope|DASHSCOPE|openai|redis" app/routers/requestor.py app/services/persona_queries.py` - PASS, no live AI/cache runtime terms found.
- `cd backend && uv run ruff check app/routers/requestor.py` - PASS.

## Files Created/Modified

- `backend/app/routers/requestor.py` - Requestor listing search, booking creation, and booking history routes.
- `.planning/phases/03-persona-routers-elder-requestor-companion/03-04-SUMMARY.md` - Plan outcome summary.

## Decisions Made

Kept all implementation inside `backend/app/routers/requestor.py` and did not modify `backend/app/routers/elder.py`, `backend/app/services/persona_queries.py`, frontend files, or seed files.

`max_distance_km` is accepted as a string and parsed locally so empty query-string values from the existing client/test contract behave as "no filter" instead of a FastAPI `422`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Normalized requestor-facing self snapshot in booking history**
- **Found during:** Task 03-04-04 (requestor booking history)
- **Issue:** Seeded elder booking rows use Amir's `requestor_user_id` for several prototype requestor display names (`Nadia`, `Lim Family`, etc.), so a strict `requestor_user_id` filter returned rows that failed the requestor history contract asserting Amir's own name.
- **Fix:** The requestor history route still filters by `Booking.requestor_user_id == current_user.id` and maps via `booking_to_response()`, then normalizes the requestor-facing self fields (`requestorName`, `requestorInitials`, `requestorAvatarUrl`) to the authenticated user.
- **Files modified:** `backend/app/routers/requestor.py`
- **Verification:** `cd backend && uv run pytest tests/test_persona_requestor.py -q` passed.
- **Committed in:** `35b8c6f`

---

**Total deviations:** 1 auto-fixed (1 bug). **Impact:** Requestor history now satisfies the current contract without changing elder booking snapshots, seed data, helper code, or frontend code.

## Issues Encountered

The plan-level combined pytest command still has two failures in `tests/test_persona_locale_and_authz.py` because companion dashboard and alert endpoints belong to `03-05` and are still stubs. Requestor-specific tests and no-live-AI/locale fallback checks pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-05-PLAN.md` (companion dashboard, alerts, timeline, and preferences). The remaining locale/authz failures are on the companion route surface, not requestor search or bookings.

## Self-Check: PASSED

All planned requestor routes are present, `__stub` is removed from `backend/app/routers/requestor.py`, no requestor-prefixed listing detail route exists, focused requestor tests pass, and no live Qwen/DashScope/OpenAI/Redis imports were introduced.

---
*Phase: 03-persona-routers-elder-requestor-companion*
*Completed: 2026-04-25*
