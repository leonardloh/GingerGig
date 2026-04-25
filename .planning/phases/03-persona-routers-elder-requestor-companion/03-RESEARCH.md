# Phase 3 Research: Persona Routers (Elder + Requestor + Companion)

**Question:** What do I need to know to plan this phase well?

**Phase goal:** Every non-AI elder, requestor, and companion screen loads from real Postgres data through FastAPI, with locale-aware projection, denormalised booking snapshots, seeded demo matching, and KYC/voice routes still stubbed.

## Executive Findings

Phase 3 is not a new product build. It is a contract-completion phase for the existing typed frontend API modules:

- Replace stubs in `backend/app/routers/{elder,requestor,companion}.py`.
- Build Pydantic response/request schemas for the existing camelCase DTOs.
- Use Phase 2 `get_current_user` from `backend/app/deps/auth.py`.
- Reuse Phase 1 SQLAlchemy models and seed data.
- Add only the minimum schema/seed extension needed to persist requestor demo matching fields that currently exist in seed source but not in Postgres.

The major planning risk is that `matchScore`, `matchReason`, provider `distance`, and provider initials are present in `frontend/src/prototype/mock-data.js` and `backend/scripts/seed_data.py`, but are not currently columns on `listings` or `users`. Because the Phase 3 goal says real DB reads, do not solve this by importing `scripts.seed_data` inside routers. Plan a small Alembic migration plus seed update, or explicitly accept deterministic fallbacks as a temporary exception. Recommended: persist these fields.

## Existing Contracts And Current Gaps

### Backend State

Current router files are stubs:

- `backend/app/routers/elder.py` has only `GET /elders/__stub` and no prefix.
- `backend/app/routers/requestor.py` has prefix `/requestor` and only `GET /requestor/__stub`.
- `backend/app/routers/companion.py` has prefix `/companions` and only `GET /companions/__stub`.

Current reusable backend assets:

- `backend/app/models/listing.py`: listings and menu items, locale title columns, category, price, price_max, price_unit, rating, review_count, halal, is_active, days.
- `backend/app/models/booking.py`: denormalised requestor/listing snapshot fields already exist.
- `backend/app/models/companion_alert.py`: 4-locale title and text columns already exist.
- `backend/app/models/timeline_event.py`: 4-locale text and seeded relative labels already exist.
- `backend/app/models/companion_alert_preference.py`: full preference row exists.
- `backend/app/models/companion_link.py`: companion-to-elder ownership check table exists.
- `backend/tests/conftest.py`: async DB and `httpx.AsyncClient` fixtures already exist.

Expected Phase 2 assets, based on `02-01-PLAN.md`:

- `backend/app/deps/auth.py::get_current_user`
- `backend/app/deps/auth.py::get_current_user_ws`
- `backend/app/schemas/auth.py::UserProfile`
- JWT-backed demo auth where Siti, Amir, and Faiz can log in.

### Frontend API Contract

The Phase 3 backend should satisfy these paths exactly:

- `GET /api/v1/elders/{elderId}/listings`
- `PATCH /api/v1/listings/{listingId}`
- `GET /api/v1/elders/{elderId}/bookings`
- `POST /api/v1/bookings/{bookingId}/respond`
- `GET /api/v1/elders/{elderId}/earnings/summary`
- `GET /api/v1/requestor/listings/search?query=&max_distance_km=&halal_only=&open_now=`
- `GET /api/v1/listings/{listingId}`
- `POST /api/v1/requestor/bookings`
- `GET /api/v1/requestor/bookings`
- `GET /api/v1/companions/elders/{elderId}/dashboard`
- `GET /api/v1/companions/elders/{elderId}/alerts`
- `GET /api/v1/companions/elders/{elderId}/timeline`
- `PUT /api/v1/companions/elders/{elderId}/alert-preferences`

Current frontend `types.ts` is not yet fully extended; Phase 7 owns frontend type edits. Still, Phase 3 responses should already use the eventual camelCase field names to keep Phase 7 additive and mechanical.

### Seed Contract

Seeded demo data already covers:

- 3 demo users: Siti elder, Amir requestor, Faiz companion.
- Faiz watches Siti through `companion_links`.
- 7 listings total: Siti has 2, other providers have 5.
- Siti has pending, confirmed, and completed bookings.
- Reviews exist for Siti's listing detail page.
- Companion alerts and timeline have 4 locale text columns.

