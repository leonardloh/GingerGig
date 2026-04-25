# Phase 5 - Frontend Wiring + Type Extensions: Research

Objective: what must be known to plan Phase 5 well. This phase is a frontend wiring phase, not a redesign. No UI feature, layout, copy, styling, CSS, tab structure, or visual behavior changes are allowed. UI-SPEC is not applicable except as a no-visual-change guardrail.

Scope source: `.planning/ROADMAP.md` Phase 5 and `FE-01` through `FE-09`.

Dependencies: Phase 3 persona routes must be available. Phase 4 voice routes must be complete before ElderVoice can be wired; current `STATE.md` still shows Phase 4 in progress and `backend/app/routers/voice.py` is still a stub in the working tree, while the Phase 4 plans define the intended contract.

---

## Standard Stack

- Use the existing Vite/React stack only: React state/effects, native `fetch`, and the typed client under `frontend/src/services/api`.
- Keep `apiRequest<T>()`, `setApiAccessToken()`, `ApiError`, and the `/api/v1` prefix unchanged.
- Add endpoint helpers in the existing `frontend/src/services/api/endpoints/*` style. No TanStack Query, SWR, router, state library, CSS framework, or generated API client.
- Extend `frontend/src/services/api/types.ts` additively only. Do not rename or remove any existing field.
- Prefer small local adapter functions inside the screen files to translate backend DTOs to the existing JSX's display shape. This keeps JSX layout/copy stable while removing mock imports.

---

## API Client Conventions

Current client behavior:

- `apiRequest<T>(path, options)` prepends `env.apiBaseUrl + "/api/v1"` and attaches `Authorization: Bearer <token>` when `setApiAccessToken()` has been called.
- `auth.login()` and `auth.register()` already store the returned token through `setApiAccessToken()`.
- 204 responses return `undefined as T`.
- Errors throw the frontend `ApiError` shape.
- Endpoint modules use camelCase functions and `JSON.stringify(payload)` for bodies.

Endpoint gaps to plan:

- Add `frontend/src/services/api/endpoints/voice.ts`.
- Add `getListingById(id)` to `requestor.ts` or a shared listing endpoint module. Backend route is `GET /api/v1/listings/{listingId}` and returns `ListingDetail` (`Listing` plus `reviews`).
- Add `getCompanionTimeline(elderId)` to `companion.ts`. Backend route is `GET /api/v1/companions/elders/{elderId}/timeline`.
- `voice.ts` should include the Phase 4 upload URL helper even though `FE-02` names only submit/status: Phase 4 plan defines `POST /voice-to-profile/audio-upload-url`, required for browser-direct S3 PUT before `submitBatchJob(s3Key, language)`.
- WebSocket helpers cannot rely on `Authorization` headers. Phase 4 locks `?token=<JWT>` as the auth mechanism. Either pass the session token from `PrototypeApp` into `ElderVoice`, or add an additive getter in `http.ts`; do not change existing token behavior.

Likely `voice.ts` contract from Phase 4 plans:

- `createVoiceStream({ token, language })` opens `ws(s)://<host>/api/v1/voice-to-profile/stream?token=<JWT>`.
- First client text frame: `{ "language": "en-US" | "zh-CN" }`.
- Client audio frames: raw 16 kHz mono signed Int16 PCM, little-endian.
- Clean end signal: text frame `{ "type": "end" }`.
- Server messages: `{type:"partial", text}` and `{type:"final", listing}`; extraction errors use `{type:"error", message:"Listing extraction failed"}`.
- Batch: `POST /voice-to-profile/audio-upload-url`, direct `PUT` to S3 with exact signed `Content-Type`, `POST /voice-to-profile/batch`, then poll `GET /voice-to-profile/batch/{jobId}` until `ready` or `failed`.

---

## Type Extensions

Match the backend Pydantic DTOs in `backend/app/schemas/persona.py` and Phase 4 plans.

Additive changes needed in `types.ts`:

