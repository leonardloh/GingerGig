---
phase: 01-backend-scaffold-schema-seed
plan: 06
subsystem: testing
tags: [pytest, pytest-asyncio, httpx, sqlalchemy, alembic, safety-guards]

requires:
  - phase: 01-backend-scaffold-schema-seed
    provides: FastAPI app shell, Alembic migration, and idempotent seed runner from plans 01-02, 01-04, and 01-05
provides:
  - Phase 1 pytest harness with async engine, SAVEPOINT sessions, and ASGITransport client
  - Four pinned D-17 tests for health, schema state, seed idempotency, and ApiError envelopes
  - Guardrail tests for dependency pins, forbidden deps/imports, CORS, create_all, and seed refusal
affects: [phase-02-auth, phase-03-persona-routers, phase-04-kyc, phase-05-voice, phase-08-deploy]

tech-stack:
  added: []
  patterns:
    - Session-scoped async test engine with function-scoped SAVEPOINT rollback
    - Tests prefer TEST_DATABASE_URL and fall back to normalized DATABASE_URL
    - Source-level guardrails enforce project pitfall rules

key-files:
  created:
    - backend/tests/__init__.py
    - backend/tests/conftest.py
    - backend/tests/test_health.py
    - backend/tests/test_migrations.py
    - backend/tests/test_seed.py
    - backend/tests/test_error_envelope.py
    - backend/tests/test_dep_pins.py
    - backend/tests/test_no_forbidden_imports.py
    - backend/tests/test_cors_no_wildcard.py
    - backend/tests/test_no_create_all.py
    - backend/tests/test_seed_refused_without_env.py
  modified:
    - backend/app/core/errors.py
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/codebase/TESTING.md

key-decisions:
  - "Used the approved DATABASE_URL fallback when TEST_DATABASE_URL is absent, normalizing postgresql:// to postgresql+asyncpg:// inside fixtures and command environments."
  - "Extended the dependency/import guardrails beyond the plan text to include forbidden dependencies and boto3 Transcribe Streaming misuse."
  - "Deferred test_models_match_alembic.py as planned; the lighter schema-state test verifies all 11 tables and the Alembic head revision."

patterns-established:
  - "Pytest DB tests run with DATABASE_SSL_MODE=disable for the current ApsaraDB endpoint."
  - "ApiError tests now cover both unhandled 500s and Starlette 404s."
  - "Guardrail tests scan app/, scripts/, pyproject.toml, and uv.lock without printing secrets."

requirements-completed: [FOUND-01, FOUND-06, DATA-01, DATA-06]

duration: 5 min
completed: 2026-04-25
---

# Phase 01 Plan 06: Test Harness Summary

**Phase 1 now has a runnable pytest verification harness covering health, schema, seed idempotency, ApiError envelopes, and safety guardrails**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-25T15:49:00Z
- **Completed:** 2026-04-25T15:53:35Z
- **Tasks:** 3 completed
- **Files modified:** 16

## Accomplishments

- Added `backend/tests/conftest.py` with a session-scoped async engine, function-scoped SAVEPOINT rollback, and `httpx.AsyncClient` using `ASGITransport`.
- Added the four pinned D-17 tests for `/health`, Alembic schema state, seed idempotency/password verification, and sanitized error envelopes.
- Added five recommended guardrail test files covering dependency pins, forbidden deps/imports, boto3 streaming misuse, wildcard CORS, `Base.metadata.create_all`, and `SeedRefusedError`.
- Fixed Starlette 404 handling so route misses also return the frontend `ApiError` envelope instead of `{"detail":"Not Found"}`.

## Task Commits

Each task was committed atomically:

1. **Task 6.1: tests package + async pytest fixtures** - `d664400` (test)
2. **Task 6.2: Four pinned D-17 tests** - `8a31b3c` (test)
3. **Task 6.3: Recommended guardrail tests + full suite** - `ec59676` (test)

**Plan metadata:** included in final docs commit.

## Test Inventory

