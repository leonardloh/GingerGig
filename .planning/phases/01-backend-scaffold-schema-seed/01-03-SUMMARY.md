---
phase: 01-backend-scaffold-schema-seed
plan: 03
subsystem: database
tags: [sqlalchemy, postgres, models, alembic, schema]

requires:
  - phase: 01-backend-scaffold-schema-seed
    provides: backend Base metadata, core enums, and package layout from 01-01 plus app shell from 01-02
provides:
  - SQLAlchemy 2 declarative models for all 11 Phase 1 tables
  - TimestampMixin applied to every model table
  - CHECK constraints, FKs, indexes, denormalised booking snapshots, and locale columns
  - app.models re-export module that registers all tables on Base.metadata
affects: [phase-01-plan-04, phase-01-plan-05, phase-02-auth, phase-03-persona-routers, phase-04-kyc, phase-05-voice]

tech-stack:
  added: []
  patterns:
    - SQLAlchemy 2 Mapped[T] plus mapped_column declarative model style
    - VARCHAR plus CHECK constraints for enum-like values instead of native Postgres ENUM
    - Composite primary keys for companion pair tables
    - SQLAlchemy text() predicates for partial Postgres indexes

key-files:
  created:
    - backend/app/models/_mixins.py
    - backend/app/models/user.py
    - backend/app/models/companion_link.py
    - backend/app/models/listing.py
    - backend/app/models/booking.py
    - backend/app/models/review.py
    - backend/app/models/companion_alert.py
    - backend/app/models/companion_alert_preference.py
    - backend/app/models/timeline_event.py
    - backend/app/models/kyc_session.py
    - backend/app/models/voice_session.py
  modified:
    - backend/app/models/__init__.py

key-decisions:
  - "Used SQLAlchemy text() for partial-index predicates so Alembic/Postgres compilation receives SQL expressions rather than raw Python strings."
  - "Kept all constrained values as String columns with explicit CHECK constraints, following D-01 and avoiding native Postgres ENUM types."
  - "Kept companion_links and companion_alert_preferences as composite-PK tables with no surrogate id."

patterns-established:
  - "Importing app.models registers exactly the 11 planned tables on Base.metadata for Alembic autogenerate."
  - "Every table inherits TimestampMixin and has created_at plus updated_at."
  - "Bookings snapshot requestor and listing display fields at creation time for later edit resilience."

requirements-completed: [DATA-02, DATA-03, DATA-04, DATA-05]

duration: 5 min
completed: 2026-04-25
---

# Phase 01 Plan 03: SQLAlchemy Models Summary

**SQLAlchemy 2 model layer for all 11 GingerGig tables with enum CHECK constraints, locale columns, booking snapshots, and Alembic-ready metadata registration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-25T15:02:15Z
- **Completed:** 2026-04-25T15:06:20Z
- **Tasks:** 2 completed
- **Files modified:** 12

## Accomplishments

- Added all 11 planned SQLAlchemy model tables using `Mapped[T]` and `mapped_column`.
- Added `TimestampMixin` to every table, including composite-PK pair tables.
- Added locale-aware `listings.title_*`, `companion_alerts.title_*`/`text_*`, and `timeline_events.text_*` columns.
- Added booking snapshot fields and KYC raw/provenance plus parsed columns.
- Re-exported every model from `app.models` so Plan 04 Alembic autogenerate sees complete `Base.metadata`.

## Task Commits

Each task was committed atomically:

1. **Task 3.1: TimestampMixin + User + CompanionLink + Listing + ListingMenuItem** - `2a278d7` (feat)
2. **Task 3.2: Booking + Review + Companion + TimelineEvent + KycSession + VoiceSession + __init__** - `fdc3f39` (feat)

**Plan metadata:** included in final docs commit.

## Final Table Inventory

| Table | Model | Primary key shape |
|-------|-------|-------------------|
| `users` | `User` | `id UUID` |
| `companion_links` | `CompanionLink` | composite `(companion_user_id, elder_user_id)` |
| `listings` | `Listing` | `id UUID` |
| `listing_menu_items` | `ListingMenuItem` | `id UUID` |
| `bookings` | `Booking` | `id UUID` |
| `reviews` | `Review` | `id UUID` |
| `companion_alerts` | `CompanionAlert` | `id UUID` |
| `companion_alert_preferences` | `CompanionAlertPreference` | composite `(companion_user_id, elder_user_id)` |
| `timeline_events` | `TimelineEvent` | `id UUID` |
| `kyc_sessions` | `KycSession` | `id UUID` |
| `voice_sessions` | `VoiceSession` | `id UUID` |

## CHECK Constraints

