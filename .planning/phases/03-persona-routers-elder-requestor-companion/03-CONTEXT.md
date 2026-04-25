# Phase 3: Persona Routers (Elder + Requestor + Companion) - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the non-AI persona API routes that let the existing elder, requestor, and companion shells read and mutate real Postgres data through FastAPI. This phase covers listings, bookings, earnings, companion dashboard data, alerts, timeline events, and alert preferences.

Out of scope: live Qwen ranking, KYC pipeline work, voice-to-profile work, frontend UI changes, refresh tokens, push notifications, real-time chat, payments, and production-grade recommendation logic.

</domain>

<decisions>
## Implementation Decisions

### Demo-First Scope
- **D-01:** Keep Phase 3 aggressively simple for the quick demo. Implement the endpoint behavior required by the existing frontend API client and seeded data, without adding new product features or extra backend policy layers.
- **D-02:** Do not call live DashScope/Qwen in Phase 3. Requestor listing search returns `matchScore` and `matchReason` from the seeded provider/listing data. If a seed row is missing these values, use a small deterministic fallback only to preserve response shape.

### Persona Access Rules
- **D-03:** Enforce basic role and ownership checks only. Elders may access their own elder routes, requestors may access their own bookings, and companions may access only elders linked through `companion_links`.
- **D-04:** Reject role mismatches and cross-user access with `403` using the standard `{status, message, detail?}` ApiError envelope. Do not build a generalized permission framework in this phase.

### Locale Projection
- **D-05:** Locale-aware fields are projected at SQL/query-construction level based on the authenticated user's `users.locale`, with English fallback via `coalesce`.
- **D-06:** Responses should include display-ready fields (`title`, `message`, `text`) required by the current client. Additive multi-locale fields may be included where the frontend DTOs need them, but planning should prioritize preserving the existing screen behavior.

### Booking Behavior
- **D-07:** Keep the requestor booking payload unchanged: `{listingId, scheduledAt, notes?}`. The backend infers required snapshot fields from seeded listing, menu, and requestor data.
- **D-08:** New bookings start as `pending`; elder response transitions only `pending -> confirmed` or `pending -> cancelled`. Non-pending responses return `409`.
- **D-09:** Booking rows remain denormalized: `requestor_name`, `requestor_initials`, `requestor_avatar_url`, `listing_title`, `quantity_label`, `item_description`, and `amount` are copied into the booking at creation time.

### Companion Data
- **D-10:** Companion dashboard, alerts, and timeline use seeded or straightforward derived data for v1 demo reliability.
- **D-11:** Alert preferences should persist through `PUT /companions/elders/{elderId}/alert-preferences` and return `204 No Content`, but Phase 3 does not need complex alert filtering based on those preferences unless it falls out trivially.
- **D-12:** Companion alerts map stored data to the frontend shape `{id, type, title, message, createdAt}`. Keep the seeded alert/timeline story intact.

### Claude's Discretion
- Exact serializer/module boundaries, helper naming, and query helper extraction are flexible as long as endpoint shapes match the frontend client.
- Exact deterministic fallback for missing `matchScore` / `matchReason` is flexible, but seeded values are the primary source.
- Exact wording of backend error messages is flexible except where requirements specify exact text, such as invalid credentials in Phase 2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Locked milestone constraints, no-frontend-change rule, demo accounts, locale-aware data policy, booking denormalization.
- `.planning/REQUIREMENTS.md` §Elder Endpoints, §Requestor Endpoints, §Companion Endpoints — ELDER-01..05, REQ-01..05, COMP-01..04.
- `.planning/ROADMAP.md` §Phase 3 — Phase goal and five success criteria.
- `.planning/STATE.md` — Carried-forward decisions and current workflow state.
- `.planning/phases/01-backend-scaffold-schema-seed/01-CONTEXT.md` — Schema, seed, locale columns, booking denormalization, testing constraints.
- `.planning/phases/02-auth-bearer-middleware/02-CONTEXT.md` — Auth helper decisions, `get_current_user`, role basics, bearer-token contract.

