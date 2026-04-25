# Requirements: GingerGig backend v1

**Defined:** 2026-04-25
**Core Value:** The frontend continues to work exactly as today — every screen, every persona, every i18n string — but every piece of data loads from the database via the existing typed API client. No feature is added, removed, or visually changed.

## v1 Requirements

Backend behaviors required so the existing frontend prototype works unchanged. Each requirement maps to a roadmap phase. Categories follow the frontend's `endpoints/*.ts` modules plus cross-cutting infrastructure.

### Foundation

- [x] **FOUND-01**: FastAPI app scaffolded with `uv` (Python ≥3.12), runs at `http://localhost:8000`, exposes `GET /health` returning `200 {"status":"ok"}`
- [x] **FOUND-02**: `pyproject.toml` declares the locked stack: `fastapi`, `uvicorn[standard]`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `pydantic`, `pydantic-settings`, `boto3`, `amazon-transcribe>=0.6.4`, `alibabacloud-oss-v2>=1.2.5`, `openai>=2.32.0`, `redis>=7.4.0`, `pyjwt[crypto]`, `bcrypt>=4.2.0,<5.0.0`
- [x] **FOUND-03**: All routers mounted under `/api/v1/*` matching the frontend's `apiRequest` prefix; CORS configured to accept the frontend origin (no `*` allowlist)
- [x] **FOUND-04**: Module layout mirrors frontend: `routers/{auth,elder,requestor,companion,kyc,voice}.py`, `services/`, `models/`, `schemas/`, `integrations/`, `core/`, `deps/`, `db.py`, `main.py`
- [x] **FOUND-05**: Pydantic-settings reads typed config from environment (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `AWS_*`, `DASHSCOPE_API_KEY`, `OSS_*`, region pins); `.env.example` lists every required variable
- [x] **FOUND-06**: Global exception handler returns `{status, message, detail?}` JSON matching the frontend's `ApiError` shape; `debug=False` in production; tracebacks logged but not surfaced
- [x] **FOUND-07**: Per-request `AsyncSession` via `Depends(get_db)`; engine + Redis pool + boto3 clients are process-singletons built in FastAPI `lifespan`

### Database & Seed

- [ ] **DATA-01**: Postgres schema migrated via Alembic (no `Base.metadata.create_all`); covers `users`, `companion_links`, `listings`, `listing_menu_items`, `bookings`, `reviews`, `companion_alerts`, `companion_alert_preferences`, `timeline_events`, `kyc_sessions`, `voice_sessions`
- [x] **DATA-02**: `users` schema includes `id`, `email`, `phone`, `password_hash`, `name`, `role` (`elder`/`requestor`/`companion`), `locale` (`ms`/`en`/`zh`/`ta`), `kyc_status`, `area`, `age`, `avatar_url`, `created_at`
- [x] **DATA-03**: `listings` schema preserves every field the prototype renders: `category`, `price`, `price_max`, `price_unit`, `rating`, `review_count`, `halal`, `is_active`, `title_ms/en/zh/ta`, `description`, `days[]`, plus 1:N `listing_menu_items` with `name`/`price`
- [x] **DATA-04**: `bookings` schema denormalises requestor + listing snapshot fields (`requestor_name`, `requestor_initials`, `requestor_avatar_url`, `listing_title`, `quantity_label`, `item_description`, `amount`, `scheduled_at`, `status`); booking row survives requestor/listing edits unchanged
- [x] **DATA-05**: `companion_alerts` and `timeline_events` store all four locales as `text_ms/en/zh/ta` columns; backend projects only the requested locale at read time
- [x] **DATA-06**: Seed script (`scripts/seed.py`) idempotently loads every existing prototype constant — `HERO_ELDER`, `PROVIDERS` (6), `ELDER_LISTINGS`, `ELDER_BOOKINGS`, `ELDER_COMPLETED`, `REVIEWS`, `COMPANION_ALERTS`, `TIMELINE`, `PORTRAITS` — using `ON CONFLICT (id) DO UPDATE` so re-runs don't duplicate
- [x] **DATA-07**: The 3 `DEMO_ACCOUNTS` from `PrototypeApp.jsx` (siti / amir / faiz, all password `demo`) are seeded with bcrypt password hashes so the prototype's quick-login chips work end-to-end against the real backend

