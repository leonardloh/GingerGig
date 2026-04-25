---
phase: 03-persona-routers-elder-requestor-companion
plan: 01
subsystem: testing
tags: [fastapi, pytest, httpx, persona-routers, authz, locale]

requires:
  - phase: 02-auth-bearer-middleware
    provides: demo JWT login and bearer current-user dependencies
provides:
  - Elder persona contract tests for listings, listing mutation, bookings, response transitions, and earnings
  - Requestor persona contract tests for listing search/detail, seeded match fields, booking creation, and booking history
  - Companion persona contract tests for dashboard, alerts, timeline, alert preferences, and role guards
  - Cross-route authz and locale projection tests for bearer errors, locale fallback, SQL coalesce, and no live AI runtime imports
affects: [phase-03-persona-routers, backend-tests, frontend-api-contract]

tech-stack:
  added: []
  patterns:
    - httpx ASGITransport contract tests with auth through /api/v1/auth/login
    - deterministic seeded IDs via app.core.ids.entity_id
    - collect-first Wave 0 harness for later router implementation plans

key-files:
  created:
    - backend/tests/test_persona_elder.py
    - backend/tests/test_persona_requestor.py
    - backend/tests/test_persona_companion.py
    - backend/tests/test_persona_locale_and_authz.py
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Contract tests authenticate through the public auth route instead of minting tokens or bypassing dependencies."
  - "Phase 3 runtime requirements remain pending until router implementation plans pass these tests; this plan only establishes the verification harness."

patterns-established:
  - "Persona tests use local login_headers helpers that post demo credentials to /api/v1/auth/login."
  - "Seeded data references use entity_id(kind, slug) instead of hardcoded UUIDs."
  - "Wave 0 tests are written to collect before implementation and fail meaningfully once executed."

requirements-completed:
  - ELDER-01
  - ELDER-02
  - ELDER-03
  - ELDER-04
  - ELDER-05
  - REQ-01
  - REQ-02
  - REQ-03
  - REQ-04
  - REQ-05
  - COMP-01
  - COMP-02
  - COMP-03
  - COMP-04

duration: 3 min
completed: 2026-04-25
---

# Phase 03 Plan 01: Persona Router Contract Test Harness Summary

**FastAPI persona contract tests now pin the elder, requestor, companion, locale, and authorization behavior that Phase 3 implementation plans must satisfy.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-25T16:27:00Z
- **Completed:** 2026-04-25T16:30:12Z
- **Tasks:** 4 completed
- **Files modified:** 6

## Accomplishments

- Added four backend-only persona test files covering the Phase 3 route surface through `httpx.AsyncClient`.
- Ensured all contract tests authenticate via `/api/v1/auth/login` with seeded demo users and deterministic `entity_id()` references.
- Captured role mismatch, missing bearer, ownership, locale projection/fallback, seeded match fields, booking transitions, and companion preference persistence contracts.

## Task Commits

Each task was committed atomically:

1. **Task 03-01-01: Add shared persona test helpers and elder contract tests** - `41b7730` (test)
2. **Task 03-01-02: Add requestor route contract tests** - `211f1d6` (test)
3. **Task 03-01-03: Add companion route contract tests** - `cb30055` (test)
4. **Task 03-01-04: Add locale projection and cross-route authz tests** - `83f21ba` (test)

**Plan metadata:** pending at summary creation time.

## Files Created/Modified

- `backend/tests/test_persona_elder.py` - Elder listings, listing patch, bookings, booking response, earnings, and elder ownership contracts.
- `backend/tests/test_persona_requestor.py` - Requestor listing search/detail, seeded match fields, booking creation/history, and requestor-only role contracts.
- `backend/tests/test_persona_companion.py` - Companion dashboard, alerts, timeline, alert preference persistence, and role rejection contracts.
- `backend/tests/test_persona_locale_and_authz.py` - Missing bearer, locale projection/fallback, SQL `coalesce` helper, and no-live-AI runtime import contracts.
- `.planning/STATE.md` - Current position advanced to Phase 03 plan 2 of 5.
- `.planning/ROADMAP.md` - Phase 03 progress updated to 1/5 plans complete.

## Verification

- `cd backend && uv run pytest tests/test_persona_elder.py --collect-only -q` - PASS, 7 tests collected.
- `cd backend && uv run pytest tests/test_persona_requestor.py --collect-only -q` - PASS, 8 tests collected.
- `cd backend && uv run pytest tests/test_persona_companion.py --collect-only -q` - PASS, 5 tests collected.
- `cd backend && uv run pytest tests/test_persona_locale_and_authz.py --collect-only -q` - PASS, 5 tests collected.
- `cd backend && uv run pytest tests/test_persona_elder.py tests/test_persona_requestor.py tests/test_persona_companion.py tests/test_persona_locale_and_authz.py --collect-only -q` - PASS, 25 tests collected.
- `cd backend && rg "api/v1/(elders|requestor|companions)|matchScore|matchReason|requestorInitials|weeklyEarnings" tests/test_persona_*.py` - PASS, expected contract markers found.

## Decisions Made

Phase 3 runtime requirements were not marked complete in `REQUIREMENTS.md` because this Wave 0 plan creates the harness only. The implementation plans must make these tests pass before those runtime requirements should move from pending to complete.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed. **Impact:** No scope creep; frontend files were not modified and no live AI dependency was introduced.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-02-PLAN.md` (shared persona schemas, query helpers, and seeded match persistence). The contract suite collects now and will become the regression target for the subsequent Phase 3 router implementation plans.

## Self-Check: PASSED

All four planned test files exist, collect successfully, authenticate through `/api/v1/auth/login`, use deterministic IDs, and cover the Phase 3 route and response contracts requested by the plan.

---
*Phase: 03-persona-routers-elder-requestor-companion*
*Completed: 2026-04-25*
