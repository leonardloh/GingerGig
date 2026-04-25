---
phase: 01-backend-scaffold-schema-seed
plan: 07
subsystem: infra
tags: [apsaradb, postgres, asyncpg, smoke-test, runbook]

requires:
  - phase: 01-backend-scaffold-schema-seed
    provides: FastAPI settings, asyncpg DB wiring, Alembic migration, and seed/test harness
provides:
  - Single-database ApsaraDB provisioning runbook for Phase 1
  - Secret-safe smoke-test command for `DATABASE_URL`
  - Current-instance SSL guidance using `DATABASE_SSL_MODE=disable`
affects: [phase-02-auth, phase-03-persona-routers, phase-08-deploy]

tech-stack:
  added: []
  patterns:
    - Smoke tests read ignored `.env` without printing connection strings
    - Direct asyncpg checks normalize `postgresql+asyncpg://` to `postgresql://`
    - Current ApsaraDB instance uses `DATABASE_SSL_MODE=disable`; `require` can be enabled later if SSL is enabled server-side

key-files:
  created:
    - backend/docs/APSARADB_PROVISIONING.md
    - .planning/phases/01-backend-scaffold-schema-seed/01-07-SUMMARY.md
  modified: []

key-decisions:
  - "Phase 1 uses the main `DATABASE_URL` database only; no `TEST_DATABASE_URL` or `gingergig_test` database is required for this milestone."
  - "Documented `DATABASE_SSL_MODE=disable` as the known-working value for the current ApsaraDB endpoint, with `require` reserved for a later server-side SSL enablement."
  - "Phase 8 must add the deployed Alibaba ECS egress IP to the same ApsaraDB allowlist."

patterns-established:
  - "Runbooks must avoid printing secrets while still providing executable verification commands."
  - "ApsaraDB access is controlled by an IP allowlist that covers the developer machine now and ECS later."

requirements-completed: [FOUND-05, DATA-01]

duration: 4 min
completed: 2026-04-25
---

# Phase 01 Plan 07: ApsaraDB Provisioning Runbook Summary

**A single-database ApsaraDB runbook now documents Phase 1 provisioning, current no-SSL connection mode, and a secret-safe `SELECT 1` smoke test**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T15:53:35Z
- **Completed:** 2026-04-25T15:57:24Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- Added `backend/docs/APSARADB_PROVISIONING.md`, a teammate-friendly runbook for the existing single `gingergig` ApsaraDB database in `ap-southeast-3`.
- Updated stale plan assumptions in execution: no separate `TEST_DATABASE_URL` / `gingergig_test`, and `DATABASE_SSL_MODE=disable` for the current instance.
- Verified live connectivity from `backend/.env` with a direct asyncpg `SELECT 1` smoke test that does not print secrets.
- Confirmed `backend/.env` is ignored and not tracked by git.
- Captured the Phase 8 deployment note that the Alibaba ECS egress IP must be added to the same ApsaraDB allowlist.

## Task Commits

Each task was committed atomically:

1. **Task 7.1: Write the ApsaraDB provisioning runbook** - `97dd6e9` (docs)
2. **Task 7.2: Verify current `.env` smoke test** - verification-only task; results captured in this metadata commit.

**Plan metadata:** included in final docs commit.

## Files Created/Modified

- `backend/docs/APSARADB_PROVISIONING.md` - Single-DB ApsaraDB runbook with setup steps, smoke-test commands, troubleshooting, and Phase 8 allowlist note.
- `.planning/phases/01-backend-scaffold-schema-seed/01-07-SUMMARY.md` - This execution summary.

## Verification

Passed:

- `test -f backend/docs/APSARADB_PROVISIONING.md && rg -n "ap-southeast-3|gingergig|DATABASE_SSL_MODE|whitelist|allowlist|schema public|postgresql\\+asyncpg|Phase 8|ECS" backend/docs/APSARADB_PROVISIONING.md`
- `git ls-files --error-unmatch backend/.env >/dev/null 2>&1 && echo 'FAIL: backend/.env is tracked' || echo 'OK: backend/.env is not tracked'` -> `OK: backend/.env is not tracked`
- `cd backend && uv run python - <<'PY' ... asyncpg.connect(...); SELECT 1 ... PY` -> `OK: DATABASE_URL reachable; SELECT 1 returned 1; ssl_mode=disable`

No `TEST_DATABASE_URL` verification was run because the approved Phase 1 target is `DATABASE_URL` only.

## Decisions Made

- Used the user's latest approved single-DB setup instead of the stale plan's two-database assumption.
- Documented the current SSL behavior as `disable`, while preserving a clear path to switch to `require` if the ApsaraDB instance enables SSL server-side later.
- Did not update `STATE.md`, `ROADMAP.md`, or mark Phase 1 complete; phase verification remains a separate explicit step.

## Deviations from Plan

### Approved Plan Adaptations

**1. Single database target**
- **Found during:** Pre-execution context review
- **Issue:** The stale plan required `TEST_DATABASE_URL` and `gingergig_test`.
- **Fix:** Runbook and smoke test now use only `DATABASE_URL`.
- **Files modified:** `backend/docs/APSARADB_PROVISIONING.md`
- **Verification:** Smoke test passed against `DATABASE_URL`.
- **Committed in:** `97dd6e9`

**2. Current SSL mode**
- **Found during:** Pre-execution context review and smoke verification
- **Issue:** The stale plan required SSL/TLS, but current ApsaraDB verification succeeds with `DATABASE_SSL_MODE=disable`.
- **Fix:** Runbook documents `disable` for this instance and notes `require` can be used later if SSL is enabled server-side.
- **Files modified:** `backend/docs/APSARADB_PROVISIONING.md`
- **Verification:** `SELECT 1` passed with `ssl_mode=disable`.
- **Committed in:** `97dd6e9`

---

**Total deviations:** 0 auto-fixed code deviations; 2 approved documentation/verification adaptations.  
**Impact on plan:** The runbook now matches the live infrastructure and current user decisions without changing application code.

## Issues Encountered

- Local `backend/.env` used `DATABASE_SSL_MODE=disabled`; the ignored local file was corrected to `DATABASE_SSL_MODE=disable` before the smoke test. No secrets were printed or committed.

## User Setup Required

None - the user already created `backend/.env`, whitelisted the dev machine IP, and granted schema permissions.

Keep real credentials only in ignored local env files or shell environment.

## Next Phase Readiness

Plan 07 is complete and ready for separate Phase 1 verification when requested. Phase 1 was not marked complete in this execution.

## Self-Check: PASSED

- Runbook exists and includes `ap-southeast-3`, `gingergig`, SSL mode guidance, whitelist/allowlist troubleshooting, schema CREATE permission troubleshooting, asyncpg DSN normalization, and the Phase 8 ECS allowlist note.
- Smoke test passed against `DATABASE_URL` only.
- `.env` remains untracked.
- No frontend files were changed.

---
*Phase: 01-backend-scaffold-schema-seed*
*Completed: 2026-04-25*
