# Roadmap: GingerGig backend v1

**Defined:** 2026-04-25
**Granularity:** Standard (5-8 phases)
**Coverage:** 59/59 active v1 requirements mapped
**Core Value:** The frontend continues to work exactly as today — every screen, every persona, every i18n string — but every piece of "data" loads from the database via the existing typed API client. No feature is added, removed, or visually changed.

## Phases

- [x] **Phase 1: Backend Scaffold + Schema + Seed** - FastAPI app boots, Postgres schema migrated via Alembic, prototype constants + demo accounts seeded; the contract for five parallel router tracks is locked.
- [x] **Phase 2: Auth + Bearer Middleware** - Demo JWT auth shim; the prototype's 3 quick-login chips authenticate against the real backend and return working bearer tokens.
- [x] **Phase 3: Persona Routers (Elder + Requestor + Companion)** - All non-AI CRUD endpoints serve the three persona shells from real DB reads with locale-aware projections and denormalised booking snapshots.
- [x] **Phase 4: Voice-to-Profile Pipeline** - WebSocket streaming (en-US/zh-CN) and batch (ms-MY/ta-IN) both deliver a Pydantic-validated `ListingDraft` from the elder's voice, with disciplined session cleanup.
- [ ] **Phase 5: Frontend Wiring + Type Extensions** - Every prototype mock helper is replaced with a typed-API import; types extended additively; no UI/feature change.
- [ ] **Phase 6: Multi-Cloud Live Deployment** - Frontend on AWS S3+CloudFront (`ap-southeast-1`), backend on Alibaba ECS (`ap-southeast-3`), full smoke test from the public CloudFront URL.

## Phase Details

### Phase 1: Backend Scaffold + Schema + Seed
**Goal**: A runnable FastAPI app at `localhost:8000` with the full Postgres schema migrated and the prototype's mock data + demo accounts seeded — the contract that unblocks every parallel router track downstream.
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07
**Success Criteria** (what must be TRUE):
  1. `uv run uvicorn app.main:app` boots the backend and `GET http://localhost:8000/health` returns `200 {"status":"ok"}` with CORS configured for the frontend origin (no `*`).
  2. `alembic upgrade head` against a fresh Postgres creates every table (`users`, `companion_links`, `listings`, `listing_menu_items`, `bookings`, `reviews`, `companion_alerts`, `companion_alert_preferences`, `timeline_events`, `kyc_sessions`, `voice_sessions`) — no `Base.metadata.create_all` anywhere.
  3. `python scripts/seed.py` is idempotent: running it twice in a row leaves the same DB state with no unique-constraint errors and the 3 `DEMO_ACCOUNTS` (siti/amir/faiz) plus the 6 `PROVIDERS` + `HERO_ELDER` + listings/bookings/reviews/alerts/timeline are all present.
  4. A deliberately-thrown error from any route returns the frontend's `ApiError` envelope (`{status, message, detail?}`) — `debug=False`, no Python traceback in the response body.
  5. `pyproject.toml` pins all the non-obvious deps (`amazon-transcribe>=0.6.4`, `bcrypt>=4.2.0,<5.0.0`, `pyjwt[crypto]`, `alibabacloud-oss-v2`) so downstream phases have a locked `uv.lock` to build on.
**Plans**: 7 plans
- [x] 01-01-PLAN.md — Project skeleton: pyproject.toml + app.core (config/enums/ids/errors/security) + app.db.session + app.deps.db + Makefile + Dockerfile + .env.example (Wave 1)
- [x] 01-02-PLAN.md — FastAPI main.py with lifespan, CORS allowlist, exception handlers, /health, six router stubs under /api/v1 (Wave 2)
- [x] 01-03-PLAN.md — SQLAlchemy 2 models for all 11 tables with CHECK constraints, FKs, indexes, TimestampMixin, denormalisation, 4-locale columns (Wave 2)
- [x] 01-04-PLAN.md — Alembic init + 0001_initial_schema.py + [BLOCKING] migration apply against gingergig_test (Wave 3)
- [x] 01-05-PLAN.md — scripts/seed_data.py (hand-ported mocks) + scripts/seed.py (idempotent + SeedRefusedError + bcrypt rounds=12) + [BLOCKING] two-run idempotency test (Wave 3)
- [x] 01-06-PLAN.md — Wave 0 conftest + 4 pinned tests (D-17) + 5 recommended tests (dep_pins, no_forbidden_imports, cors_no_wildcard, no_create_all, seed_refused_without_env) (Wave 4)
- [x] 01-07-PLAN.md — ApsaraDB Postgres provisioning runbook + smoke test (autonomous: false, gates Wave 3) (Wave 4)

