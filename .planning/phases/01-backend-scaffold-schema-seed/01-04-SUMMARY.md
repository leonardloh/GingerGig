---
phase: 01-backend-scaffold-schema-seed
plan: 04
subsystem: database
tags: [alembic, postgres, asyncpg, migrations, schema]

requires:
  - phase: 01-backend-scaffold-schema-seed
    provides: backend Settings, Base metadata, and all 11 SQLAlchemy models from plans 01 and 03
provides:
  - Async Alembic configuration using app.core.config.settings as the DSN source
  - Initial migration revision 0001_initial_schema
  - Postgres schema creation for all 11 Phase 1 tables
  - Verified upgrade, no-op upgrade, downgrade, and final upgrade against the live database
affects: [phase-01-plan-05, phase-01-plan-06, phase-02-auth, phase-03-persona-routers, phase-04-kyc, phase-05-voice]

tech-stack:
  added: []
  patterns:
    - Alembic env imports app.models so Base.metadata registers every model table
    - Alembic mirrors runtime asyncpg SSL behavior via DATABASE_SSL_MODE
    - Initial migration is hand-curated and fixed to revision id 0001_initial_schema

key-files:
  created:
    - backend/alembic.ini
    - backend/alembic/env.py
    - backend/alembic/script.py.mako
    - backend/alembic/README
    - backend/alembic/versions/0001_initial_schema.py
  modified:
    - backend/alembic/env.py

key-decisions:
  - "Used a hand-curated initial migration instead of relying on unchecked autogenerate output."
  - "Kept alembic.ini free of real DSNs; env.py remains the single source of runtime database configuration."
  - "Added DATABASE_SSL_MODE handling in Alembic to match app.db.session because the current ApsaraDB endpoint rejects SSL negotiation."

patterns-established:
  - "Migrations, not Base.metadata.create_all, are the schema-of-record from Phase 1 onward."
  - "DATABASE_URL must use the async SQLAlchemy driver form postgresql+asyncpg:// for backend commands."
  - "Use DATABASE_SSL_MODE=disable for the current database unless SSL is enabled on the server side."

requirements-completed: [DATA-01]

duration: 44 min
completed: 2026-04-25
---

# Phase 01 Plan 04: Alembic Initial Schema Summary

**Async Alembic migration stack with fixed initial revision creating all 11 GingerGig tables and verified live database round-trip**

## Performance

- **Duration:** 44 min including credential, allowlist, SSL-mode, and schema-permission checkpoints
- **Started:** 2026-04-25T15:08:00Z
- **Completed:** 2026-04-25T15:52:00Z
- **Tasks:** 3 completed
- **Files modified:** 5

## Accomplishments

- Initialized Alembic under `backend/alembic/` with async SQLAlchemy wiring and no hardcoded DSN.
- Added `0001_initial_schema.py`, a fixed-revision migration that creates all 11 Phase 1 application tables plus Alembic version tracking.
- Verified the live database reaches `0001_initial_schema (head)`, all expected tables exist, the `users.role` CHECK exists, and all 3 partial indexes exist.
- Verified the migration is idempotent on repeat `upgrade head`, then round-trips through `downgrade base` and final `upgrade head`.

## Task Commits

Each task was committed atomically:

1. **Task 4.1: Initialize Alembic with async template + wire alembic.ini** - `22be361` (chore)
2. **Task 4.2: Generate and hand-curate initial schema migration** - `e4b4627` (feat)
3. **Task 4.3: Apply migration and verify live round-trip** - included in final metadata commit

## Files Created/Modified

- `backend/alembic.ini` - Alembic config with DSN supplied by `env.py`, not hardcoded.
- `backend/alembic/env.py` - Imports `settings`, imports `app.models`, sets `target_metadata = Base.metadata`, and passes asyncpg SSL connect args based on `DATABASE_SSL_MODE`.
- `backend/alembic/script.py.mako` - Alembic revision template.
- `backend/alembic/README` - Alembic scaffold documentation.
- `backend/alembic/versions/0001_initial_schema.py` - Initial schema migration.

