---
phase: 05-frontend-wiring-type-extensions
plan: 01
subsystem: frontend-api
tags: [react, typescript, api-client, websocket, voice]

requires:
  - phase: 03-persona-routers
    provides: persona HTTP route contracts for listings, bookings, companion dashboard, alerts, and timeline
  - phase: 04-voice-to-profile-pipeline
    provides: voice HTTP, S3 presign, batch status, and WebSocket contracts
provides:
  - Additive frontend DTO extensions for persona and voice contracts
  - Requestor listing detail and companion timeline endpoint helpers
  - Voice endpoint module for HTTP, direct S3 upload, and WebSocket setup
  - API barrel export for voice helpers
affects: [05-02-auth-wiring, 05-03-elder-screens, 05-04-requestor-screens, 05-05-companion-screens, 05-06-eldervoice]

tech-stack:
  added: []
  patterns:
    - Existing apiRequest-relative HTTP endpoint helpers
    - Raw fetch only for presigned S3 PUT
    - Explicit-token WebSocket helper using query-string auth

key-files:
  created:
    - frontend/src/services/api/endpoints/voice.ts
  modified:
    - frontend/src/services/api/types.ts
    - frontend/src/services/api/endpoints/requestor.ts
    - frontend/src/services/api/endpoints/companion.ts
    - frontend/src/services/api/index.ts

key-decisions:
  - "Kept all normal HTTP helpers on apiRequest-relative paths so /api/v1 remains owned by http.ts."
  - "Passed the voice WebSocket token explicitly into createVoiceStream and used it only as the backend-required token query parameter."
  - "Preserved the existing EarningsSummary type while widening CompanionDashboard.weeklyEarnings to accept the backend number shape."

patterns-established:
  - "Endpoint modules expose camelCase helpers backed by apiRequest<T>() with paths relative to the API prefix."
  - "Direct cloud uploads bypass apiRequest and throw a plain Error on non-OK S3 PUT responses."
  - "Voice WebSocket setup converts env.apiBaseUrl from http(s) to ws(s), sets the /api/v1 stream path, and sends the language handshake on open."

requirements-completed:
  - FE-01
  - FE-02
  - FE-03
  - FE-09

duration: 4 min
completed: 2026-04-25
---

# Phase 05 Plan 01: Frontend API contracts, endpoint gaps, voice helper, and barrel export Summary

**Typed frontend API contracts now cover Phase 3 persona DTOs and Phase 4 voice transport helpers without changing prototype UI code.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T18:12:37Z
- **Completed:** 2026-04-25T18:16:55Z
- **Tasks:** 5
- **Files modified:** 5 API client files

## Accomplishments

- Extended `types.ts` additively with backend-aligned user, listing, booking, companion, timeline, listing-draft, and voice DTOs.
- Added missing requestor and companion endpoint helpers for listing detail and timeline reads.
- Created the voice helper module for upload URL, S3 PUT, batch submit/status, and WebSocket stream setup, then exported it from the API barrel.

## Task Commits

Each task was committed atomically:

1. **Task 05-01-01: Extend frontend DTOs additively in types.ts** - `e4225a2` (feat)
2. **Task 05-01-02: Add requestor listing detail endpoint helper** - `6eb5ec1` (feat)
3. **Task 05-01-03: Add companion timeline endpoint helper** - `19b42b4` (feat)
4. **Task 05-01-04: Create voice.ts endpoint helper for Phase 4 HTTP, S3 PUT, and WebSocket contracts** - `05b0bc5` (feat)
5. **Task 05-01-05: Export voice endpoint module from API barrel** - `8a4f241` (feat)

**Plan metadata:** pending in docs commit

## Files Created/Modified

- `frontend/src/services/api/types.ts` - Additive DTO extensions and voice contract types.
- `frontend/src/services/api/endpoints/requestor.ts` - `getListingById()` helper returning `ListingDetail`.
- `frontend/src/services/api/endpoints/companion.ts` - `getCompanionTimeline()` helper returning `TimelineEvent[]`.
- `frontend/src/services/api/endpoints/voice.ts` - Voice HTTP, S3 PUT, and WebSocket helper module.
- `frontend/src/services/api/index.ts` - Barrel export for the voice endpoint module.

## Decisions Made

- Kept `apiRequest`, `setApiAccessToken`, `ApiError`, and the `/api/v1` prefix behavior unchanged.
- Did not add a frontend token getter or persistent token storage; `createVoiceStream()` receives the token explicitly.
- Kept prototype JSX, CSS, copy, layout, and mock import wiring untouched for later Phase 05 plans.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing endpoint comments tripped the no-/api/v1 helper guard**
- **Found during:** Tasks 05-01-02 and 05-01-03
- **Issue:** Existing JSDoc comments in `requestor.ts` and `companion.ts` contained `/api/v1`, causing the acceptance guard to fail even though runtime `apiRequest()` paths were correctly relative.
- **Fix:** Normalized those endpoint comments to relative paths while leaving helper behavior unchanged.
- **Files modified:** `frontend/src/services/api/endpoints/requestor.ts`, `frontend/src/services/api/endpoints/companion.ts`
- **Verification:** `rg "/api/v1" frontend/src/services/api/endpoints/requestor.ts frontend/src/services/api/endpoints/companion.ts` returns no matches.
- **Committed in:** `6eb5ec1`, `19b42b4`

---

**Total deviations:** 1 auto-fixed blocking acceptance issue. **Impact on plan:** Documentation-only cleanup; no runtime behavior, API prefix, UI, or token handling changed.

## Issues Encountered

- Initial `npm run typecheck` failed because frontend dependencies were not installed locally (`tsc: command not found`). Ran `npm ci`, then `npm run typecheck` passed. The generated `tsconfig.app.tsbuildinfo` side effect was restored so no non-API files changed.

## Verification

- `cd frontend && npm run typecheck` - passed after `npm ci`.
- `rg "from './mock-data'|mock-data" frontend/src/prototype` - expected existing prototype imports remain for later plans.
- `rg "/api/v1" frontend/src/services/api/endpoints/requestor.ts frontend/src/services/api/endpoints/companion.ts` - no matches.
- `rg "localStorage|sessionStorage" frontend/src/services/api` - no matches.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `05-02-PLAN.md` to wire auth quick-login, signout, and onboarding register flows against the stable API client exports.

---
*Phase: 05-frontend-wiring-type-extensions*
*Completed: 2026-04-25*
