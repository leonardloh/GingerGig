# Phase 03 Pattern Mapping: Persona Routers

**Phase:** 03 - Persona Routers (Elder + Requestor + Companion)  
**Output:** pattern artifact for planner/executor reuse  
**Scope:** backend routes, schemas, query helpers, tests, and optional match-field persistence only

## Likely File Changes

### `backend/app/routers/elder.py`

- **Role:** Protected elder-facing router plus top-level shared listing and booking response routes.
- **Data flow:** JWT user -> role/self/ownership checks -> async SQLAlchemy queries -> Pydantic response schemas -> frontend camelCase JSON.
- **Closest analogs:** `backend/app/routers/auth.py`, `backend/app/routers/health.py`, current elder stub.
- **Patterns to reuse:**
  - Keep `router = APIRouter(tags=["elder"])` with no router prefix. `main.py` already mounts it under `/api/v1`; no-prefix elder router is the cleanest place for `/elders/{elderId}/...`, `/listings/{listingId}`, and `/bookings/{bookingId}/respond`.
  - Match route declarations with explicit `response_model=...`, as in `auth.py` and `health.py`.
  - Inject dependencies as route parameters: `db: AsyncSession = Depends(get_db)` and `current_user: User = Depends(get_current_user)`.
  - Raise `HTTPException(status_code=..., detail="...")`; `core/errors.py` converts this to `{status,message}`.
  - Keep route handlers thin: check role/ownership, call helper query/mapping code, return schemas.

### `backend/app/routers/requestor.py`

- **Role:** Protected requestor router for search and requestor-owned bookings.
- **Data flow:** JWT user -> role check -> query params or payload -> listing/bookings queries -> Pydantic response schemas.
- **Closest analogs:** current requestor stub, `auth.py` for protected `GET /me` pattern.
- **Patterns to reuse:**
  - Preserve `router = APIRouter(prefix="/requestor", tags=["requestor"])`.
  - Define only `/listings/search`, `/bookings` GET, and `/bookings` POST here. Do not put `/listings/{listingId}` in this prefixed router because that would become `/requestor/listings/{listingId}`, not the frontend contract.
  - Use FastAPI query params named as the frontend sends them: `max_distance_km`, `halal_only`, `open_now`.
  - Use Pydantic payload schema for `POST /requestor/bookings`; do not hand-parse JSON.

### `backend/app/routers/companion.py`

- **Role:** Protected companion router for watched elder dashboard, alerts, timeline, and preferences.
- **Data flow:** JWT companion -> companion link check -> locale-projected elder data/alerts/timeline/aggregates -> schemas or `204`.
- **Closest analogs:** current companion stub, `auth.py` dependency style, `core/errors.py` envelope behavior.
- **Patterns to reuse:**
  - Preserve `router = APIRouter(prefix="/companions", tags=["companion"])`.
  - Route paths should be `/elders/{elderId}/dashboard`, `/elders/{elderId}/alerts`, `/elders/{elderId}/timeline`, and `/elders/{elderId}/alert-preferences`.
  - Validate `current_user.role == "companion"` and existence of a `CompanionLink` row before returning any watched elder data.
  - `PUT .../alert-preferences` should return `Response(status_code=204)` or equivalent no-body response after update/upsert.

### `backend/app/schemas/persona.py`

- **Role:** New Pydantic v2 DTO module for Phase 3 request and response shapes.
- **Data flow:** Router/helper mapping -> Pydantic schemas -> JSON matching frontend DTO names.
- **Closest analogs:** `backend/app/schemas/auth.py`, `backend/app/schemas/common.py`, `frontend/src/services/api/types.ts`.
- **Patterns to reuse:**
  - Use direct camelCase field names in schemas, as `Session.accessToken`, `RegisterResponse.kycRequired`, and `UserProfile.avatarUrl` already do.
  - Prefer focused classes over raw dict returns: listing/menu/review, booking, earnings, companion dashboard/alert/timeline, alert preferences, create booking, booking response, listing patch.
  - Use `Literal[...]` for constrained strings when practical, mirroring `auth.py`.
  - Return UUIDs as strings in mapper code, matching `auth._profile_from_user()`.
  - Pydantic can serialize `Decimal`, but mappers/tests should deliberately assert JSON numbers for money, ratings, and match scores.
  - Avoid alias config unless there is a real conflict; current backend schemas already model frontend names directly.

### `backend/app/services/persona_queries.py`

