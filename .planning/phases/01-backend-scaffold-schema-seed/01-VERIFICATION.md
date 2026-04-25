---
phase: 01-backend-scaffold-schema-seed
status: passed
score: 14/14
verified_at: 2026-04-25
requirements_verified:
  - FOUND-01
  - FOUND-02
  - FOUND-03
  - FOUND-04
  - FOUND-05
  - FOUND-06
  - FOUND-07
  - DATA-01
  - DATA-02
  - DATA-03
  - DATA-04
  - DATA-05
  - DATA-06
  - DATA-07
requirements_missing: []
---

# Phase 01 Verification

## Verdict

Phase 01 passes verification.

The phase goal is achieved: the backend is a runnable FastAPI app with a top-level health check, `/api/v1` router stubs, non-wildcard CORS, sanitized `ApiError` envelopes, Alembic-owned Postgres schema for all 11 Phase 1 tables, and idempotent seeded prototype data plus the three bcrypt-backed demo accounts.

All 7 plan summaries are present:

- `01-01-SUMMARY.md`
- `01-02-SUMMARY.md`
- `01-03-SUMMARY.md`
- `01-04-SUMMARY.md`
- `01-05-SUMMARY.md`
- `01-06-SUMMARY.md`
- `01-07-SUMMARY.md`

## Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FOUND-01 | Verified | `GET /health` returns `200 {"status":"ok"}` in `tests/test_health.py`; full suite passed. |
| FOUND-02 | Verified | `backend/pyproject.toml` pins FastAPI, uvicorn, SQLAlchemy async, asyncpg, Alembic, pydantic, pydantic-settings, boto3, `amazon-transcribe>=0.6.4`, `alibabacloud-oss-v2>=1.2.5`, OpenAI, Redis, `pyjwt[crypto]`, and `bcrypt>=4.2.0,<5.0.0`; dependency guard tests passed. |
| FOUND-03 | Verified | Routers mount under `/api/v1`; CORS uses `settings.cors_origins` and `tests/test_cors_no_wildcard.py` confirms no `*`. |
| FOUND-04 | Verified | Required backend module layout exists: `routers`, `services`, `models`, `schemas`, `integrations`, `core`, `deps`, `db`, and `main.py`. |
| FOUND-05 | Verified | `Settings` reads typed environment config, `.env.example` lists required Phase 1 variables, and docs match the approved single-DB setup. |
| FOUND-06 | Verified | Global handlers return `{status, message, detail?}`; 500 and 404 envelope tests passed with no traceback in response bodies. |
| FOUND-07 | Verified | Lifespan builds a process engine; `get_db` yields per-request `AsyncSession`; no global `AsyncSession` or cached cross-engine sessionmaker remains. |
| DATA-01 | Verified | Alembic migration creates all 11 required tables; schema tests verify head revision and TIMESTAMPTZ timestamp columns. |
| DATA-02 | Verified | `users` model and migration include required identity, auth, role, locale, KYC, area, age, avatar, and timestamp columns. |
| DATA-03 | Verified | `listings` and `listing_menu_items` preserve rendered prototype fields including category, prices, price unit, rating, review count, halal, active flag, locale titles, description, days, and menu rows. |
| DATA-04 | Verified | `bookings` stores denormalized requestor/listing snapshots: requestor name, initials, avatar URL, listing title, quantity label, item description, amount, scheduled time, and status. |
| DATA-05 | Verified | `companion_alerts` and `timeline_events` store locale columns for all four supported locales. |
| DATA-06 | Verified | Seed runner uses deterministic UUID5 IDs and `ON CONFLICT DO UPDATE`; seed test compares canonical row snapshots across reruns. |
| DATA-07 | Verified | Siti, Amir, and Faiz are seeded; tests bcrypt-verify password `demo` for all three accounts. |

## Automated Checks

Executed from `backend/` with `.env` loaded silently, normalized to `postgresql+asyncpg://` where needed, and `DATABASE_SSL_MODE=disable` set for the current ApsaraDB endpoint.

| Command | Result |
|---------|--------|
| `uv run pytest -v --tb=short` | Passed: 15 tests passed in 4.89s. |
| `uv run ruff check .` | Passed: all checks passed. |
| `uv run mypy app` | Passed: no issues found in 37 source files. |

Additional source inspection confirmed:

- No forbidden dependency/import pattern is used in source code.
- No `Base.metadata.create_all` call exists in `app/`, `scripts/`, or `alembic/`.
- The initial migration creates exactly the required 11 application tables.
- Shared timestamp columns are `DateTime(timezone=True)` in both models and migration.
- `backend/.env` is documented as ignored and is not part of the committed verification scope.

## Code Review Follow-up

All findings from `01-REVIEW.md` have corresponding fixes documented in `01-REVIEW-FIX.md` and verified in code/tests/docs:

- Seed idempotency now avoids unconditional timestamp drift and is tested with canonical row snapshots.
- Timestamp columns are timezone-aware in `TimestampMixin` and `0001_initial_schema.py`; tests verify `timestamp with time zone`.
- `.env.example`, `README.md`, and `APSARADB_PROVISIONING.md` reflect the approved single `DATABASE_URL` setup and current `DATABASE_SSL_MODE=disable` guidance.
- `/__test__/boom` is gated by `ENABLE_TEST_ROUTES` and disabled by default.
- `get_sessionmaker()` now returns a sessionmaker for the supplied engine instead of caching the first engine globally.

## Evidence

- Phase docs read: `REQUIREMENTS.md`, `ROADMAP.md`, `PROJECT.md`, Phase 01 context/research, all seven plans, all seven summaries, review, and review-fix artifacts.
- Backend source inspected: dependency config, FastAPI app, exception handlers, DB session builder, timestamp mixin, Alembic migration, seed runner, seed/migration/error/CORS/guardrail tests, setup docs, and ApsaraDB runbook.
- Test evidence:
  - `tests/test_migrations.py` verifies all 11 tables and `0001_initial_schema`.
  - `tests/test_migrations.py` verifies all shared timestamp columns are `timestamp with time zone`.
  - `tests/test_seed.py` verifies canonical seed snapshots do not drift across reruns.
  - `tests/test_seed.py` verifies all three demo accounts accept password `demo`.
  - Guardrail tests verify dependency pins, forbidden imports, no wildcard CORS, no `create_all`, and seed refusal safety.

## Residual Risks

- Tests currently run against the approved shared `DATABASE_URL` database when `TEST_DATABASE_URL` is absent. This is accepted for Phase 1, but future CI should use an isolated test database before broader write-heavy phases.
- The current ApsaraDB endpoint uses `DATABASE_SSL_MODE=disable`. Switch to `require` only after SSL is enabled and verified server-side.
- Router business logic remains intentionally stubbed; auth, persona routes, KYC, voice, cache, frontend wiring, and deployment are later phases.
