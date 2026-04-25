---
phase: 01-backend-scaffold-schema-seed
plan: 05
subsystem: database
tags: [postgres, seed, sqlalchemy, bcrypt, uuid5]

requires:
  - phase: 01-backend-scaffold-schema-seed
    provides: SQLAlchemy models, deterministic ID helper, async session builder, and migrated initial schema
provides:
  - Hand-ported prototype mock constants as backend seed data
  - Idempotent Postgres seed runner with FK-safe transactional upserts
  - Seed refusal guard for non-localhost DSNs unless ALLOW_SEED=1
  - Bcrypt-hashed demo accounts with preserved password hashes on re-run
affects: [phase-02-auth, phase-03-persona-routers, phase-07-frontend-wiring]

tech-stack:
  added: []
  patterns:
    - Deterministic UUID5 seed IDs via entity_id(kind, slug)
    - pg_insert(...).on_conflict_do_update(...) for seed idempotency
    - users.password_hash excluded from user upsert update set
    - Single transaction for all seed tables in FK-safe order

key-files:
  created:
    - backend/scripts/__init__.py
    - backend/scripts/seed_data.py
    - backend/scripts/seed.py
  modified:
    - backend/scripts/seed_data.py

key-decisions:
  - "Used the migrated configured database for live idempotency verification because gingergig_test was not present on the server."
  - "Kept non-demo provider rows as elder users with deterministic provider-* UUID slugs and dummy non-login bcrypt hashes."
  - "Mapped prototype requestor snapshots onto the seeded Amir user for booking FKs while preserving the rendered snapshot names and avatars."

patterns-established:
  - "Seed data lives in scripts.seed_data as plain Python dicts hand-ported from the frontend prototype."
  - "Seed runner writes users, companion links, listings, menu items, bookings, reviews, alerts, preferences, and timeline events in dependency order."
  - "Verification commands normalize postgresql:// to postgresql+asyncpg:// and use DATABASE_SSL_MODE=disable at process scope only."

requirements-completed: [DATA-06, DATA-07]

duration: 7 min
completed: 2026-04-25
---

# Phase 01 Plan 05: Idempotent Seed Summary

**Prototype mock data and demo accounts now seed into Postgres through deterministic UUID5 IDs, bcrypt hashes, and transactional upserts**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-25T15:40:00Z
- **Completed:** 2026-04-25T15:46:29Z
- **Tasks:** 3 completed
- **Files modified:** 3

## Accomplishments

- Added `backend/scripts/seed_data.py` with the 3 demo users, 5 non-Siti providers, 7 listings, 5 menu items, 6 bookings, 3 reviews, 3 companion alerts, 1 alert preference row, and 5 timeline events.
- Added `backend/scripts/seed.py` with `SeedRefusedError`, bcrypt `rounds=12`, deterministic UUID5 mapping, and per-table upserts in FK-safe order.
- Verified two consecutive seed runs preserve row counts and Siti's password hash while all 3 demo accounts bcrypt-verify with password `demo`.

## Task Commits

Each code task was committed atomically:

1. **Task 5.1: Hand-port mock data and demo accounts** - `81575cf` (feat)
2. **Task 5.2: Create idempotent seed runner** - `d000d46` (feat)
3. **Task 5.3: Blocking live seed idempotency verification** - verification-only task; no code files changed after the checks, results captured in this metadata commit.

**Plan metadata:** included in final docs commit.

## Files Created/Modified

- `backend/scripts/__init__.py` - Marks `scripts` as an importable package.
- `backend/scripts/seed_data.py` - Plain dict seed constants hand-ported from the frontend prototype.
- `backend/scripts/seed.py` - Seed entry point with safety guard, bcrypt hashing, deterministic IDs, and idempotent upserts.

## Final Row Counts

Verification after the second seed run returned:

- `users=8`
- `companion_links=1`
- `listings=7`
- `listing_menu_items=5`
- `bookings=6`
- `reviews=3`
- `companion_alerts=3`
- `companion_alert_preferences=1`
- `timeline_events=5`