- **Role:** New helper/service module for shared SQL projections, ownership checks, mapping, and aggregate logic.
- **Data flow:** Routers call helpers with `AsyncSession`, `User`, and IDs; helpers return ORM rows or response-schema-ready objects.
- **Closest analogs:** `auth.py` local helper functions (`_initials`, `_profile_from_user`, `_session_for_user`), existing model/query style in routers.
- **Patterns to reuse:**
  - Use async SQLAlchemy 2: `await db.execute(select(...).where(...))`, `scalar_one_or_none()`, and explicit joins.
  - Put locale choice at query construction time with a fixed column mapping and `func.coalesce(locale_col, english_col).label("title")`; do not fetch every locale column and choose in Python.
  - Batch child collections such as menu items by listing IDs to avoid N+1 queries.
  - Keep small permission helpers simple: `require_role`, `require_self`, `require_companion_link`, and ownership lookup helpers are enough.
  - Reuse the `_initials(name)` behavior from `auth.py` unless a persisted seeded display initial is added later.
  - Use `zoneinfo.ZoneInfo("Asia/Kuala_Lumpur")` for monthly earnings windows, then compare UTC instants against `Booking.completed_at`.

### `backend/app/models/listing.py`

- **Role:** Optional schema extension if persisting seeded requestor match fields.
- **Data flow:** Seed data -> listing columns -> requestor search/detail projections -> frontend smart-match cards.
- **Closest analogs:** existing `Listing` columns and check constraints.
- **Patterns to reuse:**
  - Add nullable columns on `Listing` rather than a new table for demo-only match metadata: `distance_label`, `match_score`, `match_reason_ms`, `match_reason_en`, `match_reason_zh`, `match_reason_ta`.
  - Add `CheckConstraint("match_score IS NULL OR (match_score >= 0 AND match_score <= 100)", name="match_score_range")`.
  - Keep SQLAlchemy model style consistent: `Mapped[...] = mapped_column(...)`, `Text`, `SmallInteger`, nullable defaults.
  - If this is planned, it must be paired with Alembic and seed updates. Do not rely on `Base.metadata.create_all`.

### `backend/alembic/versions/0002_listing_demo_match_fields.py`

- **Role:** Optional migration for persisted requestor match/distance fields.
- **Data flow:** Migration upgrades DB schema before seed writes new listing columns.
- **Closest analogs:** `backend/alembic/versions/0001_initial_schema.py`, `backend/tests/test_migrations.py`.
- **Patterns to reuse:**
  - Use Alembic `op.add_column`, `op.create_check_constraint`, `op.drop_constraint`, and `op.drop_column`.
  - Use revision metadata style from `0001_initial_schema.py`: `revision`, `down_revision`, `branch_labels`, `depends_on`.
  - Tests currently assert exact head revision `"0001_initial_schema"`; if a 0002 migration is added, update the expected revision and table/column checks accordingly.

### `backend/scripts/seed_data.py`

- **Role:** Source constants for deterministic demo data.
- **Data flow:** Provider/listing constants -> `seed.py` upserts -> DB-backed Phase 3 responses.
- **Closest analogs:** existing `PROVIDERS`, `LISTINGS`, `BOOKINGS`, `COMPANION_ALERTS`, `TIMELINE`.
- **Patterns to reuse:**
  - Keep slugs stable; IDs come from `entity_id(kind, slug)`.
  - Move/copy provider `distance`, `match_score`, and `match_reason` into listing seed rows if persistence is chosen.
  - Keep four-locale text fields explicit for match reasons, following the companion alert/timeline locale pattern.
  - Do not import `seed_data.py` from runtime routers; it is seed source material only.

### `backend/scripts/seed.py`

- **Role:** Idempotent DB population for Phase 3 demo fields.
- **Data flow:** `seed_data.LISTINGS` -> `pg_insert(Listing).on_conflict_do_update(...)`.
- **Closest analogs:** `_seed_listings`, `_seed_bookings`, `_seed_companion_alerts`, `_seed_companion_alert_preferences`.
- **Patterns to reuse:**
  - Add new listing fields to both row construction and the `cols` update list.
  - Preserve the safety gate (`ALLOW_SEED=1` or localhost) and idempotent upsert pattern.
  - Keep using deterministic IDs via `entity_id`.
  - Update `backend/tests/test_seed.py` only if the canonical snapshot expectations need to include new columns.

### `backend/app/schemas/__init__.py`