- `UserProfile`: add `kycStatus`, `avatarUrl?`, `area?`, `age?`, `phone?`, `initials`.
- `MenuItem`: new `{ id: string; name: string; price: number | string }`.
- `Review`: new `{ id; reviewerName; rating; comment; createdAt }`.
- `Listing`: add `priceMax?`, `priceUnit`, `category`, `rating`, `reviewCount`, `halal`, `days`, `menu`, `titleMs?`, `titleEn?`, `titleZh?`, `titleTa?`, `elderName?`, `elderInitials?`, `elderArea?`, `elderPortraitUrl?`, `distance?`, `matchScore?`, `matchReason?`.
- `ListingDetail`: new type extending `Listing` with `reviews: Review[]`.
- `Booking`: add `requestorInitials`, `requestorAvatarUrl?`, `listingTitle`, `qty`, `itemDescription`, `currency`, `notes?`. Keep existing `requestorName`, `amount`, `scheduledAt`, `status`.
- `CompanionDashboard`: backend shape is currently `{status, weeklyEarnings: number, activeDays, completedBookings, elder}`. The existing frontend type says `weeklyEarnings: EarningsSummary`, so Phase 5 should widen this compatibly to `EarningsSummary | number` for actual backend usage. Do not force the backend to match the stale frontend type.
- `CompanionElderSnapshot`: new `{ id; name; initials; area?; portraitUrl? }`.
- `CompanionAlert`: already has `title`; keep it and ensure `createdAt` is accepted as string.
- `TimelineEvent`: new `{ id; eventType; text; time; occurredAt; relatedId? }`.
- `ListingDraft`: use the Phase 4 canonical snake_case shape: `name?`, `service_offer`, `category`, `price_amount?`, `price_unit?`, `capacity?`, `dietary_tags`, `location_hint?`, `language`. Do not camelCase it unless the backend changes first.
- Voice DTOs: `VoiceLanguage = "en-US" | "zh-CN" | "ms-MY" | "ta-IN"`, stream message union, batch submit/status/upload URL response types.

Important adapter note: mock data often stores presentation strings (`price: "RM15-20"`, `date: "Tomorrow, 6:30 PM"`, `portrait`, `service`, `reviews`). Backend DTOs use numeric amounts, ISO datetimes, `avatarUrl`/`elderPortraitUrl`, `title`, `reviewCount`, and `description`. Plan local display adapters so rendered copy stays the same style without changing backend DTOs.

---

## Mock Import Replacement Map

### `PrototypeApp.jsx`

Current login behavior is in-memory matching against `DEMO_ACCOUNTS`.

Plan:

- Keep the `DEMO_ACCOUNTS` array for visual chips only: name, initials, subtitle, persona, email/password.
- Change `LoginScreen` submit and chip click handlers to call `auth.login({email,password})`.
- After login, call `getMe()` or merge returned session with the demo account. Store enough user state for existing shell: `persona` (from `profile.role`), `name`, `initials`, `locale`, `id`, and `accessToken`.
- Keep chips visually identical. Loading/error states can reuse the existing inline error block; do not add new UI.
- On sign out, call `logout()` before clearing local state.

Risk: backend demo auth currently ignores password for seeded demo emails. Do not add frontend-side password validation beyond the current form behavior.

### `OnboardingFlow.jsx`

Current file has inline `apiRegister`, `apiInitiateKycSession`, `apiStartVerification`, and `apiWaitForResult` mocks.

Plan:

- Replace `apiRegister` with imported `register` from `../services/api/endpoints/auth`.
- Keep the eKYC stepper visually unchanged and treat real KYC as out of scope after eKYC removal. The current backend `kyc.py` is still a stub, so do not wire KYC calls unless a prior phase reintroduces those endpoints.
- If the planner chooses to remove inline KYC mock helpers, it must preserve the same step transitions and processing/result visuals with local no-op/demo simulation. The safer plan is auth-real, KYC-demo.

### `elder-screens.jsx`

Imports to remove: `ELDER_BOOKINGS`, `ELDER_COMPLETED`, `ELDER_LISTINGS`, `HERO_ELDER`.

Screens:

- `ElderDashboard`: use `getMe()` for `HERO_ELDER` display, `getElderBookings(user.id)` for pending/confirmed/completed buckets, and optionally `getElderEarnings(user.id)` for totals. Completed data should be filtered from the unified bookings response where `status === "completed"`.
- `BookingRow`: replace local accept/decline state with `respondToBooking(id, "accept" | "decline")`, then update local booking status. Backend decline returns `cancelled`; existing UI hides `"declined"`, so adapter should hide cancelled rows without changing copy.
- `CompletedRow` and `BookingRow`: adapt `Booking` fields to existing props: `requestorName -> requestor`, `requestorAvatarUrl -> portrait`, `itemDescription/listingTitle -> item`, `amount -> price display`, `scheduledAt -> date display`.
- `ElderListings`: use `getElderListings(user.id)`. Replace `active` with `isActive`, `bookings` with `reviewCount` only if no booking count endpoint exists. Use `updateListing(id, {isActive})` for the toggle if wiring behavior is in scope.
- `ElderProfile`: use `getMe()` for name, area, initials, avatar, KYC status.
- `ElderVoice`: wire Phase 4 voice helper. The typed/manual path can keep its existing UX but should feed the generated listing card from a `ListingDraft` adapter when available.

### `requestor-screens.jsx`

Imports to remove: `ELDER_BOOKINGS` (unused), `PORTRAITS`, `PROVIDERS`, `REVIEWS`.

Screens:

- `RequestorHome`: use `searchListings({})` for "popular near you" and "recently booked" slices. There is no dedicated popular/recent endpoint, so reuse search results and preserve the existing slice counts.
- `RequestorSearch`: use `searchListings({ query })`; backend query params already support `query`, `max_distance_km`, `halal_only`, `open_now`. Render `matchScore` and `matchReason` from API.
- `ProviderDetail`: add/use `getListingById(providerId)`. Render `reviews` from `ListingDetail.reviews`.
- `RequestorProfile`: use `getMe()` for profile header. Saved providers has no backend endpoint; reuse `searchListings({})` slice if the goal is to remove `PROVIDERS` import without adding features.
- Booking creation: backend has `createBooking`, but current `Book This` has no date/time selection and no visible flow. Planning should either leave this button behavior unchanged or use the existing button to create a deterministic demo booking only if explicitly accepted as preserving the prototype behavior.

Adapter fields:

- Existing provider shape wants `name`, `age`, `area`, `portrait`, `initials`, `service`, `reviews`, `price`, `distance`.
- Backend listing gives `elderName`, `elderInitials`, `elderArea`, `elderPortraitUrl`, `title`, `reviewCount`, numeric `price`/`priceMax`, `priceUnit`, `distance`.

### `companion-screens.jsx`

Imports to remove: `COMPANION_ALERTS`, `ELDER_BOOKINGS`, `HERO_ELDER`, `TIMELINE`.

Screens:

- `CompanionDashboard`: use `getCompanionDashboard(elderId)` for elder snapshot, weekly earnings, active days, completed booking count. Use `getCompanionAlerts(elderId)` for alert cards. Use `getCompanionTimeline(elderId)` for timeline.
- `CompanionAlerts`: much of this screen is inline live-feed demo data, not imported mock data. No backend endpoint currently covers "right now", "today stats", care circle, or the local feed array. Plan must decide whether to leave inline demo content or extend backend scope. Do not invent new product behavior in Phase 5.
- `CompanionProfile`: alert preferences can call `updateCompanionAlertPreferences`, but there is no read endpoint for existing preferences and local keys differ from API keys. Map local keys to `{inactivity24h, overworkSignals, earningsMilestones, newBookings, reviews}` and keep `appUpdates` local/out of API.

Endpoint gap: `CompanionDashboard` currently shows upcoming bookings from `ELDER_BOOKINGS.slice(0,2)`, but companion routes do not expose upcoming bookings. This must be resolved in planning: either add a small backend field/endpoint before wiring, or accept that the upcoming booking cards remain derived from another existing source. Do not call elder-only endpoints as companion; backend rejects that.

---

## ElderVoice Wiring

Language split:

- `en` UI locale should map to backend streaming language `en-US` (not current `en-MY`).
- `zh` maps to `zh-CN` and uses streaming.
- `ms` maps to `ms-MY` and uses batch.
- `ta` maps to `ta-IN` and uses batch.

Streaming path for `en-US` and `zh-CN`:

- Prefer `AudioWorklet`/Web Audio to capture microphone audio and downsample to 16 kHz Int16 PCM.
- Open WebSocket with token query param.
- Send handshake JSON first, then binary PCM frames.
- On stop, send `{type:"end"}` and wait for `final`.
- Update existing `transcript` from partial messages and existing generated card from the final `ListingDraft`.

Batch path for `ms-MY` and `ta-IN`:

- Capture audio in a Transcribe Batch-compatible format. Phase 4 research warns that WebM/Opus is not a safe batch format; prefer WAV/PCM unless backend explicitly accepts/transcodes another format.
- Request upload URL, direct PUT to S3 with matching `Content-Type`, submit batch job, poll status.
- Reuse the current `processing` state and step animation; no visual changes.

Fallback:

- Keep the existing `window.SpeechRecognition || window.webkitSpeechRecognition` code path for browsers without `AudioWorklet` or where mic/PCM capture fails.
- Phase 4 does not define a text-to-listing endpoint. If the fallback transcript cannot be sent to backend, keep the graceful fallback behavior local and clearly document that it is degraded demo behavior, not the primary AI path.

Generated listing:

- `GeneratedListing` currently starts from hardcoded listing text. Plan it to accept an optional `draft` prop and map `ListingDraft` fields into the existing editable card fields. Preserve the static initial fallback for errors/fallback browsers.

---

## Architecture Patterns

- Wire types first, then endpoint helpers, then screen adapters, then screen effects.
- Keep data fetching local to the existing screen components with `useEffect`; do not introduce shared state management.
- Pass authenticated user/session down from `PrototypeApp` only where needed (`user.id`, `user.persona`, `accessToken` for voice).
- Use "screen-local adapters" for display shape conversion. This avoids backend changes and keeps JSX structure stable.
- Preserve existing inline loading/error patterns: small local `loading`/`error` state, existing error blocks, no global toasts.
- Keep locale behavior backend-driven where endpoints already project locale by authenticated user. Frontend language picker still controls UI strings; backend data locale follows the user's stored locale until a profile update endpoint exists.

