# Feature Research — GingerGig Backend v1

**Domain:** Hyperlocal gig marketplace (Malaysian elders, three-persona UI), backend-replaces-mocks milestone
**Researched:** 2026-04-25
**Confidence:** HIGH (frontend is the spec; everything below is grounded in actual files in `frontend/src/`)

## Framing

This is **not a greenfield feature design**. The frontend is shipped, runs on mock data, and the explicit constraint is *"DO NOT change any feature from the frontend, only remove constant values and load from DB."*

Therefore "features" here = **backend behaviors required so the existing UI works unchanged**. The taxonomy below is grouped by:

- **Persona surface** (which screens/flows trigger the behavior)
- **Categorization** within each surface (table stakes / differentiators / anti-features)

Every table-stakes row names the **endpoint** it's served by (from `frontend/src/services/api/endpoints/`) and the **mock-data constant** it's replacing (from `frontend/src/prototype/mock-data.js` or inline mocks in `OnboardingFlow.jsx` / `PrototypeApp.jsx`).

---

## Feature Landscape

### Table Stakes — Cross-cutting (Auth, Onboarding, App Shell)

Without these, login/sign-up break and no persona screen mounts.

| Feature | Endpoint | Mock it replaces | Complexity | Notes |
|---------|----------|------------------|------------|-------|
| Login with email + password (DEMO_ACCOUNTS keep working) | `POST /api/v1/auth/login` (`auth.ts → login`) | `DEMO_ACCOUNTS` array in `PrototypeApp.jsx` lines 72–97 | S | Returns `Session { accessToken, tokenType: "bearer", expiresIn, userId }`. Frontend stashes token via `setApiAccessToken()`. The 3 demo accounts (`siti@`, `amir@`, `faiz@`, all password `demo`) MUST be seeded with bcrypt hashes — the prototype's quick-login chips are a non-negotiable demo affordance. |
| Register a new account (role + locale) | `POST /api/v1/auth/register` (`auth.ts → register`) | Inline `apiRegister()` in `OnboardingFlow.jsx` lines 28–36 | S | Body: `RegisterPayload`. Response: `RegisterResponse { userId, accessToken, kycRequired, kycStatus }`. `kycRequired` MUST be `true` iff `role === "elder"`. Non-elders get `kycStatus: "approved"` (or `"not_started"` — frontend treats anything non-`elder` as fully onboarded). |
| Get current user profile | `GET /api/v1/auth/me` (`auth.ts → getMe`) | None — never called yet by prototype, but typed and ready | S | Returns `UserProfile { id, name, role, locale }`. Trivial JWT-decode + DB lookup; needed if we use it post-login (currently the prototype carries the persona via login response). |
| JWT bearer middleware | (transparent — every protected endpoint) | n/a | S | Decode `Authorization: Bearer <token>`, attach `user_id` + `role` to request state. `apiRequest` already injects header. |
| 4-locale-aware responses | All endpoints that return user-facing strings | i18n is currently 100% client-side via `i18n.js`; only companion alerts need server-side locale picking | S | `locale` from `users` table; resolved per request. Only impacts companion alerts and (optionally) listing titles via `titleMs/En/Zh/Ta`. |
| Sign out | (client-only, no backend call) | `setUser(null)` in `PrototypeApp.jsx` line 495 | XS | `auth.ts → logout()` just clears the in-memory token. No `/auth/logout` endpoint is needed. |

### Table Stakes — Elder Persona

Drives `ElderDashboard`, `ElderListings`, `ElderEarnings`, `ElderProfile`, `ElderVoice`.