Seed gaps for Phase 3:

- `PROVIDERS` includes `distance`, `initials`, `match_score`, and `match_reason`.
- `LISTINGS` rows do not currently carry those provider-card fields.
- `users` does not have an `initials` column. Initials can be derived from name, except seeded provider initials may differ from naive derivation for display fidelity.
- `listings` does not have `distance_label`, `match_score`, or `match_reason_*`.

Recommended schema gap closure:

- Add nullable demo columns on `listings`: `distance_label TEXT`, `match_score SMALLINT`, `match_reason_ms TEXT`, `match_reason_en TEXT`, `match_reason_zh TEXT`, `match_reason_ta TEXT`.
- Add a check constraint for `match_score IS NULL OR (match_score >= 0 AND match_score <= 100)`.
- Populate these from `backend/scripts/seed_data.py`.
- Use English fallback for missing match reasons, same as other locale-projected text.

This keeps the quick demo deterministic and DB-backed without live Qwen.

## Standard Stack

Use only the existing backend stack:

- FastAPI routers with `Depends(get_current_user)` and `Depends(get_db)`.
- Async SQLAlchemy 2 `select`, `join`, `func`, `case`/`coalesce`, and Postgres aggregates where useful.
- Pydantic v2 models using direct camelCase field names. Avoid aliases unless necessary.
- Standard library `zoneinfo.ZoneInfo("Asia/Kuala_Lumpur")` for earnings month boundaries.
- Pytest, pytest-asyncio, and `httpx.AsyncClient` for validation.
- Alembic for any schema change. Do not use `Base.metadata.create_all`.

No new service dependencies are needed for Phase 3. Do not call DashScope/Qwen. Do not add Redis/Tair caching yet.

## Architecture Patterns

### Router Shape

Plan three router files plus shared schemas/helpers:

- `elder.py` owns elder-prefixed reads and booking response.
- `requestor.py` owns requestor-prefixed reads/writes.
- `companion.py` owns companion-prefixed reads/writes.
- Shared `/listings/{listingId}` and `/bookings/{bookingId}/respond` can live in whichever router has no conflicting prefix. Since `elder.py` has no router prefix, it is currently suitable for top-level `/listings/*` and `/bookings/*` paths.

Keep route handlers thin:

1. Auth/role/ownership check.
2. Query/service call.
3. Map result to schema.
4. Raise `HTTPException` with clear status/detail where needed.

Do not introduce a generalized permission framework. Thin helpers are enough:

- `require_role(user, "elder")`
- `require_self(user, elder_id)`
- `require_companion_link(db, companion_id, elder_id)`
- `get_listing_owned_by_current_elder(db, listing_id, elder_id)`

### Schemas

Create focused schemas rather than returning raw ORM rows.

Recommended file: `backend/app/schemas/persona.py`, or split if the planner wants smaller files:

- `MenuItem`
- `Review`
- `Listing`
- `ListingDetail`
- `ListingPatch`
- `Booking`
- `BookingResponsePayload`
- `CreateBookingPayload`
- `EarningsSummary`
- `CompanionElderSnapshot`
- `CompanionDashboard`
- `CompanionAlert`
- `TimelineEvent`
- `AlertPreferences`

Use direct frontend names:

- `elderId`, `priceMax`, `priceUnit`, `reviewCount`, `isActive`
- `titleMs`, `titleEn`, `titleZh`, `titleTa`
- `matchScore`, `matchReason`
- `elderName`, `elderInitials`, `elderArea`, `elderPortraitUrl`
- `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`
- `monthTotal`, `lifetimeTotal`, `completedCount`
- `weeklyEarnings`, `activeDays`, `completedBookings`
- `createdAt`

Decimal values should be serialised as JSON numbers for frontend convenience. Pydantic can accept `Decimal`, but route mapping should be deliberate so tests assert numeric JSON values.

### Query Helpers

Recommended file: `backend/app/services/persona_queries.py`.

Useful helpers:

- `locale_expr(model, stem, locale)` returns `coalesce(model.<stem_locale>, model.<stem_en>).label(stem)`.
- `initials(name)` returns uppercase initials from the first two words, with a fallback for one-word names.
- `listing_select_columns(locale)` builds a single SQL projection for `title` and `matchReason`.
- `menu_items_for_listings(db, listing_ids)` batches menu lookups to avoid N+1.
- `reviews_for_listing(db, listing_id)` for listing detail.
- `booking_to_response(row)` maps denormalised DB fields to frontend names.
- `month_window_kl(now)` returns UTC start/end datetimes for the current Asia/Kuala_Lumpur calendar month.