- `tests/test_health.py` - `GET /health` returns exactly `{"status":"ok"}`.
- `tests/test_migrations.py` - Verifies all 11 Phase 1 tables exist and `alembic_version` is `0001_initial_schema`.
- `tests/test_seed.py` - Re-runs the seed, checks row counts stay stable, Siti's password hash is preserved, and all three demo passwords verify as `demo`.
- `tests/test_error_envelope.py` - Verifies `/__test__/boom` and 404 responses use `{status, message, detail?}` with no traceback leak.
- `tests/test_dep_pins.py` - Verifies required critical pins and absence of forbidden dependencies.
- `tests/test_no_forbidden_imports.py` - Scans `app/` and `scripts/` for forbidden imports plus boto3 Transcribe Streaming misuse.
- `tests/test_cors_no_wildcard.py` - Asserts configured CORS origins do not include `"*"`.
- `tests/test_no_create_all.py` - Asserts no `Base.metadata.create_all` call exists in `app/`, `scripts/`, or `alembic/`.
- `tests/test_seed_refused_without_env.py` - Exercises ApsaraDB refusal, localhost allowance, and explicit `ALLOW_SEED=1`.

## Decisions Made

- Followed the user's approved DB target adjustment: tests read local env internally, normalize the DSN at process/fixture scope, and do not print secrets.
- Kept `TEST_DATABASE_URL` support for future CI while allowing the current ApsaraDB endpoint to run from `DATABASE_URL`.
- Deferred `test_models_match_alembic.py` because it is the sixth, optional validation recommendation and requires a heavier live metadata diff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test process inherited a sync Postgres URL**
- **Found during:** Task 6.2 verification
- **Issue:** The first pytest run saw a plain `postgresql://` URL and SQLAlchemy tried to import `psycopg2`.
- **Fix:** Normalized `postgresql://` to `postgresql+asyncpg://` inside `tests/conftest.py` and command environments.
- **Files modified:** `backend/tests/conftest.py`
- **Verification:** Pinned tests and full suite passed against asyncpg.
- **Committed in:** `8a31b3c`

**2. [Rule 3 - Blocking] Session-scoped async engine crossed pytest event loops**
- **Found during:** Task 6.2 verification
- **Issue:** `pytest-asyncio` defaulted tests and fixtures to function-scoped loops while the engine was session-scoped, producing asyncpg "different loop" errors.
- **Fix:** Set `loop_scope="session"` on the engine, DB session, and client fixtures, and marked async test modules accordingly.
- **Files modified:** `backend/tests/conftest.py`, pinned async test modules
- **Verification:** Pinned tests and full suite passed without loop errors.
- **Committed in:** `8a31b3c`

**3. [Rule 1 - Bug] Starlette 404s bypassed the ApiError envelope**
- **Found during:** Task 6.2 verification
- **Issue:** Unknown routes returned Starlette's default `{"detail":"Not Found"}` instead of `{status, message}`.
- **Fix:** Registered the HTTP exception handler for `starlette.exceptions.HTTPException`.
- **Files modified:** `backend/app/core/errors.py`
- **Verification:** `tests/test_error_envelope.py::test_404_returns_api_error_envelope` passed.
- **Committed in:** `8a31b3c`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking).  
**Impact on plan:** All fixes were required to satisfy the plan's stated tests and do not expand product scope.

## Issues Encountered

- The current configured Postgres server still does not expose `gingergig_test`; this plan used the approved `DATABASE_URL` fallback and kept `TEST_DATABASE_URL` support for later CI or a dedicated test DB.
- `test_models_match_alembic.py` remains deferred as planned.

## Verification

Passed:

- `uv run pytest -v --tb=short` - 14 tests passed in 4.42s.
- `make test` - 14 tests passed in 4.68s.
- `uv run ruff check .` - all checks passed.
- `uv run mypy app` - success, no issues in 37 source files.

No test was skipped.

## User Setup Required

None - no new external service configuration required. Keep real DB credentials only in ignored local env files or shell environment.

## Next Phase Readiness

Ready for `01-07-PLAN.md` when requested. The Phase 1 verification harness is in place and can be reused by `/gsd-verify-work`; Plan 07 remains unexecuted per instruction.

## Self-Check: PASSED

- All key files listed in the plan exist.
- All three task commits exist in git history.
- Plan-level verification passed after the documented auto-fixes.

---
*Phase: 01-backend-scaffold-schema-seed*
*Completed: 2026-04-25*
