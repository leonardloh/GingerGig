---
phase: 03-persona-routers-elder-requestor-companion
plan: 03
subsystem: backend
tags: [fastapi, sqlalchemy, persona, elder, bookings, earnings]

requires:
  - phase: 03-02
    provides: Persona DTO schemas, query helpers, booking mappers, and KL calendar windows
provides:
  - Elder-owned listing read and patch routes
  - Top-level listing detail route with menu and reviews
  - Elder booking list and pending-only booking response transition route
  - Elder earnings summary over completed bookings using Kuala Lumpur month boundaries
affects: [phase-03-persona-routers, backend-tests, frontend-api-contract]

tech-stack:
  added: []
  patterns:
    - Thin FastAPI routes using get_current_user, get_db, and persona query helpers
    - Direct ownership checks returning 403, missing rows returning 404, and non-pending transitions returning 409
    - Booking display fields mapped from denormalized booking rows

key-files:
  created:
    - .planning/phases/03-persona-routers-elder-requestor-companion/03-03-SUMMARY.md
  modified:
    - backend/app/routers/elder.py
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "Kept all route implementation in backend/app/routers/elder.py and reused persona_queries.py without modification."
  - "Allowed top-level listing detail for requestors on active listings, owning elders on their listings, and linked companions on active linked listings."

patterns-established:
  - "Elder routes validate role/self first, then execute explicit SQLAlchemy joins for ownership-sensitive data."
  - "PATCH /listings/{listingId} applies only non-null ListingPatch fields via a fixed camelCase-to-model mapping."
  - "Earnings totals are converted to JSON numbers at the route boundary."

requirements-completed:
  - ELDER-01
  - ELDER-02
  - ELDER-03
  - ELDER-04
  - ELDER-05
  - REQ-02

duration: 7 min
completed: 2026-04-25
---

# Phase 03 Plan 03: Elder Listings, Bookings, Responses, and Earnings Router Summary

**DB-backed elder routes now serve Siti's listings, listing detail, booking queue, booking response transitions, and completed-booking earnings totals through the existing persona DTOs.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-25T16:39:00Z
- **Completed:** 2026-04-25T16:46:08Z
- **Tasks:** 4 completed
- **Files modified:** 5

## Accomplishments

- Replaced the elder router stub with protected DB-backed endpoints for elder listing reads, listing patch, top-level listing detail, elder bookings, booking responses, and earnings summary.
- Enforced the planned role and ownership behavior: elder self access, listing/booking owner checks, `404` for missing rows, and `409` for non-pending booking responses.
- Preserved booking denormalization by returning booking snapshot columns through `booking_to_response()` instead of recomputing requestor or listing display text.

## Task Commits

Each task was committed atomically where practical:

1. **Task 03-03-01: Implement elder listings read and listing update routes** - `fe085e4` (feat)
2. **Task 03-03-02: Implement elder bookings read route** - `9a0ab22` (feat)
3. **Task 03-03-03: Implement booking response transition route** - `5e9828d` (feat)
4. **Task 03-03-04: Implement elder earnings summary using KL calendar month** - `f997e6c` (feat)
5. **Implementation fix: Restore elder listing response mapping after commit splitting** - `ccf1319` (fix)

**Plan metadata:** pending at summary creation time.

## Verification

- `cd backend && uv run pytest tests/test_persona_elder.py::test_siti_can_list_own_elder_listings tests/test_persona_elder.py::test_requestor_cannot_read_siti_elder_listings tests/test_persona_elder.py::test_siti_can_patch_own_listing_and_receive_full_shape tests/test_persona_elder.py::test_non_owners_cannot_patch_siti_listing tests/test_persona_requestor.py::test_listing_detail_returns_reviews_and_full_menu -q` - PASS, 5 tests passed.
- `cd backend && uv run pytest tests/test_persona_elder.py::test_siti_elder_bookings_include_denormalised_snapshots -q` - PASS, 1 test passed.
- `cd backend && uv run pytest tests/test_persona_elder.py::test_siti_can_accept_pending_booking_once -q` - PASS, 1 test passed.
- `cd backend && uv run pytest tests/test_persona_elder.py::test_siti_earnings_summary_has_numeric_totals -q` - PASS, 1 test passed.
- `cd backend && uv run pytest tests/test_persona_elder.py -q` - PASS, 7 tests passed.
- `cd backend && uv run pytest tests/test_persona_elder.py tests/test_persona_requestor.py tests/test_persona_locale_and_authz.py -q` - PARTIAL: 11 passed, 9 failed. Failures are requestor search/bookings and companion alert/dashboard routes still returning 404 from downstream `03-04`/`03-05` stubs; the elder tests and top-level listing detail passed.
- `cd backend && rg "/elders/\{elderId\}/listings|/listings/\{listingId\}|/bookings/\{bookingId\}/respond|earnings/summary" app/routers/elder.py` - PASS, expected route markers found.
- `cd backend && rg "ZoneInfo\(\"Asia/Kuala_Lumpur\"\)|func\.sum|status.*completed" app/services/persona_queries.py app/routers/elder.py` - PASS, expected KL timezone and completed-booking aggregate markers found.

## Files Created/Modified

- `backend/app/routers/elder.py` - Elder route implementation for listings, listing detail, bookings, response transitions, and earnings.
- `.planning/REQUIREMENTS.md` - Marked ELDER-01..05 and REQ-02 complete.
- `.planning/ROADMAP.md` - Marked `03-03-PLAN.md` complete and advanced Phase 3 progress to 3/5.
- `.planning/STATE.md` - Advanced current position to `03-04-PLAN.md`.
- `.planning/phases/03-persona-routers-elder-requestor-companion/03-03-SUMMARY.md` - Plan outcome summary.

## Decisions Made

Kept `persona_queries.py` read-only as requested. The existing helpers were sufficient for locale projections, menu/review batching, booking mapping, companion link checks, and KL month windows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored elder listing response mapping after task commit splitting**
- **Found during:** Plan-level verification
- **Issue:** While splitting one-file work into per-task commits, the elder listing mapper block was accidentally moved below the earnings return, causing `GET /elders/{elderId}/listings` to return `None`.
- **Fix:** Moved the listing rows/menu mapping back inside `get_elder_listings()` and removed the unreachable block from the earnings handler.
- **Files modified:** `backend/app/routers/elder.py`
- **Verification:** `cd backend && uv run pytest tests/test_persona_elder.py -q` passed.
- **Committed in:** `ccf1319`

---

**Total deviations:** 1 auto-fixed (1 bug). **Impact:** Fix restored planned behavior; no scope creep and no helper/frontend files were modified.

## Issues Encountered

The plan-level combined pytest command remains partial because `03-04` requestor routes and `03-05` companion routes are still stubs. This matches the phase plan split; the focused elder suite and top-level listing detail contract pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-04-PLAN.md` (requestor search and bookings router). The top-level listing detail route is already available at `/api/v1/listings/{listingId}` for requestor plan tests.

## Self-Check: PASSED

All `03-03` routes are present, `__stub` is removed from `backend/app/routers/elder.py`, focused elder tests pass, `persona_queries.py` was not modified, and ownership/status error behavior matches the plan.

---
*Phase: 03-persona-routers-elder-requestor-companion*
*Completed: 2026-04-25*