---

## Don't Hand-Roll

- Do not hand-roll a new HTTP client. Use `apiRequest`.
- Do not hand-roll JWT storage beyond the current in-memory token path unless explicitly scoped.
- Do not create a routing/state/query abstraction for this phase.
- Do not parse backend errors ad hoc in screens; catch `ApiError` and reuse its `message`/`detail` conservatively.
- Do not manually concatenate `/api/v1` in endpoint helpers except for WebSocket/S3 direct flows where `apiRequest` is not usable.
- Do not use `MediaRecorder` default WebM for Transcribe Batch unless Phase 4 backend explicitly supports it. Plan for WAV/PCM or a documented fallback.

---

## Common Pitfalls

- Phase numbering drift: current root guide mentions an older 8-phase pipeline, `STATE.md` mentions an older eKYC phase, but `ROADMAP.md` is authoritative for this request: Phase 5 is Frontend Wiring + Type Extensions.
- Phase 4 is not implemented in the current working tree. Do not plan ElderVoice as executable until the voice routes and schemas exist.
- `CompanionDashboard.weeklyEarnings` type mismatch: frontend currently expects `EarningsSummary`, backend returns a number; widen the type rather than removing the existing shape.
- Mock presentation strings do not match backend DTOs. Plan formatting adapters for RM price ranges, dates, avatars, review counts, and elder names.
- `OnboardingFlow` real KYC wiring is out of scope and backend KYC routes are stubs. Only auth/register should become real unless the roadmap changes.
- WebSocket auth must use `?token=`, not headers.
- Existing `ElderVoice` maps English to `en-MY`; backend streaming contract is `en-US`.
- Requestor detail receives a provider/listing id from search results. After wiring, ensure `onProvider` receives `listing.id`, not old mock provider ids like `"siti"` or `"chen"`.
- Companion upcoming bookings have no companion-safe endpoint. Do not call elder endpoints with a companion token.
- Removing all `mock-data` imports may still leave inline demo arrays in profiles/live-feed screens. The plan must distinguish "mock-data import removal" from "every inline decorative/static row becomes backend data".
- No visual changes means even "better" loaders, empty states, copy, spacing, and CSS edits should be rejected unless required to avoid a broken screen.

---

## Testing and Verification

Frontend commands:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

Backend dependency checks before Phase 5 verification:

- `cd backend && uv run pytest tests/test_auth_demo.py tests/test_persona_elder.py tests/test_persona_requestor.py tests/test_persona_companion.py tests/test_persona_locale_and_authz.py -q`
- After Phase 4 completes: include voice tests from its validation plan, especially contract tests for stream, batch, status, and upload URL.

Manual smoke with backend running and seeded DB:

- Siti quick-login chip authenticates, elder dashboard/listings/profile render from API, booking accept/decline works.
- Amir quick-login chip authenticates, home/search/detail render from API, reviews/menu/availability are present.
- Faiz quick-login chip authenticates, companion dashboard/alerts/timeline render locale-projected data.
- ElderVoice: `en-US` and `zh-CN` use WebSocket streaming and receive final `ListingDraft`; `ms-MY` and `ta-IN` use upload/batch/poll; disabling AudioWorklet or using an unsupported browser keeps SpeechRecognition fallback usable.
- Browser console has no CORS errors and no unhandled promise rejections.

No-visual-change guardrail:

- Take before/after screenshots or use manual side-by-side for login, elder dashboard/listings/voice, requestor home/search/detail, companion dashboard/alerts/profile.
- Review diff for CSS/className/copy changes. Phase 5 should not need `prototype.css` edits.

---

## Planning Recommendations

Suggested plan order:

1. Type extensions and endpoint helper gaps (`types.ts`, `voice.ts`, `getListingById`, `getCompanionTimeline`).
2. Auth wiring in `PrototypeApp.jsx` and `OnboardingFlow.jsx`, preserving demo chips and KYC visual flow.
3. Persona screen mock import removal with local adapters: elder first, requestor second, companion third.
4. ElderVoice streaming/batch wiring after Phase 4 contract is verified.
5. Verification pass: typecheck, lint, build, backend contract tests, manual no-visual-change smoke.

Planning decision required before execution:

- How to handle screen data with no backend endpoint: companion upcoming bookings, requestor saved/recent providers, companion live feed/profile care-circle data, and KYC processing. The safest frontend-only answer is to remove `mock-data` imports by deriving from existing endpoints where possible and keep purely inline demo/profile content unchanged.

---

*GSD phase research for GingerGig Phase 5 - Frontend Wiring + Type Extensions*
*Written: 2026-04-26*
