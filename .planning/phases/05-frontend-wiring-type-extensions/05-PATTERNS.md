# Phase 05 Pattern Mapping: Frontend Wiring + Type Extensions

**Phase:** 05 - Frontend Wiring + Type Extensions  
**Output:** pattern artifact for planner/executor reuse  
**Scope:** frontend API client gaps, additive type extensions, prototype screen data adapters, auth/session wiring, and ElderVoice client wiring only

## Likely File Changes

### `frontend/src/services/api/types.ts`

- **Role:** Frontend DTO contract for existing backend schemas and Phase 4 voice schemas.
- **Closest analogs:** existing `Session`, `UserProfile`, `Listing`, `Booking`, `CompanionAlert`; backend `schemas/auth.py` and `schemas/persona.py`.
- **Pattern to reuse:** keep direct camelCase frontend field names. Extend interfaces additively; do not rename or remove current fields.
- **Concrete extensions:**
  - `UserProfile`: add `kycStatus`, `avatarUrl?`, `area?`, `age?`, `phone?`, `initials`.
  - `Listing`: add `priceMax?`, `priceUnit`, `category`, `rating`, `reviewCount`, `halal`, `days`, `menu`, locale titles, elder display fields, `distance?`, `matchScore?`, `matchReason?`.
  - Add `MenuItem`, `Review`, `ListingDetail`, `CompanionElderSnapshot`, `TimelineEvent`, `ListingDraft`, and voice DTO unions.
  - Widen `CompanionDashboard.weeklyEarnings` to `EarningsSummary | number` for backend number compatibility and add `elder`.

### `frontend/src/services/api/endpoints/requestor.ts`

- **Role:** Requestor search/bookings client.
- **Closest analogs:** existing `searchListings()` and `createBooking()`.
- **Pattern to reuse:** `apiRequest<T>()`, `URLSearchParams`, backend snake_case query names.
- **Required gap:** add `getListingById(listingId)` for `GET /api/v1/listings/{listingId}` returning `ListingDetail`.
- **Important ID convention:** requestor cards must pass `listing.id` to `onProvider`, not old mock provider ids.

### `frontend/src/services/api/endpoints/companion.ts`

- **Role:** Companion dashboard, alert, timeline, and preferences client.
- **Closest analogs:** existing `getCompanionDashboard()`, `getCompanionAlerts()`, `updateCompanionAlertPreferences()`.
- **Required gap:** add `getCompanionTimeline(elderId)` for `GET /api/v1/companions/elders/{elderId}/timeline`.
- **Existing constraint:** all companion endpoints require a watched `elderId`; the frontend currently has no discovery endpoint or auth profile field for that id.

### `frontend/src/services/api/endpoints/voice.ts`

- **Role:** New Phase 4 voice-to-profile client module.
- **Closest analogs:** `kyc.ts` for direct presigned upload, existing endpoint modules for `apiRequest()`.
- **Pattern to reuse:**
  - HTTP routes use `apiRequest()` paths under `/voice-to-profile/...`.
  - Presigned S3 upload uses raw `fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": ... }, body })`, same direct-upload pattern as `uploadDocument()`.
  - WebSocket helper receives `token` explicitly and builds `ws(s)://<host>/api/v1/voice-to-profile/stream?token=<JWT>`.
- **Do not rely on Authorization headers for WebSocket.**

### `frontend/src/services/api/index.ts`

- **Role:** Barrel export.
- **Pattern to reuse:** existing endpoint export list.
- **Required gap:** export `./endpoints/voice` after creating it.

### `frontend/src/services/api/http.ts`

- **Role:** Core HTTP client and token holder.
- **Preferred Phase 5 pattern:** leave unchanged. `auth.login()` already calls `setApiAccessToken()`, and `PrototypeApp` can retain `session.accessToken` for `ElderVoice`.
- **Alternative only if planner accepts it:** add an additive token getter. Do not change current token storage semantics.

### `frontend/src/prototype/PrototypeApp.jsx`

- **Role:** login shell, session source, persona tab router, user badge.
- **Closest analogs:** existing `LoginScreen` local error flow and current `DEMO_ACCOUNTS` visual chip data.
- **Pattern to reuse:**
  - Keep `DEMO_ACCOUNTS` for chip copy/avatars/subtitles.
  - Replace credential matching with `login({ email, password })`, then call `getMe()`.
  - Store a merged session user in state: `id`, `persona`, `name`, `initials`, `locale`, `area`, `avatarUrl`, `accessToken`.
  - `signOut()` calls `logout()` before clearing local state.
  - Pass `user` or specific stable props to screens that need `user.id`, `accessToken`, or `elderId`.