SQL-level locale projection means the selected statement should include expressions like:

```python
title = func.coalesce(locale_column(Listing, "title", user.locale), Listing.title_en).label("title")
```

Do not fetch all locale columns and pick `row[f"text_{locale}"]` in Python. Choosing the ORM column from a fixed mapping at query-construction time is acceptable and avoids dynamic SQL strings.

### Booking Behavior

Creation:

- Require current user role `requestor`.
- Load active listing joined to elder user.
- Return `404` for missing/inactive listing as specified.
- Infer snapshots server-side: requestor name/initials/avatar, listing title projected to requestor locale with English fallback, quantity label and item description from seeded menu data or deterministic demo fallback.
- Set status `pending`.
- Use listing price as amount unless a menu fallback is clearer from seeded data. Keep it simple and deterministic.

Response:

- Require current user role `elder`.
- Load booking joined through listing.
- Return `403` when the elder does not own the listing.
- Allow only `pending -> confirmed` for `accept` and `pending -> cancelled` for `decline`.
- Return `409` for non-pending bookings.

### Earnings

Use only completed bookings for the elder's listings.

- `lifetimeTotal`: sum all completed booking amounts.
- `completedCount`: count all completed bookings.
- `monthTotal`: sum completed bookings whose `completed_at` falls inside the current month in `Asia/Kuala_Lumpur`.

Implementation should compute the KL local month start and next-month start using `ZoneInfo("Asia/Kuala_Lumpur")`, convert those instants to UTC, then filter `completed_at >= start_utc` and `< end_utc`.

### Companion Dashboard

Dashboard can be straightforward derived data:

- Validate companion role and `companion_links` ownership.
- Elder snapshot: name, initials, area, portrait/avatar.
- `weeklyEarnings`: aggregate completed bookings in the last 7 days, or return an `EarningsSummary` shape if keeping current type.
- `activeDays`: count distinct KL-local dates among bookings/timeline events in the last 7 days. For demo reliability, completed/confirmed booking scheduled dates are enough.
- `completedBookings`: count completed bookings for watched elder.
- `status`: a display string such as `"Active this week"` or seeded-compatible equivalent.

The current frontend type only has `status`, `weeklyEarnings`, `activeDays`, and `completedBookings`; requirements also ask for elder profile snapshot. Include the snapshot additively, e.g. `elder: {id,name,initials,area,portraitUrl}`.

## File-Level Plan Guidance

Likely files to create:

- `backend/app/schemas/persona.py` for Phase 3 DTOs.
- `backend/app/services/persona_queries.py` for shared projection, mapping, ownership, and aggregate helpers.
- `backend/tests/test_persona_elder.py`
- `backend/tests/test_persona_requestor.py`
- `backend/tests/test_persona_companion.py`
- `backend/tests/test_persona_locale_and_authz.py`
- `backend/alembic/versions/0002_listing_demo_match_fields.py` if persisting seeded match/distance fields.

Likely files to modify:

- `backend/app/routers/elder.py`
- `backend/app/routers/requestor.py`
- `backend/app/routers/companion.py`
- `backend/app/models/listing.py` if adding persisted match/distance columns.
- `backend/scripts/seed_data.py` to move provider `distance`/`match_*` into listing seed rows.
- `backend/scripts/seed.py` to insert/update new listing columns.
- `backend/app/schemas/__init__.py` only if local pattern expects exports.

Do not modify frontend files in Phase 3. Frontend type extension and screen wiring are Phase 7.

## Requirement Coverage Notes

