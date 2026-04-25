---
phase: 03-persona-routers-elder-requestor-companion
plan: 02
subsystem: backend
tags: [fastapi, sqlalchemy, alembic, postgres, persona, locale, seed]

requires:
  - phase: 03-01
    provides: Persona route contract tests and locale/authz expectations
provides:
  - Frontend-shaped persona DTO schemas for elder, requestor, and companion routes
  - DB-backed listing distance, match score, and locale-aware match reason persistence
  - Shared persona query helpers for locale SQL expressions, authz checks, batching, mappers, and KL windows
affects: [phase-03-persona-routers, backend-tests, frontend-api-contract]

tech-stack:
  added: []
  patterns:
    - SQL-level locale projection with fixed column mappings and English fallback via coalesce
    - DB-first requestor match metadata with deterministic fallback helpers only for null columns
    - Thin-router helper surface for Phase 3 Wave 2 plans

key-files:
  created:
    - backend/app/schemas/persona.py
    - backend/app/services/persona_queries.py
    - backend/alembic/versions/0002_listing_demo_match_fields.py
  modified:
    - backend/app/models/listing.py
    - backend/scripts/seed_data.py
    - backend/scripts/seed.py
    - backend/tests/test_migrations.py
    - backend/tests/test_seed.py

key-decisions:
  - "Persist requestor smart-match demo fields on listings instead of importing seed constants at runtime."
  - "Leave non-English seeded match reasons nullable so SQL coalesce falls back to English deterministically."
  - "Keep Phase 3 helper code free of Qwen/DashScope/OpenAI/Redis runtime dependencies."

patterns-established:
  - "locale_expr(model, stem, locale, label) chooses from fixed locale mappings and wraps func.coalesce(..., english)."
  - "Booking response mapping uses denormalized booking snapshot columns, including quantity_label as the frontend qty field."
  - "Requestor match fields are seeded through Postgres upserts and constrained by an Alembic-managed 0..100 check."

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

duration: 6 min
completed: 2026-04-25
---

# Phase 03 Plan 02: Shared Persona Foundation Summary

**Persona DTOs, DB-backed smart-match fields, seed upserts, and shared SQL/query helpers now support the Phase 3 router implementation plans.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-25T16:35:00Z
- **Completed:** 2026-04-25T16:41:11Z
- **Tasks:** 4 completed
- **Files modified:** 8

## Accomplishments

- Added `backend/app/schemas/persona.py` with camelCase Pydantic DTOs for listings, bookings, earnings, companion dashboards, alerts, timeline events, and preferences.
- Added listing match persistence via `0002_listing_demo_match_fields`, model columns, seed upserts, and tests for non-null seeded `distance_label`, `match_score`, and `match_reason_en`.
- Added `backend/app/services/persona_queries.py` with locale `coalesce` helpers, role/self/companion-link checks, menu/review batching, listing/booking mappers, booking snapshot helpers, KL calendar windows, and deterministic match fallbacks.

## Task Commits

Each task was committed atomically:

1. **Task 03-02-01: Add persona DTO schemas matching backend response contracts** - `b6197d8` (feat)
2. **Task 03-02-02: Add listing match-field model and Alembic migration** - `9782888` (feat)
3. **Task 03-02-03: Persist seeded provider distance and match reasons through seed upserts** - `83f0ec5` (feat)
4. **Task 03-02-04: Add all shared persona SQL/query/mapping helpers** - `c95b494` (feat)
5. **Migration fix: Align listing match constraint naming** - `db2611f` (fix)

**Plan metadata:** pending at summary creation time.

## Verification

- `cd backend && uv run alembic upgrade head` - PASS after sourcing `.env` and normalizing `DATABASE_URL` to `postgresql+asyncpg://`.
- `cd backend && ALLOW_SEED=1 uv run python -m scripts.seed && ALLOW_SEED=1 uv run python -m scripts.seed` - PASS with the same local DB URL normalization.
- `cd backend && uv run pytest tests/test_migrations.py tests/test_seed.py -q` - PASS, 6 tests passed.
- `cd backend && uv run ruff check app/schemas/persona.py app/services/persona_queries.py alembic/versions/0002_listing_demo_match_fields.py scripts/seed.py scripts/seed_data.py tests/test_migrations.py tests/test_seed.py` - PASS.
- `cd backend && rg "distance_label|match_score|match_reason_en|ck_listings_match_score_range" app alembic scripts tests` - PASS, expected markers found.
- `cd backend && ! rg "qwen|DashScope|DASHSCOPE|openai|redis" app/routers/requestor.py app/services/persona_queries.py` - PASS.
- `cd backend && uv run pytest tests/test_migrations.py tests/test_seed.py tests/test_persona_locale_and_authz.py -q` - PARTIAL: 8 passed, 3 failed because persona route stubs still return 404. Those route implementations are owned by `03-03`, `03-04`, and `03-05`.

## Decisions Made

Persisted smart-match fields directly on `listings` so requestor search/detail can remain database-backed and deterministic. Non-English match reason columns are intentionally nullable in seed data; later routes should use `locale_expr(Listing, "match_reason", locale, "matchReason")` for English fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Alembic check-constraint naming**
- **Found during:** Plan-level pytest verification
- **Issue:** `op.create_check_constraint("ck_listings_match_score_range", ...)` was transformed by naming conventions into `ck_listings_ck_listings_match_score_range`.
- **Fix:** Used `op.f("ck_listings_match_score_range")` in upgrade and made downgrade tolerate the earlier local generated name.
- **Files modified:** `backend/alembic/versions/0002_listing_demo_match_fields.py`
- **Verification:** Reapplied `0002`, reran migration/seed tests, and `tests/test_migrations.py` passed.
- **Committed in:** `db2611f`

---

**Total deviations:** 1 auto-fixed (1 bug). **Impact:** Migration naming now matches the plan and test expectation; no scope creep.

## Issues Encountered

The plan-level pytest command includes `tests/test_persona_locale_and_authz.py`, whose route-level tests intentionally remain red until Wave 2 router plans replace stubs. The helper/no-live-AI tests in that file pass, but three endpoint tests return 404 because routes are not yet implemented.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-03-PLAN.md` (elder listings, bookings, responses, and earnings router). Later Wave 2 plans should consume `persona_queries.py` rather than adding new helper functions there.

## Self-Check: PASSED

All planned files exist, all task commits are present, migrations and seed upserts agree on the six match columns, and focused 03-02 verification passes. The remaining route contract failures are downstream Wave 2 work, not missing shared foundation work.

---
*Phase: 03-persona-routers-elder-requestor-companion*
*Completed: 2026-04-25*