- **No layout changes:** keep tab arrays, app shell, user badge markup, copy, classes, and styling as-is.

### `frontend/src/prototype/OnboardingFlow.jsx`

- **Role:** sign-up and visual eKYC flow.
- **Closest analogs:** existing commented imports and local `apiRegister` shim.
- **Pattern to reuse:**
  - Replace only `apiRegister()` with imported `register()`.
  - Keep the KYC visual flow local/demo unless backend KYC endpoints are verified as real for this milestone.
  - If local helpers remain, keep names scoped inside this file and do not import `mock-data`.

### `frontend/src/prototype/elder-screens.jsx`

- **Role:** elder dashboard, listings, profile, voice flow.
- **Imports to remove:** `ELDER_BOOKINGS`, `ELDER_COMPLETED`, `ELDER_LISTINGS`, `HERO_ELDER`.
- **Closest analogs:** current local `useEffect` animation patterns, `BookingRow`, `CompletedRow`, `Toggle`, `GeneratedListing`.
- **Pattern to reuse:** screen-local adapters from backend DTOs into the current mock presentation shape; keep JSX structure intact.

### `frontend/src/prototype/requestor-screens.jsx`

- **Role:** requestor home/search/detail/profile.
- **Imports to remove:** `ELDER_BOOKINGS` (unused), `PORTRAITS`, `PROVIDERS`, `REVIEWS`.
- **Closest analogs:** current provider card, search result card, `ProviderDetail`, `RequestorVoiceModal`.
- **Pattern to reuse:** adapt `Listing` / `ListingDetail` into provider-shaped display objects used by existing JSX.

### `frontend/src/prototype/companion-screens.jsx`

- **Role:** companion dashboard, activity alerts, profile preferences.
- **Imports to remove:** `COMPANION_ALERTS`, `ELDER_BOOKINGS`, `HERO_ELDER`, `TIMELINE`.
- **Closest analogs:** current dashboard alert card styles, timeline markup, profile toggle state.
- **Pattern to reuse:** use companion endpoints where they exist, keep inline decorative/live-feed demo content only where no backend contract exists.

### `frontend/.env.example` or deployment env only

- **Role:** backend URL configuration.
- **Pattern to reuse:** `env.ts` already reads `VITE_API_BASE_URL`; do not hardcode API origins in screen files.

## API Client Conventions

- `apiRequest<T>()` prepends `env.apiBaseUrl + "/api/v1"` and attaches the in-memory Bearer token when `setApiAccessToken()` has run.
- Endpoint modules are plain camelCase functions and use `JSON.stringify(payload)` for JSON bodies.
- 204 responses are typed as `undefined as T`; `updateCompanionAlertPreferences()` already demonstrates this.
- Errors propagate as `ApiError` shaped objects from `http.ts`; screens should reuse the existing local error block/state style instead of parsing arbitrary response bodies.
- Direct upload and WebSocket flows are the only places that should bypass `apiRequest()`.

## Data Flow Patterns

### Auth and Session

1. `LoginScreen` calls `login()` with typed credentials or demo-chip credentials.
2. `auth.login()` stores the access token through `setApiAccessToken()`.
3. `PrototypeApp` immediately calls `getMe()` and merges profile fields with the session token.
4. `PrototypeApp` drives persona routing from `profile.role` mapped to existing `user.persona`.
5. Persona screens receive only the props they need: usually `user`, `user.id`, `accessToken`, and for companion the watched elder id.
6. Sign out calls `logout()` and clears local shell state.

### Elder Screens

- `ElderDashboard(user)` fetches `getElderBookings(user.id)` and optionally `getElderEarnings(user.id)`.
- Pending/confirmed/completed sections come from one booking array filtered by `status`.
- `respondToBooking(id, "accept" | "decline")` replaces local-only state transitions; map backend `"cancelled"` to the existing hidden/declined behavior.
- `ElderListings(user)` fetches `getElderListings(user.id)` and maps listing DTOs into current card props.
- `Toggle` can remain visually local, but its click handler should call `updateListing(id, { isActive })` before committing or reverting local state.
- `ElderProfile(user)` uses `getMe()` or the already stored profile. Do not invent new profile endpoints.
- `ElderVoice(user.accessToken)` uses Phase 4 voice helpers; the existing generated listing card receives an optional `ListingDraft` adapter result.

### Requestor Screens