- `users.role_in_enum` -> `role IN ('elder','requestor','companion')`
- `users.locale_in_enum` -> `locale IN ('ms','en','zh','ta')`
- `users.kyc_status_in_enum` -> `kyc_status IN ('not_started','pending','approved','failed','manual_review')`
- `listings.category_in_enum` -> `category IN ('cat_cooking','cat_crafts','cat_pet','cat_household','cat_other')`
- `listings.price_unit_in_enum` -> `price_unit IN ('per_meal','per_hour','per_day','per_month','per_visit','per_piece','per_box')`
- `listings.currency_myr` -> `currency = 'MYR'`
- `bookings.status_in_enum` -> `status IN ('pending','confirmed','completed','cancelled')`
- `bookings.currency_myr` -> `currency = 'MYR'`
- `reviews.rating_range` -> `rating >= 1 AND rating <= 5`
- `companion_alerts.kind_in_enum` -> `kind IN ('care','celebration')`
- `companion_alerts.severity_in_enum` -> `severity IN ('info','warning','critical')`
- `kyc_sessions.status_in_enum` -> `status IN ('not_started','pending','approved','failed','manual_review')`
- `kyc_sessions.decision_in_enum` -> `decision IS NULL OR decision IN ('approved','failed','manual_review')`
- `voice_sessions.language_in_enum` -> `language IN ('en-US','zh-CN','ms-MY','ta-IN')`
- `voice_sessions.mode_in_enum` -> `mode IN ('stream','batch')`
- `voice_sessions.status_in_enum` -> `status IN ('recording','transcribing','extracting','ready','saved','failed')`

## Indexes

- `users.ix_users_role` -> `role`
- `users.ix_users_locale` -> `locale`
- `companion_links.ix_companion_links_elder_user_id` -> `elder_user_id`
- `listings.ix_listings_elder_id` -> `elder_id`
- `listings.ix_listings_category_active` -> `category, is_active WHERE is_active`
- `listing_menu_items.ix_listing_menu_items_listing_id_sort_order` -> `listing_id, sort_order`
- `bookings.ix_bookings_listing_id_status` -> `listing_id, status`
- `bookings.ix_bookings_requestor_user_id_status` -> `requestor_user_id, status`
- `bookings.ix_bookings_completed_at` -> `completed_at WHERE status = 'completed'`
- `reviews.ix_reviews_listing_id_created_at` -> `listing_id, created_at`
- `companion_alerts.ix_companion_alerts_elder_user_id_created_at` -> `elder_user_id, created_at`
- `timeline_events.ix_timeline_events_elder_user_id_occurred_at` -> `elder_user_id, occurred_at`
- `kyc_sessions.ix_kyc_sessions_user_id_created_at` -> `user_id, created_at`
- `kyc_sessions.ix_kyc_sessions_job_id` -> `job_id WHERE job_id IS NOT NULL`
- `voice_sessions.ix_voice_sessions_elder_id_created_at` -> `elder_id, created_at`

## Files Created/Modified

- `backend/app/models/_mixins.py` - Shared `TimestampMixin`.
- `backend/app/models/user.py` - User table model with role, locale, and KYC status constraints.
- `backend/app/models/companion_link.py` - Companion-to-elder composite-PK link table.
- `backend/app/models/listing.py` - Listing and listing-menu-item models.
- `backend/app/models/booking.py` - Booking model with denormalised requestor/listing snapshots.
- `backend/app/models/review.py` - Review model with rating range constraint.
- `backend/app/models/companion_alert.py` - Companion alert model with title/text locale columns.
- `backend/app/models/companion_alert_preference.py` - Composite-PK alert preference model.
- `backend/app/models/timeline_event.py` - Timeline event model with text locale columns.
- `backend/app/models/kyc_session.py` - KYC session model with two JSONB raw-response columns and parsed OCR/face-match columns.
- `backend/app/models/voice_session.py` - Voice session model with language/mode/status constraints and draft JSONB.
- `backend/app/models/__init__.py` - Re-exports every model for metadata registration.

## Decisions Made

- Used SQLAlchemy `text()` for partial index predicates. This preserves the planned SQL predicates while giving SQLAlchemy/Alembic proper SQL expression objects.
- Followed RESEARCH Schema Sketch exactly for table names and required columns. No schema deviations from RESEARCH were made.
- Did not add Alembic migrations, seed scripts, or frontend changes; those remain in later plans.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.  
**Impact on plan:** No scope or contract impact.

## Issues Encountered

- `ruff check app/models` initially requested import organization in `kyc_session.py` and `voice_session.py`; `uv run ruff check app/models --fix` applied formatting only, then lint passed.

## Verification

- PASS: Task 3.1 structural assertion command returned `ok`.
- PASS: Task 3.2 exhaustive structural assertion command returned `ok - 11 tables`.
- PASS: `DATABASE_URL=postgresql+asyncpg://x/y JWT_SECRET=change_me_min_32_chars_use_secrets_tokenurl uv run python -c "import app.models; from app.db.base import Base; print(sorted(t.name for t in Base.metadata.sorted_tables))"` printed all 11 expected table names.
- PASS: `uv run mypy app/models/` returned `Success: no issues found in 12 source files`.
- PASS: `uv run ruff check app/models` returned `All checks passed!`.
- PASS: `rg "Base\.metadata\.create_all" backend/app` found no matches.
- PASS: Stub scan for `TODO`, `FIXME`, placeholder text, and empty UI-flow values in `backend/app/models` found no matches.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Ready for `01-04-PLAN.md` to initialize Alembic and generate the initial migration from `Base.metadata`. No blockers.

## Self-Check: PASSED

- All key files listed in the plan exist.
- Both task commits exist in git history.
- All task-level and plan-level verification commands passed.
- No `Base.metadata.create_all` call exists under `backend/app`.

---
*Phase: 01-backend-scaffold-schema-seed*
*Completed: 2026-04-25*