### Authentication

- [ ] **AUTH-01**: `POST /api/v1/auth/register` accepts `RegisterPayload {name, email, phone, password, role, locale}` and returns `RegisterResponse {userId, accessToken, tokenType, expiresIn, kycRequired, kycStatus}`; `kycRequired` is `true` iff `role === "elder"`
- [ ] **AUTH-02**: `POST /api/v1/auth/login` accepts `{email, password}` and returns `Session {accessToken, tokenType, expiresIn, userId}` on success, `401 {status, message: "Invalid credentials"}` on failure
- [ ] **AUTH-03**: `GET /api/v1/auth/me` returns `UserProfile` (extended with `kycStatus`, `avatarUrl`, `area`, `age`, `phone`, `initials`) for the bearer-authenticated user
- [ ] **AUTH-04**: Passwords hashed with `bcrypt>=4.2,<5.0` (no `passlib`); `bcrypt.hashpw`/`checkpw` wrapped in `await asyncio.to_thread(...)` to keep the event loop responsive
- [ ] **AUTH-05**: JWT issuance and verification centralised in `core/security.py`; `jwt.decode` is called with explicit `algorithms=["HS256"]` and `options={"require": ["exp", "sub"]}`; no router calls `jwt.decode` directly
- [ ] **AUTH-06**: Bearer-token middleware exposes `get_current_user` and `get_current_user_ws` (the latter pulls token from query string for WebSocket handshake); both return 401 on missing/invalid token
- [ ] **AUTH-07**: JWT secret loaded from `JWT_SECRET` env var, ≥32 random bytes; failure to start if unset in non-debug environments

### Elder Endpoints

- [ ] **ELDER-01**: `GET /api/v1/elders/{elderId}/listings` returns this elder's listings (active + inactive); response is `Listing[]` with the type-extended fields (category, priceUnit, rating, halal, days, menu, multi-locale titles)
- [ ] **ELDER-02**: `PATCH /api/v1/listings/{listingId}` accepts `Partial<Listing>`, returns updated `Listing`; 403 if requester isn't the listing owner
- [ ] **ELDER-03**: `GET /api/v1/elders/{elderId}/bookings` returns this elder's bookings (pending + confirmed + completed unified); response includes denormalised `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`
- [ ] **ELDER-04**: `POST /api/v1/bookings/{bookingId}/respond` accepts `{action: "accept" | "decline"}`; transitions booking from `pending` → `confirmed` or `cancelled`; 403 if not owner, 409 if not in `pending`
- [ ] **ELDER-05**: `GET /api/v1/elders/{elderId}/earnings/summary` returns `{monthTotal, lifetimeTotal, completedCount}` aggregated over the elder's `completed` bookings; calendar-month boundary in `Asia/Kuala_Lumpur`

### Requestor Endpoints

- [ ] **REQ-01**: `GET /api/v1/requestor/listings/search` accepts query params `query`, `max_distance_km`, `halal_only`, `open_now`; returns `Listing[]` with all extended fields plus elder-snapshot fields (`elderName`, `elderInitials`, `elderArea`, `elderPortraitUrl`, `distance`)
- [ ] **REQ-02**: `GET /api/v1/listings/{listingId}` returns a single listing with embedded `reviews: Review[]` and full menu (added to typed client during frontend wiring phase)
- [ ] **REQ-03**: Search results include Qwen-generated `matchScore` (0–100) and `matchReason` (locale-aware free-text); ranking falls back to a deterministic heuristic (distance + rating) if Qwen is unavailable
- [ ] **REQ-04**: `POST /api/v1/requestor/bookings` accepts `{listingId, scheduledAt, notes?}`; returns the new `Booking` in `pending` state; 404 if listing inactive
- [ ] **REQ-05**: `GET /api/v1/requestor/bookings` returns this requestor's bookings (any status), denormalised the same way as elder bookings

### Companion Endpoints