Idempotency held: row counts were identical across both seed runs and `siti@gingergig.my`'s existing `password_hash` was unchanged.

## Demo User UUID5 Mappings

- `siti` -> `5a9017b1-acc2-51a2-be47-538b8bffb800`
- `amir` -> `11fed5bb-f0a9-5d5a-a5ff-d075a8074c47`
- `faiz` -> `ab8c1aca-9c1e-58c3-b586-39a618654bad`

## Verification

Passed:

- `uv run python -c "... seed_data.all_constants() ..."` confirmed 3 demo users, all required emails, non-empty listings/bookings/reviews/alerts/timeline, slug uniqueness, and all 4 locale alert/timeline fields.
- `uv run python -c "... slug references resolve ..."` confirmed every `*_slug` reference resolves to a seeded user or listing slug.
- `uv run python -c "... seed._check_safety ... seed._hash_password ..."` confirmed `SeedRefusedError`, localhost/ALLOW_SEED behavior, and bcrypt round-trip.
- `uv run python -c "... inspect seed shape ..."` confirmed 9 `_seed_*` functions, FK-safe call order, single `session.begin()`, and `password_hash` omitted from the user update set.
- `uv run alembic current` against the configured database with process-level normalized DSN returned `0001_initial_schema (head)`.
- Two consecutive `ALLOW_SEED=1 uv run python -m scripts.seed` runs exited 0 with unchanged row counts and unchanged Siti password hash.
- Bare `uv run python -m scripts.seed` without `ALLOW_SEED=1` refused with `SeedRefusedError`.
- `uv run ruff check .`
- `uv run mypy app`
- Import smoke check for `entity_id` and `seed_data`.

## Decisions Made

- Used process-local environment overrides for verification only: normalized `postgresql://` to `postgresql+asyncpg://` and set `DATABASE_SSL_MODE=disable`. `backend/.env` was not edited.
- Did not print or commit database secrets. The bcrypt hash comparison was performed inside the verification script and only the boolean result was printed.
- Used English placeholder strings for some Mandarin/Tamil listing and timeline translations where the prototype only had English, keeping required columns non-empty without changing frontend copy.

## Deviations from Plan

### Verification Target Adjustment

**1. [Rule 3 - Blocking] `gingergig_test` database was not present**
- **Found during:** Task 5.3 (blocking DB verification)
- **Issue:** `uv run alembic current` against the derived `gingergig_test` DSN failed with `InvalidCatalogNameError: database "gingergig_test" does not exist`.
- **Fix:** Verified the already-migrated configured database instead, matching the Plan 04 summary's note that this milestone used the main `DATABASE_URL` target and no separate `TEST_DATABASE_URL`.
- **Files modified:** None
- **Verification:** Configured database reported `0001_initial_schema (head)`, then passed the two-run seed idempotency and password preservation checks.

---

**Total deviations:** 0 auto-fixed code deviations; 1 verification target adjustment.  
**Impact on plan:** Seed behavior is verified against a migrated database, but the named `gingergig_test` database still does not exist.

## Issues Encountered

- `gingergig_test` was absent on the configured Postgres server. Verification proceeded against the migrated configured database and is documented above.
- `ruff` requested `datetime.UTC` instead of `timezone.utc` in `seed_data.py` and a wrapped review seed line in `seed.py`; both were fixed before final verification.

## User Setup Required

None - no new external service configuration required. Keep real DB credentials only in ignored local env files or shell environment.

## Next Phase Readiness

Ready for `01-06-PLAN.md` to add tests around seed idempotency and refusal behavior. Phase 2 auth can rely on the deterministic Siti/Amir/Faiz UUIDs and the bcrypt-hashed `demo` password rows.

## Self-Check: PASSED

- All key files listed in the plan exist.
- Task commits for data and seed runner exist in git history.
- All task-level and plan-level verification checks passed except the named `gingergig_test` target, which is recorded as a deviation.

---
*Phase: 01-backend-scaffold-schema-seed*
*Completed: 2026-04-25*