| Feature | Endpoint | Mock it replaces | Complexity | Notes |
|---------|----------|------------------|------------|-------|
| Elder header / profile card (name, area, age, portrait) | Comes via `GET /auth/me` + extended `UserProfile` | `HERO_ELDER` (`mock-data.js` lines 22–31) — used in `elder-screens.jsx` lines 1680, 1684, 2471, 2486, 2489 and `companion-screens.jsx` lines 55, 83, 506, 1019, 1034, 1039 | S | Requires extending `UserProfile` with `avatarUrl`, `area`, `age`, `phone`, `kycStatus`, `initials`. Backend computes `initials` server-side or frontend derives from `name`. |
| List elder's own listings (active + inactive) | `GET /api/v1/elders/{elderId}/listings` (`elder.ts → getElderListings`) | `ELDER_LISTINGS` (`mock-data.js` lines 179–202) — rendered in `elder-screens.jsx` line 2092 | S | Response `Listing[]`. **Type extension required** — DTO must add `category`, `priceUnit`, `priceMax`, `rating`, `reviewCount` (renamed from `bookings`), `halal`, `titleMs/En/Zh/Ta`, `days`, `menu`. |
| Toggle listing active/inactive · edit listing | `PATCH /api/v1/listings/{listingId}` (`elder.ts → updateListing`) | None today — UI button exists but `onClick` is a no-op | S | Body: `Partial<Listing>`. 403 if not owner. |
| List elder's incoming bookings (pending + confirmed + completed) | `GET /api/v1/elders/{elderId}/bookings` (`elder.ts → getElderBookings`) | `ELDER_BOOKINGS` + `ELDER_COMPLETED` merged (`mock-data.js` lines 205–282) — used in `elder-screens.jsx` lines 1644–1647 and `companion-screens.jsx` line 200 | M | Currently the prototype splits these into two arrays; backend unifies them and the frontend filters by `status`. **Type extension required** — DTO must add `requestorInitials`, `requestorAvatarUrl` (= `portrait`), `listingTitle` (= `item`), `qty`, `itemDescription`. Note: `item` field is shown verbatim ("Rendang + Nasi Lemak") so backend should denormalise the human-readable item description on the booking row. |
| Accept / decline a pending booking | `POST /api/v1/bookings/{bookingId}/respond` (`elder.ts → respondToBooking`) | No-op buttons in `elder-screens.jsx` (Accept/Decline UI exists but doesn't fire) | S | Body `{ action: "accept" \| "decline" }` → `pending` becomes `confirmed` or `cancelled`. 403 if not owner; 409 if not in `pending`. |
| Earnings summary (monthTotal, lifetimeTotal, completedCount) | `GET /api/v1/elders/{elderId}/earnings/summary` (`elder.ts → getElderEarnings`) | Hardcoded RM680 and similar constants in `ElderEarnings` JSX | S | Aggregate over `bookings` where `status='completed'` for the elder. Calendar-month boundary in `Asia/Kuala_Lumpur` (UTC+8). |
| Reviews on elder's profile (own page + as seen by requestor) | `GET /api/v1/listings/{listingId}/reviews` *(not yet in client — needs to be added)* OR fold into provider detail response | `REVIEWS` (`mock-data.js` lines 285–307) — used in `requestor-screens.jsx` line 929 | S | Currently only used on the requestor's `ProviderDetail` screen. Easiest path: include `reviews: Review[]` on the provider-detail response; alternatively add a `reviews.ts` endpoint module. |

### Table Stakes — Requestor Persona

Drives `RequestorHome`, `RequestorSearch`, `ProviderDetail`, `RequestorBookings`, `RequestorProfile`.

| Feature | Endpoint | Mock it replaces | Complexity | Notes |
|---------|----------|------------------|------------|-------|
| Browse / search providers | `GET /api/v1/requestor/listings/search` (`requestor.ts → searchListings`) | `PROVIDERS` (`mock-data.js` lines 34–176) — used in `requestor-screens.jsx` lines 205, 316, 651, 1476 | M | Query params: `query`, `max_distance_km`, `halal_only`, `open_now`. **Type extension required** — `Listing` must include `distance` (string like "500m" or numeric km), `rating`, `reviewCount`, `halal`, `category`, `priceUnit`, `menu`, `days`, plus elder-snapshot fields (`elderName`, `elderInitials`, `elderArea`, `elderPortraitUrl`). Cache-via-Tair is a non-functional concern, not a feature gate. |
| Provider detail screen (full profile, menu, days, reviews) | `GET /api/v1/listings/{listingId}` *(not yet in client — needs adding)* OR included from search | `PROVIDERS.find(...)` lookup at `requestor-screens.jsx` line 651 | S | Either (a) add `getListingById(id)` to `requestor.ts`, or (b) reuse the search response shape with single-object endpoint. Must include `reviews` array. |
| AI-ranked matches ("3 matches found, 95% match · Specialises in halal Malay …") | Same `searchListings` response, with `matchScore`, `matchReason` populated by Qwen | `matchScore` / `matchReason` fields on each `PROVIDERS` entry — used in `requestor-screens.jsx` lines 389, 457, 480, 503, 592 | M | Backend ranks listings via Qwen using requestor's preferences + listing metadata. The fields ARE shown in the prototype, so they MUST be returned by `searchListings`. See Differentiators table for the AI implementation; the *contract* is table stakes, the *quality of the ranker* is the differentiator. |
| Create a booking | `POST /api/v1/requestor/bookings` (`requestor.ts → createBooking`) | No-op button in `ProviderDetail`'s "Book this Makcik" CTA | S | Body: `{ listingId, scheduledAt, notes? }`. Returns `Booking` in `pending` state. 404 if listing inactive, 409 if double-booked. |
| List requestor's own bookings (the "My Bookings" tab) | `GET /api/v1/requestor/bookings` (`requestor.ts → getRequestorBookings`) | "Coming soon" placeholder in `PrototypeApp.jsx` lines 11–69 — currently no mock data | XS | The screen IS rendered today as a placeholder. v1 backend can either (a) keep the placeholder and skip wiring, or (b) light it up. The endpoint is already typed; recommend wiring it since seed data already has bookings. |

### Table Stakes — Companion Persona

Drives `CompanionDashboard`, `CompanionAlerts`, `CompanionProfile`.

| Feature | Endpoint | Mock it replaces | Complexity | Notes |
|---------|----------|------------------|------------|-------|
| Companion dashboard (status, weekly earnings, active days, completed bookings) | `GET /api/v1/companions/elders/{elderId}/dashboard` (`companion.ts → getCompanionDashboard`) | `HERO_ELDER` + `ELDER_BOOKINGS` slice + hardcoded stats in `companion-screens.jsx` | S | Returns `CompanionDashboard { status, weeklyEarnings, activeDays, completedBookings }`. Backend resolves the companion→elder pairing from JWT `sub`; `elderId` is the path param to identify the watched elder. Note: prototype shows `HERO_ELDER` data (name, area, portrait) on this screen — those need to be either (a) included in the dashboard response, or (b) fetched via a separate `GET /companions/elders/{elderId}` profile call. Recommend (a) for fewer round-trips. |
| Companion timeline ("Today, 4:20 PM · Confirmed booking with Amir …") | Add to dashboard response OR new `GET /api/v1/companions/elders/{elderId}/timeline` *(not yet typed — needs adding)* | `TIMELINE` (`mock-data.js` lines 339–365) — used in `companion-screens.jsx` lines 326, 331 | M | Each event needs `time` (display string) + `text` (already-localised). Either store all 4 locales like alerts, or generate a `text` field per request based on `users.locale`. Simplest: derive timeline events server-side from booking + listing + review tables (no separate `timeline_events` table needed; derive on read). |
| Companion alerts (care + celebration) | `GET /api/v1/companions/elders/{elderId}/alerts` (`companion.ts → getCompanionAlerts`) | `COMPANION_ALERTS` (`mock-data.js` lines 310–337) — used in `companion-screens.jsx` line 257 | M | Returns `CompanionAlert[]`. Schema mismatch to resolve: the prototype's mock has `type: "success" \| "info" \| "warning"` and `text_en/ms/zh/ta`; the typed DTO has `type: "care" \| "celebration"` and a single `message`. **Decision per PROJECT.md**: backend stores all 4 locales in DB (mirrors prototype shape), picks `message` by `users.locale` at read time. Type mapping `success → celebration`, `info \| warning → care`. **Type extension required** — DTO must add `title` field. |
| Update companion alert preferences | `PUT /api/v1/companions/elders/{elderId}/alert-preferences` (`companion.ts → updateCompanionAlertPreferences`) | Local `useState` `alertPrefs` in `companion-screens.jsx` line 919 — never persisted | S | Full replacement (PUT). Body: `AlertPreferences { inactivity24h, overworkSignals, earningsMilestones, newBookings, reviews }`. Returns 204. **Note:** the prototype's local state has 6 keys (`inactivity, overwork, earnings, newBookings, reviews, appUpdates`); the typed DTO has 5 (drops `appUpdates`). Frontend will be edited to align — this is a permitted "swap mock for typed-API" change. |

### Table Stakes — eKYC Pipeline (Elder onboarding)

The full pipeline — presigned PUT → Textract → Rekognition → poll — is table stakes because the prototype already has 8 steps wired through it (`OnboardingFlow.jsx` lines 440–900).

| Feature | Endpoint | Mock it replaces | Complexity | Notes |
|---------|----------|------------------|------------|-------|
| Initiate KYC session (3 presigned S3 PUT URLs) | `POST /api/v1/kyc/session` (`kyc.ts → initiateSession`) | `apiInitiateKycSession()` in `OnboardingFlow.jsx` lines 38–41 | M | Returns `{ sessionId, frontUrl, backUrl, selfieUrl }`. URLs valid 15 min. Backend writes a `kyc_sessions` row; bucket policy forces `image/jpeg`/`image/png` and `Content-Length` ≤ 5 MB. KYC bucket has 24h auto-delete lifecycle (per `MULTI-CLOUD-ARCHITECTURE.md`). |
| Browser direct-upload to S3 | (not a backend endpoint — direct PUT to AWS S3) | n/a — `kyc.ts → uploadDocument` is a wrapper around `fetch(presignedUrl, { method: "PUT" })` | XS | Backend never sees raw bytes. PII isolation is a non-negotiable architectural property (per `MULTI-CLOUD-ARCHITECTURE.md`). |
| Trigger verification pipeline | `POST /api/v1/kyc/verify` (`kyc.ts → startVerification`) | `apiStartVerification()` in `OnboardingFlow.jsx` lines 43–46 | L | Body `{ sessionId }`. Response `{ jobId, status: "pending", estimatedSeconds }`. Backend kicks off async pipeline: Textract `AnalyzeID` on front + back IC → Rekognition `CompareFaces` against selfie → optional Liveness → write to `kyc_jobs`. Implementation can be either (a) a Lambda orchestrator that calls back via `PATCH /users/{id}/kyc-result` (per arch doc), or (b) a FastAPI background task. Recommend (b) for simplicity in v1. |
| Poll KYC status | `GET /api/v1/kyc/status/{jobId}` (`kyc.ts → pollStatus`) | `apiWaitForResult()` in `OnboardingFlow.jsx` lines 48–64 | M | Returns `KycVerificationResult { jobId, status, extractedData?, faceMatch?, failureReason? }`. Frontend polls every 2.5s, max 24 polls (60s timeout). Terminal states: `approved \| failed \| manual_review`. Mock currently always returns `approved` with hardcoded Siti data; backend must return real Textract output. |
| Retry KYC after failure | `POST /api/v1/kyc/retry` (`kyc.ts → retryKyc`) | Resets local state in `handleKycRetry` (`OnboardingFlow.jsx` lines 527–531) | S | Only allowed when status is `failed`. Invalidates previous session, returns fresh `KycUploadUrls`. |

### Differentiators — Multi-cloud + AI

These are *differentiators in the hackathon-pitch sense* (live AWS+Alibaba split, real Qwen, real Transcribe), but the prototype already shows the screens for them, so the backend MUST implement them — they're not optional. They're "differentiators" because they go beyond CRUD and they're what the architecture doc spends pages on.

| Feature | Endpoint | Value Proposition | Complexity | Notes |
|---------|----------|-------------------|------------|-------|
| Voice-to-profile **streaming** path (en-US, zh-CN) | `WebSocket wss://<backend>/api/v1/voice-to-profile/stream` | "Speak in your dialect, get a structured listing draft in 2-3s" — the headline demo for the elder persona | L | Frontend not yet wired; `ElderVoice` (`elder-screens.jsx` line 174) currently uses `window.SpeechRecognition` as fallback. Per PROJECT.md `expand: keep SR as fallback alongside the real WS path`. **Protocol:** initial JSON frame `{ language: "en-US" \| "zh-CN" }`; binary frames = 16kHz PCM chunks; server emits `{ type: "partial", text }` then `{ type: "final", listing: ListingDraft }`. Backend opens `amazon-transcribe-streaming` session via boto3, proxies chunks, then sends final transcript to Qwen. |
| Voice-to-profile **batch** path (ms-MY, ta-IN) | `POST /api/v1/voice-to-profile/batch` *(typed in `API_READY_MIGRATION.md` but not yet in `endpoints/elder.ts`)* | Covers the two languages Transcribe Streaming doesn't support — necessary for the full multilingual pitch | L | Browser presigned-PUTs audio to AWS S3 audio bucket, then calls `POST /voice-to-profile/batch { s3Key, language: "ms-MY" \| "ta-IN" }`. Backend submits Transcribe batch job, polls inline (~1.5s interval), sends transcript to Qwen, returns `ListingDraft` (same shape as streaming `final` frame). End-to-end target 8-12s. **Add to client**: `voice.ts` endpoint module with `requestUploadUrl()` + `submitBatch()`. |
| Qwen JSON extraction (transcript → structured listing) | (server-internal — called from both voice paths) | Schema: `{ name, service_offer, category, price_amount, price_unit, capacity, dietary_tags, location_hint, language }` per arch doc | M | DashScope API with `response_format={"type": "json_object"}`. Single prompt for both flows. Free-text fields preserve source language; enum fields normalise to canonical English. |
| Qwen-powered match ranking | Embedded in `GET /requestor/listings/search` response | Surfaces `matchScore` (0–100) and `matchReason` (one human sentence) in the prototype's "3 matches found" UI | M | The prototype already renders `matchScore` and `matchReason` for every provider. Naive baseline: rank by `cosine(requestor preferences, listing metadata)` + Qwen-generated reason. v1 acceptable cheat: pass top-K candidates + requestor profile to Qwen and let it sort + explain in one call. |
| Qwen earnings nudges / care alert text generation | Generated server-side, written into `companion_alerts.text_en/ms/zh/ta` | Why the alerts feel personalised ("Mum earned her first RM100 this month") rather than templated | M | Cron / scheduled job (or write-on-event) that detects milestones (first RM100, 6-active-days, etc.) and uses Qwen to draft the 4-locale strings before insert. Demo can pre-seed these from `COMPANION_ALERTS` and add a single "live" alert generator on demand. |
| Locale-aware companion alerts | `GET /companions/elders/{elderId}/alerts` returns `message` already in `users.locale` | Adult-child user might browse in `en` while their parent uses `ms` — alerts must respect *the companion's* locale, not the elder's | S | DB column shape: `text_en, text_ms, text_zh, text_ta` (mirrors `COMPANION_ALERTS` mock). Backend SELECTs `text_<locale>` based on JWT-resolved companion's `users.locale`. Same pattern for timeline events if stored. |
| Real auth with bcrypt + JWT (not opaque tokens) | All `/auth/*` endpoints | "Real auth, seeded users" per PROJECT.md Key Decisions | S | bcrypt cost factor 12, HS256 JWT with `sub=user_id`, `role`, `locale`, `exp` claims. `expiresIn` returned but no refresh — single 24h token is fine for hackathon demo. |
| Tair (Redis) read-through cache for search | Wraps `GET /requestor/listings/search` and `GET /elders/{id}/listings` | Snappy demo regardless of Postgres latency | S | Cache key = hash of query params + locale; TTL 60s; bust on `PATCH /listings/:id` or new booking. Per arch doc, this is a *cache, not a queue*. |
| Alibaba OSS for provider photos | (write-side via signed PUT or backend upload; read-side via OSS URL in `Listing.elderPortraitUrl`) | Non-PII media stays in Alibaba region, satisfies multi-cloud demo | S | Out of scope for actual upload flow in v1 — photos can be seeded from `randomuser.me` URLs (per `mock-data.js` `PORTRAITS`). Wire the OSS bucket and add a single `POST /elders/me/photo` endpoint *only if time permits*; otherwise the OSS bucket exists in IaC and the listing rows reference seeded URLs. |

### Anti-Features — Explicit DO-NOT-BUILD list

These are called out in PROJECT.md "Out of Scope". Re-stating here so the v1 scope is unambiguous.

| Anti-Feature | Why Tempting | Why It's Out | Alternative |
|--------------|--------------|--------------|-------------|
| Real-time chat between requestor and elder | Every gig marketplace has it | Not in the prototype — there is no chat screen, no WS endpoint, no message thread component | Booking `notes` field is the only requestor→elder communication channel for v1 |
| Payment / payout integration (Stripe, FPX, DuitNow) | "Earnings" tab is right there | Earnings are display-only static aggregates over completed bookings; no money actually moves | `bookings.amount` is just a denormalised number; no `payments` table, no webhooks, no PCI scope |
| Push notifications (APNs / FCM / web push) | Companion screen literally says "alerts" | Prototype renders alerts in-app only; no service worker, no notification permissions prompt | Alerts are a polled GET. Frontend fetches on dashboard mount. |
| Refresh-token flow / silent token rotation | `expiresIn` is in the DTO | Frontend uses module-level in-memory token; refresh wipes session anyway | Single 24h JWT. User logs in again next session. |
| Admin / moderation surface | "Should we ban a user?" is a real concern | No admin role exists in the prototype; no `/admin/*` endpoints typed | Skip entirely. Manual SQL if a demo-time issue arises. |
| Mobile-native app (React Native / Capacitor / iOS / Android) | UI is mobile-shaped | Web-first per PROJECT.md constraints — hackathon demo runs in a desktop browser at mobile width | Same web build, no native shell. |
| Replacing browser SpeechRecognition fallback | "We have real Transcribe now, who needs it" | Per PROJECT.md: keep `window.SpeechRecognition` in `ElderVoice` as a non-WS-capable fallback | Real WS path is added *alongside* the SR fallback, not in place of it. |
| Realtime translation of companion alerts | Cleaner DB schema with a single `message` column | Latency, cost, and the prototype already stores all 4 locales per alert | Store `text_en/ms/zh/ta` columns, pick one server-side based on companion's `users.locale` |
| New product features (any kind) | "While we're here, why not add X" | Explicit user constraint — *do not add or change any UI feature* | Anything that doesn't replace a mock with a DB read is out of scope |
| DynamoDB for KYC sessions | One JSDoc comment in `kyc.ts` mentions it | Stale — `MULTI-CLOUD-ARCHITECTURE.md` says Postgres is the system of record | Use Postgres `kyc_sessions` and `kyc_jobs` tables |
| Logout endpoint | "Should be symmetric with login" | `auth.ts → logout()` is purely client-side (`setApiAccessToken(null)`). No server-side blocklist | Skip. JWT expires naturally at 24h. |
| AWS Comprehend for entity extraction | "We have Comprehend already" | Explicitly rejected in arch doc — entity types don't map (cuisines, dietary tags, capacity) and Qwen handles all 4 languages with native JSON | Qwen-only |
| AWS S3 for provider photos | "We're using S3 anyway" | Multi-cloud split: Alibaba OSS owns non-PII media, AWS S3 owns PII (KYC) and ingest (audio) | OSS for photos; keep the regions clean |

---

## Type Extensions Required in `frontend/src/services/api/types.ts`

Per `frontend/docs/API_READY_MIGRATION.md` and inspection of mock-data fields actually rendered today. **All extensions are additive** (no breaking changes to existing fields).

### `Listing` — currently 7 fields; needs +13

```typescript
interface Listing {
  // Existing
  id: string;
  elderId: string;
  title: string;
  description: string;
  price: number;
  currency: "MYR";
  isActive: boolean;
  // ADD — rendered today by elder-screens.jsx and requestor-screens.jsx
  category: "cat_cooking" | "cat_crafts" | "cat_pet" | "cat_household" | "cat_other";
  priceUnit: "per_meal" | "per_hour" | "per_day" | "per_visit" | "per_piece" | "per_box" | "per_month";
  priceMax?: number;
  rating: number;            // 0–5, one decimal
  reviewCount: number;       // renamed from prototype's "reviews" / "bookings" count
  halal: boolean;
  titleMs?: string;
  titleEn?: string;
  titleZh?: string;
  titleTa?: string;
  days: string[];            // ["Mon","Tue",...]
  menu?: { name: string; price: string }[];
  // From AI ranking
  matchScore?: number;       // 0–100
  matchReason?: string;      // one sentence in user's locale
  // Geo
  distance?: string;         // display "500m" or "1.2km"
  // Elder snapshot (for browse cards without N+1 lookups)
  elderName?: string;
  elderInitials?: string;
  elderArea?: string;
  elderPortraitUrl?: string;
}
```

### `Booking` — currently 6 fields; needs +5

```typescript
interface Booking {
  // Existing
  id: string;
  listingId: string;
  requestorName: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: number;
  scheduledAt: string;
  // ADD
  requestorInitials: string;
  requestorAvatarUrl?: string;
  listingTitle: string;          // denormalised at booking creation
  qty?: string;                  // free-text "2 portions", "1 box"
  itemDescription?: string;      // free-text "Rendang + Nasi Lemak"
  rating?: number;               // 1-5, only on completed bookings with a review
}
```

### `UserProfile` — currently 4 fields; needs +5

```typescript
interface UserProfile {
  // Existing
  id: string;
  name: string;
  role: "elder" | "requestor" | "companion";
  locale: "ms" | "en" | "zh" | "ta";
  // ADD
  kycStatus: "not_started" | "pending" | "approved" | "failed" | "manual_review";
  avatarUrl?: string;
  area?: string;             // "Kepong, Kuala Lumpur"
  age?: number;
  phone?: string;            // E.164
  initials?: string;         // server-derived
}
```

### `CompanionAlert` — already has `title` field declared but not in `mock-data` shape

Just confirm `title` is populated by backend (the typed DTO already has it; the mock didn't).

### New types to add

- `ListingDraft` — return shape for both voice-to-profile paths. Fields per Qwen schema in `MULTI-CLOUD-ARCHITECTURE.md`.
- `Review` — for inclusion in provider detail response: `{ id, author, rating, date, text }`.
- `TimelineEvent` — for companion timeline: `{ id, time: string, text: string }`.

### New endpoint module to add: `voice.ts`

```typescript
// frontend/src/services/api/endpoints/voice.ts
export function requestBatchUploadUrl(language: "ms-MY" | "ta-IN"): Promise<{ s3Key, uploadUrl }>;
export function submitBatch(payload: { s3Key, language }): Promise<ListingDraft>;
// streaming WS handled inline in ElderVoice — no client wrapper needed
```

---

## Mock-Data → Backend-Behavior Map (Quality Gate Coverage)

Every export in `frontend/src/prototype/mock-data.js` and every inline mock in `OnboardingFlow.jsx` / `PrototypeApp.jsx` is mapped:

| Mock symbol | Defined at | Consumed at | Replaced by |
|-------------|-----------|-------------|-------------|
| `PORTRAITS` (object) | `mock-data.js` 6–19 | `requestor-screens.jsx` 1490 | Seeded `users.avatar_url` column (URLs themselves can stay as randomuser.me) |
| `HERO_ELDER` | `mock-data.js` 22–31 | `elder-screens.jsx` 1680/1684/2471/2486/2489; `companion-screens.jsx` 55/83/506/1019/1034/1039 | `GET /auth/me` (extended `UserProfile`) for elder; `GET /companions/elders/{elderId}/dashboard` for companion |
| `PROVIDERS` (6 entries) | `mock-data.js` 34–176 | `requestor-screens.jsx` 205/316/389/480/651/1476 | `GET /requestor/listings/search` and `GET /listings/{id}` (new); seeded as `users` (role=elder) + `listings` rows |
| `ELDER_LISTINGS` | `mock-data.js` 179–202 | `elder-screens.jsx` 2092 | `GET /elders/{elderId}/listings` |
| `ELDER_BOOKINGS` | `mock-data.js` 205–239 | `elder-screens.jsx` 1644–1645; `companion-screens.jsx` 200 | `GET /elders/{elderId}/bookings` filtered by `status IN ('pending','confirmed')` |
| `ELDER_COMPLETED` | `mock-data.js` 242–282 | `elder-screens.jsx` 1647 | Same `GET /elders/{elderId}/bookings`, filtered `status='completed'` |
| `REVIEWS` | `mock-data.js` 285–307 | `requestor-screens.jsx` 929 | Embedded in provider detail response (or new `GET /listings/{id}/reviews`) |
| `COMPANION_ALERTS` | `mock-data.js` 310–337 | `companion-screens.jsx` 257 | `GET /companions/elders/{elderId}/alerts` (locale picked server-side) |
| `TIMELINE` | `mock-data.js` 339–365 | `companion-screens.jsx` 326/331 | Add to dashboard response OR new `GET /companions/elders/{elderId}/timeline` |
| `DEMO_ACCOUNTS` | `PrototypeApp.jsx` 72–97 | `PrototypeApp.jsx` 119/399 (login flow) | Seed script creates 3 `users` rows with bcrypt-hashed `demo` password |
| `apiRegister` (inline mock) | `OnboardingFlow.jsx` 28–36 | `OnboardingFlow.jsx` 479 | `POST /auth/register` (`auth.ts → register`) |
| `apiInitiateKycSession` (inline mock) | `OnboardingFlow.jsx` 38–41 | `OnboardingFlow.jsx` 507 | `POST /kyc/session` (`kyc.ts → initiateSession`) |
| `apiStartVerification` (inline mock) | `OnboardingFlow.jsx` 43–46 | `OnboardingFlow.jsx` 511 | `POST /kyc/verify` (`kyc.ts → startVerification`) |
| `apiWaitForResult` (inline mock) | `OnboardingFlow.jsx` 48–64 | `OnboardingFlow.jsx` 515 | `kyc.ts → waitForVerification` (loops over `GET /kyc/status/{jobId}`) |
| Local `alertPrefs` state | `companion-screens.jsx` 919 | `companion-screens.jsx` 1303/1316 | `PUT /companions/elders/{elderId}/alert-preferences`; initial state from a `GET` (not yet typed — likely fetched as part of dashboard or profile) |
| `window.SpeechRecognition` | `elder-screens.jsx` 192 | `ElderVoice` component | **Kept as fallback**; real path is `wss://<backend>/voice-to-profile/stream`. Per PROJECT.md, do not remove the fallback. |

---

## Feature Dependencies

```
Auth (register/login/me)
   └── required by everything else (JWT bearer middleware)

Seed script (DEMO_ACCOUNTS + PROVIDERS + ELDER_LISTINGS + ELDER_BOOKINGS + REVIEWS + COMPANION_ALERTS + TIMELINE)
   └── required by login (DEMO_ACCOUNTS)
   └── required by every read endpoint (no point in CRUD against an empty DB)

Listings.search ──requires──> Listings (rows + categories + halal + days)
                  └──enhanced-by──> Qwen rank (matchScore, matchReason)

Bookings.create ──requires──> Listings (target listing must exist + be active)
                  └──requires──> Auth (requestor identity)

Bookings.respond ──requires──> Bookings.create (something to respond to)
                   └──requires──> Auth (elder ownership check)

Earnings.summary ──requires──> Bookings (with status='completed')

KYC.session/verify/status ──requires──> Auth.register (sessionId tied to user)
                            └──gates──> elder full access (kycRequired flag)

Voice-to-profile stream ──requires──> AWS Transcribe creds + WebSocket framework
                          └──requires──> Qwen for JSON extraction
                          └──produces──> Listings.create (from ListingDraft)

Voice-to-profile batch ──requires──> S3 audio bucket + Transcribe Batch creds
                         └──requires──> Qwen for JSON extraction
                         └──produces──> Listings.create

Companion.dashboard ──requires──> Companion-elder pairing in DB (seed: faiz → siti)
                      └──requires──> Bookings + Listings (for stats)

Companion.alerts ──requires──> Companion.dashboard (same pairing)
                   └──requires──> users.locale (for text_<locale> selection)
                   └──enhanced-by──> Qwen alert generation (Diff)

Companion.timeline ──requires──> Bookings + Reviews + Listings (events derived)

Tair cache ──enhances──> Listings.search, Listings.byId
              └── invalidate-on──> Listings.update, Bookings.create
```

### Critical phase-ordering implications

- **DB schema + seed must come before any read endpoint** — without seeded `DEMO_ACCOUNTS`, login fails and the rest of the app never mounts.
- **Auth before everything else** — every other endpoint requires JWT middleware.
- **KYC pipeline is the longest critical path** — has 4 endpoints + AWS S3 + Textract + Rekognition + polling. Schedule it early so polling is testable end-to-end.
- **Voice paths can be the LAST thing wired** — the prototype already has a working SR fallback so the demo doesn't break if WS isn't ready.
- **Type extensions in `types.ts` must land BEFORE the screen-by-screen mock swap** — otherwise TypeScript breaks every component that reads `provider.matchScore`, etc.

---

## v1 Scope Definition

### Launch with (v1)

All "Table Stakes" rows + all "Differentiators" rows above.

**Endpoints (the complete set, organised by client module):**

- `auth.ts`: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `kyc.ts`: `POST /kyc/session`, `POST /kyc/verify`, `GET /kyc/status/:jobId`, `POST /kyc/retry`
- `elder.ts`: `GET /elders/:id/listings`, `PATCH /listings/:id`, `GET /elders/:id/bookings`, `POST /bookings/:id/respond`, `GET /elders/:id/earnings/summary`
- `requestor.ts`: `GET /requestor/listings/search`, `GET /listings/:id` (NEW), `POST /requestor/bookings`, `GET /requestor/bookings`
- `companion.ts`: `GET /companions/elders/:elderId/dashboard`, `GET /companions/elders/:elderId/alerts`, `GET /companions/elders/:elderId/timeline` (NEW), `PUT /companions/elders/:elderId/alert-preferences`
- `voice.ts` (NEW): `POST /voice-to-profile/batch`, `GET /voice-to-profile/upload-url` (NEW)
- WebSocket: `wss://.../api/v1/voice-to-profile/stream`

### Defer (v1.x or v2)

- Refresh-token flow (currently `expiresIn` is unused)
- OSS upload UI for elder photos (rely on seeded URLs)
- Live alert generation cron (seed alerts; one-shot generator endpoint optional)
- `GET /listings/:id/reviews` as separate endpoint (embed in detail response instead)
- Admin endpoints, chat, payments — see Anti-Features

### Future (v2+)

Anything in the Anti-Features table.

---

## Prioritization Matrix

| Feature group | User Value | Implementation Cost | Priority |
|---------------|------------|---------------------|----------|
| Auth + DB schema + seed | HIGH | LOW | **P0** (blocking) |
| Type extensions in `types.ts` | HIGH | LOW | **P0** (blocking) |
| Elder CRUD (listings, bookings, earnings) | HIGH | LOW | **P1** |
| Requestor CRUD (search, book) | HIGH | MEDIUM | **P1** |
| Companion read APIs | HIGH | LOW | **P1** |
| Companion alert preferences write | MEDIUM | LOW | **P1** |
| eKYC pipeline (presigned + Textract + Rekognition + poll) | HIGH | HIGH | **P1** (constraint: hackathon judging) |
| Voice-to-profile streaming WS | HIGH | HIGH | **P1** (headline demo) |
| Voice-to-profile batch | MEDIUM | MEDIUM | **P1** (multilingual pitch) |
| Qwen JSON extraction | HIGH | MEDIUM | **P1** (powers both voice paths) |
| Qwen match ranking | MEDIUM | MEDIUM | **P2** (graceful degrade: hardcoded matchScore) |
| Tair caching | LOW | LOW | **P2** (nice-to-have for snappiness) |
| OSS photo upload UI | LOW | MEDIUM | **P3** (defer; use seeded URLs) |
| Live alert generation | LOW | MEDIUM | **P3** (seed is fine for demo) |

**Priority key:** P0 = blocking everything else; P1 = must ship for v1; P2 = ship if time permits; P3 = defer.

---

## Sources

- `/Users/user/repos/GingerGig/.planning/PROJECT.md` — milestone scope, validated/active/out-of-scope requirements, constraints, key decisions
- `/Users/user/repos/GingerGig/MULTI-CLOUD-ARCHITECTURE.md` — multi-cloud split, voice paths, Qwen schema
- `/Users/user/repos/GingerGig/frontend/docs/API_READY_MIGRATION.md` — definitive endpoint contracts + type-gap list
- `/Users/user/repos/GingerGig/frontend/src/prototype/mock-data.js` — every mock symbol that needs replacing
- `/Users/user/repos/GingerGig/frontend/src/services/api/types.ts` — current DTO shapes
- `/Users/user/repos/GingerGig/frontend/src/services/api/endpoints/{auth,elder,requestor,companion,kyc}.ts` — typed client (already wired, awaiting backend)
- `/Users/user/repos/GingerGig/frontend/src/prototype/PrototypeApp.jsx` — DEMO_ACCOUNTS, login flow, app shell
- `/Users/user/repos/GingerGig/frontend/src/prototype/OnboardingFlow.jsx` — registration + KYC stepper, inline mock helpers
- `/Users/user/repos/GingerGig/frontend/src/prototype/{elder,requestor,companion}-screens.jsx` — actual mock-data consumption sites
- `/Users/user/repos/GingerGig/.planning/codebase/INTEGRATIONS.md` — current integration audit (AWS + Alibaba services, env config, PII isolation policy)

---
*Feature research for: GingerGig backend v1 (replace-mocks-with-DB milestone)*
*Researched: 2026-04-25*
