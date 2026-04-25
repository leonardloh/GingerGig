---
phase: 01-backend-scaffold-schema-seed
status: issues_found
review_depth: standard
findings_count: 5
critical_count: 0
high_count: 1
medium_count: 2
low_count: 2
---

# Phase 01 Code Review

## Findings

### High - `backend/scripts/seed.py`

**Issue:** Seed reruns are not truly idempotent because every `ON CONFLICT DO UPDATE` path unconditionally sets `updated_at = func.now()`, even when the incoming seed values are identical.

**Impact:** This violates the project invariant that re-running the seed leaves the DB unchanged. The current tests only compare row counts and Siti's password hash, so timestamp and row-version drift can pass unnoticed. It also makes future ordering, audit, and "what changed?" debugging noisy.

**Suggested fix:** Remove unconditional `updated_at` writes from seed upserts, or add `WHERE` clauses that update only when non-timestamp columns are distinct. Extend the seed idempotency test to compare a canonical snapshot hash across two runs, including timestamps unless intentionally excluded and documented.

### Medium - `backend/app/models/_mixins.py`, `backend/alembic/versions/0001_initial_schema.py`

**Issue:** `created_at` and `updated_at` are modeled and migrated as timezone-naive timestamps. The mixin omits `DateTime(timezone=True)`, and the initial migration creates both columns with `sa.DateTime()`.

**Impact:** This diverges from the locked Phase 1 decision that every table uses `TIMESTAMPTZ`. Future locale-sensitive behavior, ordering, and debugging across Malaysia/Singapore cloud resources can produce ambiguous timestamps.

**Suggested fix:** Change `TimestampMixin` to use `DateTime(timezone=True)` and update the initial migration, or add a follow-up migration that alters all existing `created_at`/`updated_at` columns to `TIMESTAMPTZ`.

### Medium - `backend/README.md`, `backend/.env.example`

**Issue:** Setup docs and `.env.example` still instruct developers to provision and fill `TEST_DATABASE_URL` / `gingergig_test`, and the README says to enable TLS. The approved Phase 1 decision is a single `DATABASE_URL` database, with the current instance using `DATABASE_SSL_MODE=disable`.

**Impact:** A new developer following the backend README can try to create/use a non-existent test database or set the wrong SSL mode, contradicting the runbook and causing migration/test connection failures.

**Suggested fix:** Update README and `.env.example` to match the current single-DB Phase 1 setup. If `TEST_DATABASE_URL` remains as future CI support, mark it clearly optional and not required for Phase 1.

### Low - `backend/app/main.py`

**Issue:** The deliberate `/__test__/boom` route is mounted on the production app object unconditionally.

**Impact:** A deployed backend would expose an unauthenticated route that intentionally raises and logs a 500. It does not leak tracebacks, but it creates avoidable log noise, false alarms, and a trivial endpoint for abuse.

**Suggested fix:** Move the boom route into the test fixture, or gate it behind an explicit test-only setting that is disabled by default in real runtime environments.

### Low - `backend/app/db/session.py`

**Issue:** `get_sessionmaker(engine)` caches the first sessionmaker globally and ignores later engine arguments.

**Impact:** In single-process scripts or tests that construct more than one engine, later callers can silently get sessions bound to the wrong database/engine. This is especially risky because the tests support both `TEST_DATABASE_URL` and `DATABASE_URL`, and the seed script also calls this helper.

**Suggested fix:** Either return a new `async_sessionmaker` for each supplied engine, cache by engine identity, or make the helper explicitly process-singleton with no engine parameter and a reset hook for tests.

## Test Gaps

- Seed idempotency does not compare a canonical row hash across consecutive runs, so timestamp drift and other non-count changes are missed.
- Migration/schema tests verify table existence and Alembic revision, but do not assert `created_at` / `updated_at` are `TIMESTAMPTZ`.
- Tests do not guard the approved single-DB Phase 1 setup against stale `TEST_DATABASE_URL` / `gingergig_test` documentation drifting back in.
- The error-envelope test depends on a route mounted in the real app rather than a test-only app fixture.

## Summary

Reviewed the scoped Phase 01 backend scaffold, schema, seed, test, and runbook files at standard depth. No critical security issues were found, and the forbidden dependency/import rules are covered by tests, but the phase has one core idempotency defect plus schema and setup-documentation drift that should be fixed before treating Phase 01 as clean.