### Backend files
- `backend/app/routers/elder.py` — Phase 3 replaces the elder stub with listings, bookings, booking response, and earnings endpoints.
- `backend/app/routers/requestor.py` — Phase 3 replaces the requestor stub with listing search/detail and requestor booking endpoints.
- `backend/app/routers/companion.py` — Phase 3 replaces the companion stub with dashboard, alerts, timeline, and preferences endpoints.
- `backend/app/models/listing.py` — Listing and menu schemas, locale title columns, category/price unit/check constraints.
- `backend/app/models/booking.py` — Denormalized booking snapshot schema and status transitions.
- `backend/app/models/companion_alert.py` — Alert kind/title/text locale columns.
- `backend/app/models/timeline_event.py` — Timeline event locale columns and relative label fields.
- `backend/app/core/enums.py` — String enum mirrors for roles, locales, booking status, listing category, price unit, alert kind/severity.
- `backend/app/schemas/common.py` — ApiError envelope shape.

### Frontend contract
- `frontend/src/services/api/endpoints/elder.ts` — Required elder route paths and response types.
- `frontend/src/services/api/endpoints/requestor.ts` — Required requestor route paths, query params, and booking payload shape.
- `frontend/src/services/api/endpoints/companion.ts` — Required companion route paths and `204` preference behavior.
- `frontend/src/services/api/types.ts` — Current DTO baseline; later frontend wiring may extend additively, but Phase 3 responses should already be shaped for those fields.
- `frontend/src/prototype/mock-data.js` — Seeded demo values, including provider `matchScore` and `matchReason`, bookings, alerts, reviews, and timeline.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/models/*` already defines the Phase 1 schema needed for persona data: users, listings, menu items, bookings, reviews, companion links, alert preferences, alerts, and timeline events.
- `frontend/src/services/api/endpoints/{elder,requestor,companion}.ts` already defines the exact route contract Phase 3 should satisfy.
- `frontend/src/prototype/mock-data.js` is the seeded demo source for smart-match display values and screen content.

### Established Patterns
- All protected routes should build on Phase 2's `get_current_user` dependency.
- Errors must return `{status, message, detail?}` to match the frontend `ApiError` wrapper.
- Locale display fields should be selected at SQL/query level with English fallback, not picked client-side.
- Backend constrained values use string columns plus DB `CHECK` constraints and Python `StrEnum` mirrors.

### Integration Points
- Elder routes connect to `getElderListings`, `updateListing`, `getElderBookings`, `respondToBooking`, and `getElderEarnings`.
- Requestor routes connect to `searchListings`, `createBooking`, `getRequestorBookings`, and the listing detail endpoint required by requirements/frontend wiring.
- Companion routes connect to `getCompanionDashboard`, `getCompanionAlerts`, future `getCompanionTimeline`, and `updateCompanionAlertPreferences`.
- Phase 6 may cache these reads later, but Phase 3 endpoints must be correct without Redis/Tair.

</code_context>

<specifics>
## Specific Ideas

- User confirmed this is "just a quick demo", so reliability and predictable seeded data matter more than live AI sophistication.
- `matchScore` and `matchReason` should come straight from seeded values, not Qwen.
- Preserve the illusion of smart matching in the UI while keeping Phase 3 deterministic and offline-friendly.
- Booking creation should not force frontend payload changes; infer snapshots server-side from existing data.

</specifics>

<deferred>
## Deferred Ideas

- Live Qwen-generated search ranking and match explanations — defer until Qwen is already integrated for the voice-to-profile pipeline or a later polish phase.
- Complex alert filtering based on companion preferences — defer unless trivial during implementation.
- Production recommendation logic, search scoring, personalization, and ranking audits — out of scope for quick demo Phase 3.

</deferred>

---

*Phase: 03-persona-routers-elder-requestor-companion*
*Context gathered: 2026-04-26*