### Phase 2: Auth + Bearer Middleware
**Goal**: Demo authentication wired end-to-end so the prototype's 3 quick-login chips authenticate against the backend and return a JWT that the frontend's existing `Authorization: Bearer` injection accepts on protected calls.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. The quick-login chip on the prototype login screen for "Siti" (`siti@gingergig.my` / `demo`) authenticates against `POST /api/v1/auth/login` and returns a working JWT — same for Amir and Faiz/Companion.
  2. `POST /api/v1/auth/register` issues a JWT and returns `kycRequired: true` iff the chosen role is `elder`; `GET /api/v1/auth/me` returns the extended `UserProfile` (with `kycStatus`, `avatarUrl`, `area`, `age`, `phone`, `initials`) for the bearer-authenticated user.
  3. JWT decoding lives in exactly one place (`core/security.py`) with explicit `algorithms=["HS256"]` and required `exp`+`sub` claims; a unit test sending `{"alg":"none"}` is rejected.
  4. Phase 2 runtime auth files contain no `bcrypt.checkpw`/`hashpw` calls; production password verification remains deferred per `02-CONTEXT.md`, and `passlib` is not in the dependency tree.
  5. Boot-time validation: starting in non-debug mode with `JWT_SECRET` unset (or shorter than 32 bytes) refuses to start.
**Plans**: 1 plan
- [x] 02-01-PLAN.md — Demo auth shim and bearer dependencies: central JWT helpers, auth DTOs, bearer dependencies, login/register/me routes, focused tests (Wave 1)

### Phase 3: Persona Routers (Elder + Requestor + Companion)
**Goal**: Every non-AI screen in the elder, requestor, and companion shells loads from real DB reads with locale-aware projection and denormalised booking snapshots — the prototype runs entirely on Postgres data with KYC/voice routes still stubbed.
**Depends on**: Phase 2
**Requirements**: ELDER-01, ELDER-02, ELDER-03, ELDER-04, ELDER-05, REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. Logged in as Siti (elder), the elder dashboard shows her seeded listings with `category`, `priceUnit`, `rating`, `halal`, `days`, `menu`, multi-locale titles, and pending bookings render denormalised `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`; accept/decline transitions a booking from `pending` → `confirmed`/`cancelled` and is rejected with 403 for non-owners.
  2. Logged in as Amir (requestor), the search screen returns the 6 seeded providers with Qwen-generated `matchScore` + `matchReason` (deterministic distance+rating fallback when DashScope is down) and `POST /requestor/bookings` creates a pending booking visible on the elder's dashboard within one refresh.
  3. Logged in as the Companion, the dashboard renders Siti's snapshot + weekly-earnings + active-days; the alerts feed projects exactly one `text_<locale>` column based on the companion's `users.locale`; `PUT /companions/elders/{id}/alert-preferences` returns 204 and persists the boolean toggles.
  4. The earnings summary endpoint computes `monthTotal` over the elder's `completed` bookings using the `Asia/Kuala_Lumpur` calendar-month boundary; result matches what the prototype renders today on the seeded data.
  5. Listings + alerts + timeline queries select a single locale column at the SQL level (no client-side `getattr(row, f"text_{locale}")`) and fall back to English via `coalesce` when the requested locale column is NULL.
**Plans**: 5 plans
- [x] 03-01-PLAN.md — Persona router contract test harness (Wave 0)
- [x] 03-02-PLAN.md — Shared persona schemas, query helpers, and seeded match persistence (Wave 1)
- [x] 03-03-PLAN.md — Elder listings, bookings, responses, and earnings router (Wave 2)
- [x] 03-04-PLAN.md — Requestor search and bookings router (Wave 2)
- [x] 03-05-PLAN.md — Companion dashboard, alerts, timeline, and preferences router (Wave 2)