- `RequestorHome` fetches `searchListings({})` once and derives the "popular near you" and "recently booked" slices from the same result set.
- Category/search actions call `onSearch(query)`, and `RequestorSearch` calls `searchListings({ query })`.
- Search result cards use `matchScore` and `matchReason` when present, preserving the existing smart-match block.
- `ProviderDetail(providerId)` becomes `ProviderDetail(listingId)` and calls `getListingById(listingId)`.
- Reviews render from `ListingDetail.reviews`; menu and availability render from `menu` and `days`.
- Saved providers in `RequestorProfile` has no endpoint; use a search slice only if the goal is mock import removal, otherwise leave profile-only preference arrays local.
- Do not wire `Book This` to real booking creation unless the planner accepts a deterministic demo scheduled time, because the current UI has no date/time selection.

### Companion Screens

- `CompanionDashboard(elderId)` calls `getCompanionDashboard(elderId)`, `getCompanionAlerts(elderId)`, and `getCompanionTimeline(elderId)`.
- Dashboard header elder display comes from `CompanionDashboard.elder`.
- Earnings card uses `weeklyEarnings` from the dashboard response; existing lifetime/month comparison copy is decorative unless a backend field exists.
- Alert cards render `CompanionAlert.message`, not old `text_en` / locale-specific mock fields.
- Timeline renders `TimelineEvent.text` and `TimelineEvent.time`, not old `text_en`.
- `CompanionProfile` maps local preference keys to API keys on toggle/save:
  - `inactivity -> inactivity24h`
  - `overwork -> overworkSignals`
  - `earnings -> earningsMilestones`
  - `newBookings -> newBookings`
  - `reviews -> reviews`
  - `appUpdates` stays local because the backend has no matching field.
- **Open contract gate:** the frontend still needs a companion-safe way to know the watched `elderId`. Preferred fix is a backend/auth profile extension or a companion "my elders" endpoint. If Phase 5 remains frontend-only, the only available bridge is a clearly isolated demo mapping for Faiz -> Siti; do not call elder-only endpoints with a companion token.

### ElderVoice

- UI locale maps to backend voice language as `en -> en-US`, `zh -> zh-CN`, `ms -> ms-MY`, `ta -> ta-IN`.
- Streaming path is for `en-US` and `zh-CN`: open WebSocket with `?token=`, send the language handshake, stream 16 kHz mono Int16 PCM frames, send `{type:"end"}`, then adapt final `ListingDraft`.
- Batch path is for `ms-MY` and `ta-IN`: record/upload browser audio in a backend-supported format, request upload URL, direct PUT, submit batch job, poll status.
- Keep `SpeechRecognition` fallback for unsupported browser/audio paths. Since Phase 4 has no text-to-listing endpoint, fallback transcript can remain degraded local demo behavior.
- Existing `state`, `seconds`, `transcript`, `steps`, and `GeneratedListing` flow should remain; only the source of transcript/draft changes.

## Adapter Patterns

### Shared display adapters

- **Money:** `amount` / `price` numbers become existing RM strings. If `priceMax` exists, show a range in the existing style (`RM15-20`); otherwise show `RM15`.
- **Dates:** ISO `scheduledAt` / `createdAt` become the short presentation labels currently expected by rows. Keep this logic screen-local unless duplication becomes real.
- **Avatar:** `avatarUrl`, `requestorAvatarUrl`, and `elderPortraitUrl` map to existing `portrait` props; initials fields pass through.
- **Ratings:** numeric `rating` and `reviewCount` map to current `Stars` and booking/review count labels.
- **Fallbacks:** use `"—"` or existing static copy only where current JSX already does; avoid adding new empty-state copy.

### Elder booking adapter

Backend `Booking` -> existing row shape:

| Backend field | Existing display field |
| --- | --- |
| `requestorName` | `requestor` |
| `requestorInitials` | `requestorInitials` |
| `requestorAvatarUrl` | `portrait` |
| `listingTitle` or `itemDescription` | `item` |
| `qty` | `qty` |
| `amount` + `currency` | `price` |
| `scheduledAt` | `date` |
| `status` | `status`, with `cancelled` hidden like old `declined` |

### Elder listing adapter

Backend `Listing` -> current elder listing card:

| Backend field | Existing display field |
| --- | --- |
| `id` | `id` |
| `title` | `title` |
| `price` / `priceMax` | `price` display string |
| `priceUnit` | `priceUnit` |
| `rating` | `rating` |
| `reviewCount` | existing `bookings` slot if no booking-count endpoint exists |
| `isActive` | old `active` / `Toggle` input |

### Requestor provider adapter

Backend `Listing` / `ListingDetail` -> current provider shape:

| Backend field | Existing display field |
| --- | --- |
| `id` | `id` used for detail route |
| `elderName` | `name` |
| `elderInitials` | `initials` |
| `elderArea` | `area` |
| `elderPortraitUrl` | `portrait` |
| `title` | `service` |
| `description` | `description` |
| `reviewCount` | `reviews` |
| `price` / `priceMax` | `price` |
| `priceUnit` | `priceUnit` |
| `distance` | `distance` |
| `matchScore` | `matchScore` |
| `matchReason` | `matchReason` |
| `days` | `days` |
| `menu` | `menu`, with menu prices formatted |

### Companion adapters

- `CompanionDashboard.elder` replaces every `HERO_ELDER` dashboard/profile header use that is backed by API data.
- `CompanionAlert.type` currently only distinguishes `care` and `celebration`; map to existing visual tones locally (`celebration -> success`, care alerts -> warning/info using conservative default). Do not request backend styling fields.
- `TimelineEvent.text` already arrives locale-projected; use it directly instead of `text_${lang}` lookup.
- Upcoming booking cards have no companion endpoint. Keep them out of API wiring unless a companion-safe endpoint/field is added.

### Voice draft adapter

Phase 4 `ListingDraft` uses snake_case:

| Draft field | Existing generated card field |
| --- | --- |
| `service_offer` | `title` / `description` source |
| `price_amount` | `price` string |
| `price_unit` | `priceSub` |
| `capacity` | `capacity` |
| `location_hint` | `area` |
| `dietary_tags` | existing badges only where already static |
| `category` | existing Home Cooking badge unless backend category is rendered without copy/style changes |

`GeneratedListing` should accept an optional draft-derived initial state and preserve its hardcoded fallback for browser fallback/error paths.

## Execution Order For Planning

1. Extend `types.ts` and endpoint helpers first so screen imports have stable names.
2. Wire auth/session in `PrototypeApp.jsx`; pass user/session props downward.
3. Replace mock imports in elder screens with API calls and adapters.
4. Replace requestor mock imports with search/detail API calls and adapters.
5. Replace companion mock imports only where backend endpoints exist; resolve the watched-elder-id gate before final verification.
6. Wire `ElderVoice` only after Phase 4 voice routes and schemas are implemented beyond the current stub.
7. Run no-visual-change and contract verification.

## Planner / Executor Pitfalls To Avoid

- Do not edit `prototype.css`, class names, product copy, tab structure, layout, or visual behavior for Phase 5.
- Do not introduce React Router, TanStack Query, SWR, global state, a generated client, or a new HTTP abstraction.
- Do not call `/api/v1` manually inside ordinary endpoint helpers; `apiRequest()` owns the prefix.
- Do not use WebSocket Authorization headers; voice auth is query token.
- Do not call elder-only routes with a companion token.
- Do not remove all inline demo/decorative data blindly. The scope is replacing mock-data imports and wiring real endpoints where contracts exist.
- Do not force backend DTOs to match stale frontend mock shapes; adapt locally in the screen files.
- Do not use WebM/Opus batch uploads unless Phase 4 backend explicitly supports/transcodes it.

## Verification Hooks And Commands

Frontend static verification:

```sh
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run build
```

Mock-import removal guard:

```sh
rg "from './mock-data'|mock-data" frontend/src/prototype
```

Backend contract prerequisites:

```sh
cd backend && uv run pytest tests/test_auth_demo.py tests/test_persona_elder.py tests/test_persona_requestor.py tests/test_persona_companion.py tests/test_persona_locale_and_authz.py -q
```

After Phase 4 voice is implemented, include its voice contract tests before marking ElderVoice wired.

Manual smoke with backend and seeded DB:

- Siti quick-login authenticates, elder dashboard/listings/profile render from API, and accept/decline updates status.
- Amir quick-login authenticates, home/search/detail render API listings, detail shows reviews/menu/days, and search result click uses listing ids.
- Faiz quick-login authenticates, companion dashboard/alerts/timeline render from companion endpoints without elder-only calls.
- ElderVoice streams for English/Chinese, batches for Malay/Tamil, and keeps SpeechRecognition fallback usable.
- Browser console has no CORS errors, unhandled promise rejections, or failed `/api/v1` paths caused by double-prefixing.

No-visual-change review:

- Compare before/after screens for login, onboarding, elder dashboard/listings/voice/profile, requestor home/search/detail/profile, companion dashboard/alerts/profile.
- Review git diff for CSS/className/copy changes. Any such change should be treated as suspicious unless it directly fixes broken API wiring.

## PATTERN MAPPING COMPLETE