- **Role:** Optional schema package export surface.
- **Data flow:** Internal imports only, if existing local style expects package-level exports.
- **Closest analogs:** current mostly empty package and direct imports from `schemas.auth`.
- **Patterns to reuse:**
  - Prefer direct imports from `app.schemas.persona` unless the executor sees a strong existing package-export convention. There is no current need to add broad exports.

### `backend/tests/test_persona_elder.py`

- **Role:** Elder contract, ownership, booking response, and earnings tests.
- **Data flow:** login via auth endpoint -> bearer headers -> persona endpoints -> response JSON and DB state assertions.
- **Closest analogs:** `backend/tests/test_auth_demo.py`, `backend/tests/conftest.py`, `backend/tests/test_error_envelope.py`.
- **Patterns to reuse:**
  - Mark async tests with `pytestmark = pytest.mark.asyncio(loop_scope="session")`.
  - Use the shared `client` fixture; do not bypass app routes for endpoint behavior.
  - Log in through `/api/v1/auth/login` and pass `headers={"Authorization": f"Bearer {token}"}`.
  - Assert envelope shape for rejected cases: `{status, message}` plus optional `detail`.
  - For seeded IDs, import/use `app.core.ids.entity_id()` rather than hardcoding UUIDs.

### `backend/tests/test_persona_requestor.py`

- **Role:** Requestor search, listing detail, create booking, requestor booking list tests.
- **Data flow:** Amir login -> search/detail/create/list -> assert seeded DB-backed DTOs.
- **Closest analogs:** `test_auth_demo.py`, `test_seed.py`, frontend endpoint contracts.
- **Patterns to reuse:**
  - Exercise query params exactly as frontend sends them: `max_distance_km`, `halal_only`, `open_now`.
  - Assert active-listing filtering, halal filtering, seeded `matchScore`/`matchReason`, menu items, reviews, and denormalized booking snapshots.
  - Confirm elder/companion users receive `403` on requestor-only endpoints.

### `backend/tests/test_persona_companion.py`

- **Role:** Companion dashboard, alerts, timeline, preference persistence tests.
- **Data flow:** Faiz login -> companion link validation -> watched elder data -> preference write -> DB/assert response.
- **Closest analogs:** `test_auth_demo.py`, `test_error_envelope.py`, `CompanionLink` and preference seed patterns.
- **Patterns to reuse:**
  - Assert Faiz can access Siti through `companion_links`.
  - Assert non-companion role or unlinked companion receives `403`.
  - For `PUT .../alert-preferences`, assert `204` and no JSON body, then verify all five booleans persisted.

### `backend/tests/test_persona_locale_and_authz.py`

- **Role:** Cross-persona locale projection and authorization/error envelope tests.
- **Data flow:** mutate seeded user/listing locale fields inside savepoint fixture -> call endpoints -> assert SQL-level fallback outcomes.
- **Closest analogs:** `conftest.py` savepoint fixture, `test_error_envelope.py`, `test_auth_dependencies.py`.
- **Patterns to reuse:**
  - Tests can safely modify rows because `db_session` rolls back the outer transaction after each test.
  - Prefer assertions that prove output locale changes with `users.locale` and falls back to English when the locale column is null.
  - Include missing token, role mismatch, cross-user, missing resource, conflict, and validation error coverage.

## Route And Prefix Conventions

`main.py` mounts all persona routers with `prefix="/api/v1"`. Router-local prefixes must therefore be exact:

- Elder router has no prefix; define `/elders/{elderId}/listings`, `/elders/{elderId}/bookings`, `/elders/{elderId}/earnings/summary`, `/listings/{listingId}`, and `/bookings/{bookingId}/respond`.
- Requestor router keeps `prefix="/requestor"`; define `/listings/search` and `/bookings`.
- Companion router keeps `prefix="/companions"`; define `/elders/{elderId}/dashboard`, `/elders/{elderId}/alerts`, `/elders/{elderId}/timeline`, and `/elders/{elderId}/alert-preferences`.

Avoid creating a separate router unless necessary. If a separate no-prefix shared router is introduced for `/listings/{listingId}`, it must be included in `main.py`; using the existing no-prefix elder router is simpler and already planned by research.

## Auth And Error Patterns

- Use `get_current_user` from `backend/app/deps/auth.py` for every Phase 3 route.
- `get_current_user` returns a `User` model or raises `401 Invalid credentials`; do not re-decode JWTs in persona routers.
- Implement role checks with small helpers that raise `HTTPException(status_code=403, detail="...")`.
- Let `core/errors.py` shape all errors. Do not manually return `{"status": ..., "message": ...}` from route handlers.
- Use `409` only for invalid booking state transitions, especially responding to non-pending bookings.