### Phase 4: Voice-to-Profile Pipeline
**Goal**: The elder's "speak to create a listing" flow produces a Pydantic-validated `ListingDraft` from real audio in all 4 locales — streaming for `en-US`/`zh-CN` (2-3s target), batch async-job for `ms-MY`/`ta-IN` (8-12s) — with WebSocket cleanup discipline that survives 30+ demo attempts.
**Depends on**: Phase 2
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, VOICE-07
**Success Criteria** (what must be TRUE):
  1. WS `wss://<backend>/api/v1/voice-to-profile/stream` accepts `{language: "en-US"|"zh-CN"}`, then 16kHz PCM frames, emits `{type:"partial",text}` during speech (≤4 messages/sec) and `{type:"final",listing:ListingDraft}` after the user pauses — end-to-end latency 2-3s on a real connection.
  2. Closing the browser tab mid-recording tears down the upstream Transcribe stream within 5 seconds (verified in CloudWatch); a 90-second max-session timer kills hung handlers; `try/finally` calls `input_stream.end_stream()` and cancels the partial reader on every disconnect path.
  3. `POST /api/v1/voice-to-profile/batch` returns `{jobId,status:"pending",estimatedSeconds}` immediately (no inline polling, no 504); the frontend polls a status endpoint and a background task drives Transcribe Batch + Qwen + DB persist.
  4. Both streaming and batch flows route the final transcript through `services/qwen_service.py::extract_listing` (DashScope OpenAI-compatible endpoint, `response_format={"type":"json_object"}`); markdown fences are stripped before parse; on `ValidationError` the prompt is retried once with the error appended; persistent failure returns `502 {message:"Listing extraction failed"}`.
  5. Streaming uses `amazon-transcribe>=0.6.4` (not boto3); batch uses `boto3`; both pin `region="ap-southeast-1"` explicitly so no requests cross to `us-east-1`.
**Plans**: 5 plans
- [x] 04-01-PLAN.md — Voice batch DB migration, contract test harness, and guardrails (Wave 0)
- [x] 04-02-PLAN.md — Schemas, Qwen extract_listing, and unit tests (Wave 1)
- [x] 04-03-PLAN.md — Transcribe streaming integration, WebSocket handler, voice service (Wave 2)
- [x] 04-04-PLAN.md — S3 presign, Transcribe batch, async job and status HTTP routes (Wave 2, after 04-03 because both edit `voice.py`)
- [x] 04-05-PLAN.md — 502 unification, contract completion, and full phase verification (Wave 3)

### Phase 5: Frontend Wiring + Type Extensions
**Goal**: Every prototype mock helper and inline mock data import is replaced with a typed-API import — types are extended additively in `types.ts` first, then mock helpers swap 1:1, then the WebSocket wires to `ElderVoice`. Zero UI/feature/copy/styling change.
**Depends on**: Phase 3, Phase 4
**Requirements**: FE-01, FE-02, FE-03, FE-04, FE-05, FE-06, FE-07, FE-08, FE-09
**Success Criteria** (what must be TRUE):
  1. `frontend/src/services/api/types.ts` is extended additively only — `Listing` gains `category`/`priceUnit`/`priceMax`/`rating`/`reviewCount`/`halal`/`titleMs/En/Zh/Ta`/`days`/`menu`/`matchScore`/`matchReason`/`distance`/elder-snapshot fields; `Booking` gains `requestorInitials`/`requestorAvatarUrl`/`listingTitle`/`qty`/`itemDescription`; `UserProfile` gains `kycStatus`/`avatarUrl`/`area`/`age`/`phone`/`initials`; `CompanionAlert` gains `title`; new types `ListingDraft`/`Review`/`TimelineEvent`. No field renamed or removed.
  2. `OnboardingFlow.jsx` auth/register calls are wired to `src/services/api/endpoints/auth`; the KYC stepper remains visually unchanged and outside the active backend scope after eKYC removal.
  3. `elder-screens.jsx` / `requestor-screens.jsx` / `companion-screens.jsx` no longer import from `mock-data.js`; every screen drives data via `useEffect` + the typed API client; loading/error states reuse the prototype's existing inline patterns (no new libraries — no router, no TanStack Query, no SWR).
  4. `ElderVoice` opens the WebSocket via the new `voice.ts` helper for `en-US`/`zh-CN` and uses the batch path with browser-direct S3 PUT for `ms-MY`/`ta-IN`; `window.SpeechRecognition` remains as a graceful fallback.
  5. The 3 quick-login chips on `PrototypeApp.jsx` continue to work end-to-end (now hitting `auth.ts → login` against the real backend) and `VITE_API_BASE_URL` is configured for both local-dev and the deployed Alibaba ECS endpoint.
**Plans**: 7 plans
- [x] 05-01-PLAN.md — Frontend API contracts, endpoint gaps, voice helper, and barrel export (Wave 0)
- [x] 05-02-PLAN.md — Auth quick-login, signout, and onboarding register wiring (Wave 1)
- [x] 05-03-PLAN.md — Elder screens mock import removal and API adapters (Wave 2)
- [ ] 05-04-PLAN.md — Requestor screens mock import removal, search, and listing detail adapters (Wave 2)
- [ ] 05-05-PLAN.md — Companion screens mock import removal, timeline, alerts, and preference adapters (Wave 2)
- [ ] 05-06-PLAN.md — ElderVoice WebSocket, batch transport, and ListingDraft adapter (Wave 3, after Phase 4 voice contract)
- [ ] 05-07-PLAN.md — Environment configuration, no-visual-change guardrails, and final verification (Wave 4)
**UI hint**: yes