- **ELDER-01:** Implement `GET /elders/{elderId}/listings`; enforce current user is elder and `elderId == current_user.id`; include inactive listings; include menu and multi-locale title fields.
- **ELDER-02:** Implement `PATCH /listings/{listingId}`; whitelist mutable fields (`description`, prices, priceUnit, halal, days, isActive, titles, category if needed); reject non-owner with 403; return updated full listing.
- **ELDER-03:** Implement `GET /elders/{elderId}/bookings`; join bookings through listings owned by elder; return denormalised requestor/listing fields as camelCase.
- **ELDER-04:** Implement `POST /bookings/{bookingId}/respond`; enforce owner, pending-only transition, `409` when non-pending.
- **ELDER-05:** Implement `GET /elders/{elderId}/earnings/summary`; aggregate completed bookings; use KL month boundary.
- **REQ-01:** Implement search over active listings joined to elder user; support `query`, `halal_only`, `open_now`, and `max_distance_km` best-effort for seeded demo; include elder snapshot fields and menu.
- **REQ-02:** Implement `GET /listings/{listingId}`; active listing for requestors, include reviews and full menu.
- **REQ-03:** Use persisted seeded `matchScore`/`matchReason` first; fallback deterministically from rating/distance only when missing. Do not call Qwen.
- **REQ-04:** Implement `POST /requestor/bookings`; requestor-only; infer snapshots server-side; return pending booking; 404 for inactive/missing listing.
- **REQ-05:** Implement `GET /requestor/bookings`; requestor-only; filter by JWT user id; return denormalised fields.
- **COMP-01:** Implement dashboard; companion-only; validate `companion_links`; include elder snapshot and aggregates.
- **COMP-02:** Implement alerts; companion-only; validate link; project `title` and `message` from one locale column with English fallback; return `{id,type,title,message,createdAt}`.
- **COMP-03:** Implement timeline; companion-only; validate link; project `text`, return seeded `relative_label` as `time`.
- **COMP-04:** Implement full-replacement preference PUT; companion-only; validate link; upsert or update preference row; return `204 No Content`.

## Pitfalls And Repo Constraints

- Do not read or rely on agent definition files under `get-shit-done/agents`.
- Do not modify frontend features, layout, copy, or styling. Phase 3 is backend only.
- Do not call DashScope/Qwen. This quick demo uses seeded `matchScore` and `matchReason`.
- Do not import `frontend/src/prototype/mock-data.js` or `backend/scripts/seed_data.py` from runtime routers. Seed constants are source material, not application storage.
- Do not add Redis/Tair cache yet. Phase 6 owns caching.
- Do not create a permission framework. Basic role and ownership checks are enough.
- Do not pick locale fields after loading all locale columns. Select a single locale expression in SQL with English fallback.
- Be careful with `requestor.py` prefix `/requestor`: defining `/listings/{listingId}` inside that router would produce `/requestor/listings/{listingId}`, which is not the required detail route. Put top-level listing detail in a no-prefix router or add a separate router.
- `HTTPException(detail="...")` is transformed by the global error handler into `{status,message}`. Use clear `detail` strings because they become frontend `message`.
- Existing `get_db` commits after the route returns. Tests that expect writes should use the existing fixture override and assert response plus DB state in the same transaction.
- `completed_at` can be null for non-completed bookings. Earnings queries must filter `status == "completed"` and non-null `completed_at`.
- Seeded booking dates are April 2026. Validation should either run relative to fixed test data or assert seeded totals with a controlled clock/helper.
- The current Phase 2 context intentionally uses demo auth and skips production password verification. Phase 3 should rely on current-user identity, not password/security behavior.

## Don't Hand-Roll

- Do not hand-roll JSON parsing or validation. Use Pydantic request schemas.
- Do not hand-roll SQL strings for locale selection. Use SQLAlchemy column mappings and `func.coalesce`.
- Do not hand-roll timezone math with fixed `+08:00` offsets. Use `zoneinfo.ZoneInfo("Asia/Kuala_Lumpur")`.
- Do not hand-roll ID generation for seeded test references. If tests need stable IDs, use `app.core.ids.entity_id`.
- Do not hand-roll background jobs, AI calls, notification dispatch, payment flows, or chat behavior in this phase.

## Validation Architecture

Plan validation at three layers: contract tests, authorization tests, and data-invariant tests.

### Test Data Baseline

Use the existing migrated/seeded database fixture. Tests can reference deterministic IDs through `entity_id()`:

- `entity_id("user", "siti")`
- `entity_id("user", "amir")`
- `entity_id("user", "faiz")`
- `entity_id("listing", "siti-listing-1")`
- `entity_id("booking", "siti-b1")`

Create helper functions in tests to log in through `/api/v1/auth/login` and return bearer headers for Siti, Amir, and Faiz. Do not bypass auth dependencies for endpoint tests unless testing a helper directly.

### Elder Validation

Tests should assert:

- Siti can fetch her listings, including the two seeded active listings, menu items, category, priceUnit, rating, halal, days, title fields, and `isActive`.
- Amir cannot fetch Siti's elder listings: 403.
- Siti can patch her listing and receives the updated full listing.
- Amir/Faiz cannot patch Siti's listing: 403.
- Siti can fetch bookings and sees pending, confirmed, and completed bookings with `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, and `itemDescription`.
- Siti can accept `siti-b1`, status becomes `confirmed`.
- Responding again to the same booking returns 409.
- Non-owner booking response returns 403.
- Earnings summary returns seeded completed total and count, and a KL-month total based on April 2026 seed data.

### Requestor Validation

Tests should assert:

- Amir search returns active listings with elder snapshot fields and menu.
- Search includes seeded `matchScore` and `matchReason` for providers where seed has values.
- Search does not call Qwen; add a static grep/assertion if a Qwen service exists later, or keep Phase 3 free of DashScope imports.
- `halal_only=true` filters non-halal listings out.
- `query` filters against selected title/description enough for demo flows.
- Listing detail returns reviews for Siti's listing and menu items.
- Amir can create a booking with unchanged payload `{listingId, scheduledAt, notes?}` and receives pending status plus denormalised snapshot fields.
- Creating a booking for inactive/missing listing returns 404.
- Amir's `GET /requestor/bookings` only returns bookings where `requestor_user_id == Amir`.
- Siti/Faiz cannot use requestor booking endpoints: 403.

### Companion Validation

Tests should assert:

- Faiz can fetch Siti dashboard, alerts, timeline, and update preferences.
- A companion not linked to Siti, or a non-companion user, receives 403.
- Alerts return `{id,type,title,message,createdAt}` and map stored `kind` directly as `care` or `celebration`.
- Timeline returns display-ready `time` from `relative_label` and locale-projected `text`.
- Preferences PUT returns 204 and persists all five booleans.

### Locale Projection Validation

Nyquist should create targeted tests that prove SQL-level locale behavior:

- Temporarily set Faiz locale to `ms`, fetch companion alerts, and assert Malay `message`.
- Temporarily set Faiz locale to `en`, fetch the same alert, and assert English `message`.
- Temporarily null one optional listing `title_zh` or match reason column, set user locale to `zh`, and assert English fallback.
- Inspect or unit-test `locale_expr()` so it returns a SQLAlchemy labelled `coalesce(...)` expression, not a Python row lookup.

### Ownership And Error Envelope Validation

Tests should assert all rejected cases return frontend-compatible envelopes:

- Missing bearer token returns `401` with `status` and `message`.
- Role mismatch returns `403` with `status` and `message`.
- Cross-user ownership returns `403`.
- Missing resource returns `404`.
- Invalid booking state transition returns `409`.
- Pydantic request errors return `422 {status,message,detail}` through the global handler.

### Manual Smoke Validation

After tests pass, run the demo flow against local FastAPI:

1. Login as Amir and search listings; verify seeded match cards render once Phase 7 wiring lands.
2. Create a booking for Siti's listing.
3. Login as Siti and confirm the new pending booking appears.
4. Accept the booking.
5. Login as Faiz and verify Siti dashboard, alerts, timeline, and preferences.

## Recommended Plan Structure

For planning, split into four implementation plans:

1. **Schemas, query helpers, and optional match-field migration.** Create DTOs, locale projection helpers, mapper helpers, Alembic migration, and seed updates for match/distance fields.
2. **Elder router.** Listings, patch, bookings, respond, earnings, with elder-focused tests.
3. **Requestor router.** Search, detail, create booking, requestor bookings, with seeded-match tests.
4. **Companion router.** Dashboard, alerts, timeline, preferences, with locale and link-ownership tests.

This keeps the highest-risk shared contract work first, then each persona can be validated independently.

## Confidence

High confidence on route contracts, auth dependency assumptions, booking semantics, companion data, and test harness patterns.

Medium confidence on exact frontend extended DTO field set because Phase 7 has not landed yet. Keep Phase 3 additive and generous in response fields so Phase 7 can narrow frontend usage without backend changes.

Medium confidence on requestor `distance` type. The prototype renders strings like `500m` and `1.2km`; plan should return the same display label as `distance` for demo fidelity, even if a future production API might prefer numeric kilometers.

---

*Research written for Phase 03: Persona Routers (Elder + Requestor + Companion).*
