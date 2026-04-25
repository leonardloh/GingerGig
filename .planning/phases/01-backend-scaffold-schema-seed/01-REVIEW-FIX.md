---
phase: 01-backend-scaffold-schema-seed
source_review: 01-REVIEW.md
status: resolved
findings_resolved: 5
completed: 2026-04-25
---

# Phase 01 Review Fix Summary

All 5 findings from `01-REVIEW.md` were addressed before phase verification.

## Fixes

1. **Seed idempotency** - Removed unconditional `updated_at` writes from seed upserts and strengthened `test_seed_idempotent` to compare canonical row snapshots across reruns.
2. **TIMESTAMPTZ timestamps** - Changed `TimestampMixin` and `0001_initial_schema.py` shared timestamp columns to `DateTime(timezone=True)` and added a migration test for `timestamp with time zone`.
3. **Setup documentation drift** - Updated `backend/.env.example` and `backend/README.md` for the approved single-DB Phase 1 setup and current `DATABASE_SSL_MODE=disable` guidance.
4. **Test-only boom route** - Added `ENABLE_TEST_ROUTES` config and mounted `/__test__/boom` only when explicitly enabled by tests.
5. **Sessionmaker cache** - Removed global sessionmaker caching so each engine receives its own `async_sessionmaker`.

## Verification

- Rebuilt the live Phase 1 schema via `alembic downgrade base` then `alembic upgrade head`.
- Re-ran `scripts.seed` against the rebuilt schema.
- `uv run pytest -v --tb=short` -> 15 passed.
- `uv run ruff check .` -> passed.
- `uv run mypy app` -> passed.

## Residual Notes

- `backend/.env` remains local and gitignored.
- The current ApsaraDB endpoint uses `DATABASE_SSL_MODE=disable`; switch to `require` only after SSL is enabled and verified server-side.