- [ ] **COMP-01**: `GET /api/v1/companions/elders/{elderId}/dashboard` returns `CompanionDashboard {status, weeklyEarnings, activeDays, completedBookings}` plus the watched elder's profile snapshot (name, initials, area, portrait); companion → elder pairing resolved via `companion_links` table from JWT `sub`
- [ ] **COMP-02**: `GET /api/v1/companions/elders/{elderId}/alerts` returns `CompanionAlert[]` with the field shape `{id, type: "care" | "celebration", title, message, createdAt}`; `message` is server-picked from the stored 4-locale columns based on the requesting companion's `users.locale`; mapping `success → celebration`, `info | warning → care`
- [ ] **COMP-03**: `GET /api/v1/companions/elders/{elderId}/timeline` returns recent activity events (booking confirmed, listing posted, review received) with display-ready `time` strings and `text` projected to the companion's locale
- [ ] **COMP-04**: `PUT /api/v1/companions/elders/{elderId}/alert-preferences` accepts `AlertPreferences {inactivity24h, overworkSignals, earningsMilestones, newBookings, reviews}` and returns `204 No Content`; persisted in `companion_alert_preferences`

### eKYC Pipeline

- [ ] **KYC-01**: `POST /api/v1/kyc/session` returns `{sessionId, frontUrl, backUrl, selfieUrl}` — three S3 presigned PUT URLs valid for 15 minutes; bucket policy forces `Content-Type: image/jpeg|image/png` and `Content-Length ≤ 5MB`
- [ ] **KYC-02**: KYC S3 bucket has a 24-hour lifecycle auto-delete on uploaded objects; backend never reads raw IC/selfie image bytes
- [ ] **KYC-03**: `POST /api/v1/kyc/verify` accepts `{sessionId}` and returns `{jobId, status: "pending", estimatedSeconds}`; spawns an async background task (FastAPI `asyncio.create_task`) running the verification pipeline
- [ ] **KYC-04**: Verification pipeline uses Textract `AnalyzeDocument` (FORMS+TABLES) + a regex parser for the Malaysian IC number pattern (`YYMMDD-PB-####`) — NOT `AnalyzeID` (which only supports US driver's licenses + US passports)
- [ ] **KYC-05**: Verification pipeline uses Rekognition `CompareFaces` between IC front and selfie; optional `Face Liveness` check on selfie; results written to `kyc_sessions`
- [ ] **KYC-06**: `GET /api/v1/kyc/status/{jobId}` returns `KycVerificationResult {jobId, status, extractedData?, faceMatch?, failureReason?}`; supports the frontend's 2.5s polling interval up to 60s timeout
- [ ] **KYC-07**: KYC decision logic: similarity ≥80 AND Textract confidence ≥85 → `approved`; similarity ≥70 OR Textract confidence ≥70 → `manual_review`; otherwise → `failed` with structured `failureReason`
- [ ] **KYC-08**: `POST /api/v1/kyc/retry` invalidates the previous session and returns a fresh `{sessionId, frontUrl, backUrl, selfieUrl}` (same shape as `/kyc/session`); allowed only when current status is `failed`

### Voice-to-Profile Pipeline

- [ ] **VOICE-01**: WebSocket `wss://<backend>/api/v1/voice-to-profile/stream` accepts a handshake frame `{language: "en-US" | "zh-CN"}`, then 16kHz PCM audio binary frames; emits `{type: "partial", text}` during speech and `{type: "final", listing: ListingDraft}` on user pause; target end-to-end latency 2-3s
- [ ] **VOICE-02**: Streaming pipeline uses the `amazon-transcribe>=0.6.4` Python SDK (NOT `boto3`, which has no streaming support); two `asyncio.create_task`s with an `asyncio.Queue` bridge browser ⇄ Transcribe ⇄ FastAPI
- [ ] **VOICE-03**: WebSocket handler MUST close the upstream Transcribe stream in a `try/finally` block (calling `input_stream.end_stream()` and cancelling the partial-transcript reader) on browser disconnect; a 90-second max-session timer kills hung handlers
- [ ] **VOICE-04**: `POST /api/v1/voice-to-profile/batch` accepts `{s3Key, language: "ms-MY" | "ta-IN"}` and returns `{jobId, status: "pending", estimatedSeconds}` (async-job pattern — does NOT inline-poll, since 8-12s exceeds typical LB idle timeouts); frontend polls a status endpoint
- [ ] **VOICE-05**: Batch pipeline uses `boto3` Transcribe Batch reading from the audio S3 bucket; on completion, transcript is sent to Qwen for JSON extraction
- [ ] **VOICE-06**: Both streaming and batch paths share `services/qwen_service.py::extract_listing(transcript, language)` which calls DashScope (Qwen) via the OpenAI-compatible endpoint with `response_format={"type": "json_object"}` against the schema in `MULTI-CLOUD-ARCHITECTURE.md` (`{name, service_offer, category, price_amount, price_unit, capacity, dietary_tags, location_hint, language}`)
- [ ] **VOICE-07**: Qwen output is Pydantic-validated; on `ValidationError` the prompt is retried once with the validation error appended; markdown fences are stripped before parse; persistent failure returns `502 {message: "Listing extraction failed"}`

### Cache & Performance (Tair / Redis)

- [ ] **CACHE-01**: Listing search results are read-through cached in Tair under `listings:search:{sha1(query+filters+locale)}` with 60s TTL
- [ ] **CACHE-02**: Single listing reads cached under `listings:elder:{id}` (120s TTL); cache invalidated on `PATCH /listings/{id}`
- [ ] **CACHE-03**: Earnings summary cached under `earnings:elder:{id}` (60s TTL); invalidated on booking status transition to `completed`
- [ ] **CACHE-04**: KYC status reads cached under `kyc:status:{jobId}` (10s TTL while pending, 300s after terminal state) to absorb the frontend's 2.5s polling cadence
- [ ] **CACHE-05**: Tair is used as a read-through cache only — NOT as a job queue (per `MULTI-CLOUD-ARCHITECTURE.md`); async work uses `asyncio.create_task`

### Frontend Wiring

The frontend is preserved as-is except for the additive changes below. No UI feature, layout, copy, or styling is altered.

- [ ] **FE-01**: `frontend/src/services/api/types.ts` extended additively: `Listing` gains `category`, `priceUnit`, `priceMax`, `rating`, `reviewCount`, `halal`, `titleMs/En/Zh/Ta`, `days`, `menu`, `matchScore`, `matchReason`, `distance`, plus elder-snapshot fields (`elderName`, `elderInitials`, `elderArea`, `elderPortraitUrl`); `Booking` gains `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`; `UserProfile` gains `kycStatus`, `avatarUrl`, `area`, `age`, `phone`, `initials`; `CompanionAlert` gains `title`; new types `ListingDraft`, `Review`, `TimelineEvent`
- [ ] **FE-02**: New endpoint module `frontend/src/services/api/endpoints/voice.ts` with `submitBatchJob(s3Key, language)` and `getBatchStatus(jobId)` plus the WebSocket connection helper used by `ElderVoice`
- [ ] **FE-03**: New endpoints `getListingById(id)` and `getCompanionTimeline(elderId)` added to existing modules
- [ ] **FE-04**: Inline mock helpers in `OnboardingFlow.jsx` (`apiRegister`, `apiInitiateKycSession`, `apiStartVerification`, `apiWaitForResult`) replaced 1:1 with imports from `src/services/api/endpoints/{auth,kyc}`; the 8-step KYC stepper UI is unchanged
- [ ] **FE-05**: Every screen file (`elder-screens.jsx`, `requestor-screens.jsx`, `companion-screens.jsx`) replaces direct imports of `mock-data.js` constants with `useEffect`-driven calls to the typed API client; loading/error states match the prototype's existing inline patterns (no new libraries)
- [ ] **FE-06**: `DEMO_ACCOUNTS` in `PrototypeApp.jsx` keeps its visual chips for quick-login UX, but the click handler calls `auth.ts → login` against the real backend instead of running an in-memory match
- [ ] **FE-07**: `ElderVoice` component wires the WebSocket via `voice.ts` for `en-US`/`zh-CN`; `ms-MY`/`ta-IN` use the batch path with browser-direct S3 PUT; the existing `window.SpeechRecognition` code is retained as a graceful fallback for browsers without `AudioWorklet`
- [ ] **FE-08**: `frontend/.env.local` updated to point `VITE_API_BASE_URL` at the local FastAPI backend during dev, the deployed Alibaba ECS endpoint in production
- [ ] **FE-09**: Type extensions are strictly additive — no field is renamed or removed in `types.ts`; existing `apiRequest`, `setApiAccessToken`, `ApiError` shape, and `/api/v1` prefix are unchanged

### Multi-Cloud Deployment

Live deploy is a hackathon judging requirement (per Key Decision in PROJECT.md).

- [ ] **DEPLOY-01**: Frontend hosted on AWS S3 + CloudFront in `ap-southeast-1` (Singapore) with KL/Cyberjaya edge POP
- [ ] **DEPLOY-02**: Backend Docker image deployed to Alibaba Cloud ECS in `ap-southeast-3` (Kuala Lumpur); container runs `uvicorn` with WebSocket support; load balancer idle timeout ≥300s on the WS path
- [ ] **DEPLOY-03**: ApsaraDB PostgreSQL instance provisioned in `ap-southeast-3`; connection URL injected via env var
- [ ] **DEPLOY-04**: Tair (Redis-compatible) instance provisioned in `ap-southeast-3`
- [ ] **DEPLOY-05**: Alibaba OSS bucket provisioned for provider photos (non-PII); served public-read with CDN-friendly URLs
- [ ] **DEPLOY-06**: AWS S3 buckets provisioned in `ap-southeast-1`: one for KYC images (24h lifecycle auto-delete), one for batch ASR audio; both with CORS allowing the CloudFront origin for `PUT` and the deployed backend origin for `GET`
- [ ] **DEPLOY-07**: AWS IAM role(s) for Textract `AnalyzeDocument`, Rekognition `CompareFaces`, Transcribe Streaming + Batch, S3 read/write/presign — least-privilege scoped to the specific buckets and operations
- [ ] **DEPLOY-08**: DashScope/Qwen account active; `DASHSCOPE_API_KEY` provisioned; rate limits monitored
- [ ] **DEPLOY-09**: AWS budget alert configured at $50/$100 thresholds (Transcribe Streaming + Rekognition can rack up costs fast on a brittle WebSocket loop)
- [ ] **DEPLOY-10**: Smoke test from the deployed CloudFront URL: login as siti/amir/faiz → browse → book → voice-to-profile (en-US) → KYC happy path

## v2 Requirements

Deferred to a future release. Tracked but not in v1 roadmap.

### Notifications & Real-Time

- **NOTIF-01**: Push notifications (APNs/FCM) for companion alerts
- **NOTIF-02**: Email notifications for new bookings + reviews
- **NOTIF-03**: WebSocket push for live booking status changes (currently relies on screen refresh)

### Auth Hardening

- **AUTH-08**: Refresh-token flow (`expiresIn` is in the DTO but not consumed)
- **AUTH-09**: Persisted session via httpOnly cookie or localStorage (currently in-memory only)
- **AUTH-10**: Login rate-limiting per IP / per email
- **AUTH-11**: 2FA / OTP for elder accounts post-KYC

### Payments & Earnings

- **PAY-01**: Real payment processing (FPX, e-wallets, card)
- **PAY-02**: Payout scheduling and integration with Malaysian bank transfer
- **PAY-03**: i-Saraan retirement matching integration (referenced in companion alert mock data)

### Social & Moderation

- **SOC-01**: Real-time chat between requestor and elder
- **SOC-02**: Report content / block user
- **SOC-03**: Admin review surface for reported listings/bookings

### Platform Reach

- **PLAT-01**: Native iOS app
- **PLAT-02**: Native Android app
- **PLAT-03**: i18n beyond `ms`/`en`/`zh`/`ta` (e.g. Punjabi, Iban)

## Out of Scope

Explicitly excluded from v1 to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time chat between requestor and elder | Not in prototype; high complexity; not needed for hackathon demo |
| Payment processing / payouts | Earnings figures are seeded; no Stripe/FPX integration |
| Push notifications (APNs/FCM) | Companion alerts are in-app only in the prototype |
| Refresh-token flow | In-memory token works for the demo; defer to v2 |
| Mobile-native shells | Web-first; the prototype's mobile-shaped UI is enough |
| Admin / moderation surface | No admin role exists in the prototype |
| AWS Comprehend | Explicitly rejected per `MULTI-CLOUD-ARCHITECTURE.md` — Qwen handles entity extraction across all 4 languages |
| AWS S3 for provider photos | OSS owns non-PII media (architecture decision); S3 is reserved for audio + KYC PII |
| DynamoDB | The lone JSDoc reference in `kyc.ts` is stale; Postgres is system-of-record |
| Replacing the `SpeechRecognition` fallback in `ElderVoice` | Keep as graceful degradation for browsers without `AudioWorklet` |
| Server-side translation of companion alerts | Backend stores all 4 locales explicitly; no realtime translation service |
| New product features / UI changes | Explicit user constraint: do not add or change any frontend feature |
| Live alert generation (cron-based) | Alerts are seeded for v1 demo; cron triggers deferred to v2 |
| Separate logout endpoint | Frontend `auth.ts → logout()` clears the in-memory token; no backend call needed |
| KYC orchestrator as Lambda | `MULTI-CLOUD-ARCHITECTURE.md` mentions Lambda; v1 uses a FastAPI background task for simplicity (documented in PROJECT.md Key Decisions) |

## Traceability

Each v1 requirement maps to exactly one phase in `ROADMAP.md`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Pending |
| DATA-07 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| ELDER-01 | Phase 3 | Pending |
| ELDER-02 | Phase 3 | Pending |
| ELDER-03 | Phase 3 | Pending |
| ELDER-04 | Phase 3 | Pending |
| ELDER-05 | Phase 3 | Pending |
| REQ-01 | Phase 3 | Pending |
| REQ-02 | Phase 3 | Pending |
| REQ-03 | Phase 3 | Pending |
| REQ-04 | Phase 3 | Pending |
| REQ-05 | Phase 3 | Pending |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 3 | Pending |
| COMP-04 | Phase 3 | Pending |
| KYC-01 | Phase 4 | Pending |
| KYC-02 | Phase 4 | Pending |
| KYC-03 | Phase 4 | Pending |
| KYC-04 | Phase 4 | Pending |
| KYC-05 | Phase 4 | Pending |
| KYC-06 | Phase 4 | Pending |
| KYC-07 | Phase 4 | Pending |
| KYC-08 | Phase 4 | Pending |
| VOICE-01 | Phase 5 | Pending |
| VOICE-02 | Phase 5 | Pending |
| VOICE-03 | Phase 5 | Pending |
| VOICE-04 | Phase 5 | Pending |
| VOICE-05 | Phase 5 | Pending |
| VOICE-06 | Phase 5 | Pending |
| VOICE-07 | Phase 5 | Pending |
| CACHE-01 | Phase 6 | Pending |
| CACHE-02 | Phase 6 | Pending |
| CACHE-03 | Phase 6 | Pending |
| CACHE-04 | Phase 6 | Pending |
| CACHE-05 | Phase 6 | Pending |
| FE-01 | Phase 7 | Pending |
| FE-02 | Phase 7 | Pending |
| FE-03 | Phase 7 | Pending |
| FE-04 | Phase 7 | Pending |
| FE-05 | Phase 7 | Pending |
| FE-06 | Phase 7 | Pending |
| FE-07 | Phase 7 | Pending |
| FE-08 | Phase 7 | Pending |
| FE-09 | Phase 7 | Pending |
| DEPLOY-01 | Phase 8 | Pending |
| DEPLOY-02 | Phase 8 | Pending |
| DEPLOY-03 | Phase 8 | Pending |
| DEPLOY-04 | Phase 8 | Pending |
| DEPLOY-05 | Phase 8 | Pending |
| DEPLOY-06 | Phase 8 | Pending |
| DEPLOY-07 | Phase 8 | Pending |
| DEPLOY-08 | Phase 8 | Pending |
| DEPLOY-09 | Phase 8 | Pending |
| DEPLOY-10 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 73 total
- Mapped to phases: 73
- Unmapped: 0

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after roadmap creation (traceability filled)*