### Phase 6: Multi-Cloud Live Deployment
**Goal**: A real, public, hackathon-judgeable deployment — frontend on AWS S3+CloudFront, backend on Alibaba ECS, all data services in `ap-southeast-3`, all AI services in `ap-southeast-1` — with a smoke-test demo flow that proves end-to-end correctness from the public CloudFront URL.
**Depends on**: Phase 5
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-05, DEPLOY-06, DEPLOY-07, DEPLOY-08, DEPLOY-09, DEPLOY-10
**Success Criteria** (what must be TRUE):
  1. The frontend is reachable at a public CloudFront URL in `ap-southeast-1`; the backend is reachable at a public Alibaba ECS endpoint in `ap-southeast-3` with WebSocket support and an LB idle timeout ≥300s on the WS path.
  2. ApsaraDB Postgres + Alibaba OSS (provider photos) are provisioned in `ap-southeast-3`; AWS S3 audio bucket is provisioned in `ap-southeast-1` with CORS allowing the CloudFront + backend origins; AWS IAM is least-privilege scoped to the specific bucket and Transcribe operations.
  3. `DASHSCOPE_API_KEY` is provisioned and live; an AWS budget alert is configured at $50/$100 thresholds before any judging traffic hits the URL.
  4. Smoke test from the deployed CloudFront URL completes in one sitting: log in as Siti → browse listings as Amir → create booking → log in as Siti → accept booking → voice-to-profile in en-US produces a listing draft.
  5. The whole frontend renders correctly with `VITE_API_BASE_URL` pointing at the deployed Alibaba ECS endpoint — no CORS errors in the browser console for any of the 5 smoke-test screens.
**Plans**: 6 plans
- [ ] 06-01-PLAN.md — AWS frontend edge, audio bucket, IAM, and budget foundation (Wave 0, parallel-safe before Phase 5)
- [ ] 06-02-PLAN.md — Alibaba ECS, SLB, ApsaraDB, OSS, and DashScope foundation (Wave 0, parallel-safe before Phase 5)
- [ ] 06-03-PLAN.md — Backend container rollout, runtime env, migrations, and health checks (Wave 1, gated on Phase 4/5 completion)
- [ ] 06-04-PLAN.md — Frontend production build, S3 upload, and CloudFront publication (Wave 2, gated on Phase 5 + backend health)
- [ ] 06-05-PLAN.md — Cross-cloud CORS, WebSocket, S3, and secret hardening (Wave 3)
- [ ] 06-06-PLAN.md — Public end-to-end smoke test and demo handoff (Wave 4)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Scaffold + Schema + Seed | 7/7 | Complete | 2026-04-25 |
| 2. Auth + Bearer Middleware | 1/1 | Complete | 2026-04-25 |
| 3. Persona Routers (Elder + Requestor + Companion) | 5/5 | Complete | 2026-04-25 |
| 4. Voice-to-Profile Pipeline | 5/5 | Complete | 2026-04-26 |
| 5. Frontend Wiring + Type Extensions | 3/7 | In Progress | - |
| 6. Multi-Cloud Live Deployment | 0/6 | Planned | - |

## Phase Ordering Rationale

- **Phase 1 → Phase 2 mandatory sequential.** Auth depends on the `users` table and migrations. Phase 1 also pins `amazon-transcribe`, `bcrypt<5`, `pyjwt[crypto]` so downstream phases inherit a locked dep tree.
- **Phase 2 → Phase 3/4 mandatory.** Every protected endpoint depends on `get_current_user`; centralised JWT decode + bcrypt-off-loop are non-negotiable foundations (PITFALLS #3, #4, #18).
- **Phase 3 and Phase 4 are parallelisable post-auth.** They share zero code paths beyond `deps/auth.py` and `schemas/common.py`. With one developer they execute sequentially in this order: Phase 3 unblocks the most UI, then Phase 4 handles the voice risk.
- **Phase 5 (frontend wiring) requires the data routers and voice pipeline.** Type extensions land first (additive, no break), then mock-helper swap, then `ElderVoice` WebSocket wire-up.
- **Phase 6 (deploy) is parallelisable from Phase 1.** IaC provisioning (ECS, ApsaraDB, OSS, S3, CloudFront, IAM) needs no application code; it gates on a runnable Docker image and a working smoke test, so it ships as the final phase.

## Coverage

- active v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

---
*Roadmap defined: 2026-04-25*