## SQLAlchemy And Data Mapping Patterns

- Use `AsyncSession` from `Depends(get_db)`; the dependency commits after successful route return and rolls back on exception.
- Use `select()` plus joins/filters. Current repo does not use ORM relationships, so explicit FK joins are the clearest fit.
- Locale display fields should be SQL expressions:
  - Choose the target column from a fixed mapping, e.g. `{"ms": Listing.title_ms, "en": Listing.title_en, ...}`.
  - Wrap with `func.coalesce(target_column, Listing.title_en).label("title")`.
  - Repeat the pattern for companion `title`, companion `message`/`text`, timeline `text`, and listing `matchReason` if persisted.
- Map snake_case DB columns to camelCase schema fields in one place, ideally helper functions in `persona_queries.py`.
- Use DB denormalized booking fields (`requestor_name`, `requestor_initials`, `requestor_avatar_url`, `listing_title`, `quantity_label`, `item_description`, `amount`) instead of rehydrating historical booking display text from current user/listing rows.
- New requestor bookings should infer snapshot fields server-side from current requestor, listing, selected locale title, and menu/fallback data.

## Frontend Contract Patterns

The existing endpoint modules are the contract. Backend responses should already include the fields Phase 7 will type/wire:

- Listing fields: `id`, `elderId`, `title`, `description`, `price`, `priceMax`, `priceUnit`, `currency`, `category`, `rating`, `reviewCount`, `halal`, `isActive`, `days`, `menu`, locale title fields where useful, and requestor-card fields such as `elderName`, `elderInitials`, `elderArea`, `elderPortraitUrl`, `distance`, `matchScore`, `matchReason`.
- Booking fields: `id`, `listingId`, `requestorName`, `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`, `status`, `amount`, `currency`, `scheduledAt`, `notes`.
- Companion alert fields: `id`, `type`, `title`, `message`, `createdAt`.
- Timeline fields: `id`, `type`/`eventType`, `text`, `time`, `occurredAt`, `relatedId` if useful.
- Companion dashboard fields: existing `status`, `weeklyEarnings`, `activeDays`, `completedBookings`, plus additive elder snapshot.

Do not edit frontend files during Phase 3. Use frontend modules only to preserve backend route and DTO compatibility.

## Alembic And Seed Persistence Guidance

Research recommends persisting match fields instead of importing seed constants at runtime. If the planner accepts that recommendation, the executor should treat the migration/model/seed/test updates as one coherent unit:

1. Add nullable listing columns and a `match_score` range check in model and Alembic.
2. Populate/upsert those columns from `seed_data.LISTINGS` through `_seed_listings`.
3. Update `test_migrations.py` expected head revision and, ideally, assert new columns/check constraint.
4. Keep `test_seed.py` idempotency passing; snapshot hashes will naturally include new seeded columns.

If the planner chooses no migration, the executor must still return deterministic `distance`, `matchScore`, and `matchReason` fallbacks without importing seed constants from runtime code. That is less faithful to the “real DB reads” goal.

## Test Harness Patterns

- Tests use a real migrated Postgres DB via `TEST_DATABASE_URL` or `DATABASE_URL`; they are not unit tests over mocked sessions.
- `conftest.py` overrides `get_db` so app requests use the savepoint-isolated `db_session`.
- Write endpoint tests through `httpx.AsyncClient` and ASGITransport, matching current tests.
- Auth helpers in tests should log in demo users through `/api/v1/auth/login`; do not mint tokens manually except for auth-specific negative tests.
- Seeded stable IDs should come from `entity_id()`.
- Because the DB dependency commits after route return, assert both response body and any changed DB state explicitly when testing writes.

## Planner/Executor Pitfalls To Avoid

- Do not call DashScope/Qwen, Redis/Tair, payment, notification, chat, KYC, or voice services in Phase 3.
- Do not introduce a generalized permission framework; small local helpers are enough.
- Do not import `frontend/src/prototype/mock-data.js` or `backend/scripts/seed_data.py` from application runtime.
- Do not use `Base.metadata.create_all`.
- Do not choose locale values after fetching every locale column when SQL projection can do it.
- Do not place top-level `/listings/{listingId}` under the requestor router prefix.
- Do not modify frontend feature code, layout, copy, or styling.

## PATTERN MAPPING COMPLETE