## Migration Inventory

The migration creates these tables in FK-safe order:

1. `users`
2. `companion_links`
3. `listings`
4. `listing_menu_items`
5. `bookings`
6. `reviews`
7. `companion_alerts`
8. `companion_alert_preferences`
9. `timeline_events`
10. `kyc_sessions`
11. `voice_sessions`

The downgrade drops the same tables in reverse dependency order.

## CHECK Constraints

- User role, locale, and KYC status constraints.
- Listing category, price unit, and MYR currency constraints.
- Booking status and MYR currency constraints.
- Review rating range constraint.
- Companion alert kind and severity constraints.
- KYC session status and nullable decision constraints.
- Voice session language, mode, and status constraints.

## Foreign Keys And Indexes

- User-linked FKs for companion links, listings, bookings, reviews, alerts, alert preferences, timeline events, KYC sessions, and voice sessions.
- Listing-linked FKs for menu items, bookings, and reviews.
- Booking-linked FK for reviews.
- Unique user email constraint.
- Partial indexes:
  - `ix_listings_category_active`
  - `ix_bookings_completed_at`
  - `ix_kyc_sessions_job_id`

## Verification

Passed:

- `uv run ruff check alembic`
- `uv run mypy app`
- `uv run alembic upgrade head`
- `uv run alembic current` -> `0001_initial_schema (head)`
- Async schema verification for all 11 application tables plus `alembic_version`
- Async verification that a `users.role` CHECK constraint exists
- Async verification that all 3 partial indexes exist
- Repeat `uv run alembic upgrade head` as a no-op
- `uv run alembic downgrade base`
- Final `uv run alembic upgrade head`

## Decisions Made

- Used the main `DATABASE_URL` target for Phase 1 verification per user direction; no separate `TEST_DATABASE_URL` is required for this milestone.
- Kept the database verification guarded: migration only ran after connectivity worked, the target DB was empty, and schema permissions were granted.
- Updated Alembic to respect `DATABASE_SSL_MODE` because SQLAlchemy's asyncpg URL parameters were not sufficient for this server's SSL behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Alembic did not pass asyncpg SSL connect args**
- **Found during:** Task 4.3 live migration verification
- **Issue:** Runtime DB connections already supported `DATABASE_SSL_MODE`, but Alembic used `async_engine_from_config` without equivalent `connect_args`. The ApsaraDB endpoint rejected SSL negotiation.
- **Fix:** Added `connect_args` construction to `backend/alembic/env.py`, matching `app.db.session.build_engine`.
- **Files modified:** `backend/alembic/env.py`
- **Verification:** Migration round-trip passed with `DATABASE_SSL_MODE=disable`.

---

**Total deviations:** 1 auto-fixed blocking issue.
**Impact on plan:** Keeps Alembic behavior aligned with runtime DB behavior; no scope expansion.

## Issues Encountered

- The first visible shell `DATABASE_URL` was still placeholder-like, so migration execution was correctly blocked.
- Network allowlisting was needed before the DB could be reached.
- The DB rejected SSL negotiation; verification succeeded with `DATABASE_SSL_MODE=disable`.
- The app DB user initially lacked `CREATE` permission on schema `public`; after the grant, Alembic could create the version table and application tables.

## User Setup Required

Keep real credentials in `backend/.env` or exported shell variables, never in `backend/.env.example`.

For the current database endpoint, backend commands need:

```text
DATABASE_URL=postgresql+asyncpg://...
DATABASE_SSL_MODE=disable
```

If SSL is enabled later on the server side, switch `DATABASE_SSL_MODE` back to `require`.

## Next Phase Readiness

Plan 05 can now insert seed data against the migrated schema. Plan 06 can re-run migration and schema-shape tests against the same Alembic revision.

---
*Phase: 01-backend-scaffold-schema-seed*
*Completed: 2026-04-25*
