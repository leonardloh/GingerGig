# Project Research Summary — GingerGig backend v1

**Project:** GingerGig backend v1 (replace-mocks-with-DB milestone)
**Domain:** Multi-cloud FastAPI backend (AWS edge AI + Alibaba data plane) for a hyperlocal Malaysian elder gig marketplace
**Researched:** 2026-04-25
**Confidence:** HIGH

## Executive Summary

This is **not greenfield** — the React+TypeScript frontend already ships and runs on mock data. The milestone replaces every prototype mock (`HERO_ELDER`, `PROVIDERS`, `ELDER_LISTINGS`, `ELDER_BOOKINGS`, `REVIEWS`, `COMPANION_ALERTS`, `TIMELINE`, `DEMO_ACCOUNTS`, plus inline KYC + register helpers) with a FastAPI backend on Alibaba ECS that orchestrates AWS for edge AI (Transcribe, Textract, Rekognition) and Alibaba for the data plane (ApsaraDB Postgres, Tair, OSS, DashScope/Qwen). The frontend's typed `apiRequest` client already names every endpoint and DTO — the backend's job is to honour that contract verbatim, with additive type extensions for fields the prototype renders but the DTOs lag (`Listing.category/priceUnit/halal/menu/days/matchScore/...`, `Booking.requestorInitials/qty/itemDescription`, `UserProfile.kycStatus/area/age/avatarUrl`).

The recommended approach is a **strict 7-phase DAG**: Scaffold+DB+Alembic → Auth → {Elder, Requestor, Companion, KYC, Voice} in parallel → Tair cache + frontend wiring → multi-cloud deploy. Auth must land before any data router (every protected endpoint depends on `get_current_user`), and the Postgres schema must be locked early because it's the contract for five parallel router tracks. Stack choices are largely forced by the user's constraints (FastAPI, async SQLAlchemy 2 + asyncpg, `uv`, Python 3.12+); the open package-level decisions are all about which library *not* to use — see Critical Pitfalls.

The biggest risks are **not technical complexity, they're architectural mistakes the existing docs already encode**. Four cross-cutting corrections drive every phase: (1) AWS Textract `AnalyzeID` does NOT support MyKad — the architecture doc and `kyc.ts` JSDoc are wrong; use `AnalyzeDocument` + IC-number regex instead. (2) `boto3` does NOT do Transcribe Streaming — that's the `amazon-transcribe` SDK (separate PyPI package, async-native). (3) `bcrypt 5.0` silently breaks `passlib`; pin `bcrypt>=4.2,<5.0` and call it directly (no passlib at all). (4) `jwt.decode` without explicit `algorithms=["HS256"]` is a one-line auth bypass — wrap once in `core/security.py` and never expose raw decode. Plus the demo-day landmines: WebSocket `try/finally` cleanup discipline (or AWS quota gets exhausted by 30 demo attempts), and S3 bucket CORS configured for the CloudFront origin (or KYC uploads fail silently from the deployed URL). Mitigate these in the foundation phases and the rest of the build is mechanical.

## Key Findings

### Recommended Stack

User-locked: FastAPI ≥0.136 + `uv` + Python 3.12+ + async SQLAlchemy 2 + asyncpg. The non-obvious package-level decisions (full detail in `STACK.md`):

**Core technologies:**
- `fastapi>=0.136.1` + `uvicorn[standard]>=0.46.0` — the `[standard]` extra pulls `httptools`, `uvloop`, `websockets` for production-grade WS
- `sqlalchemy[asyncio]>=2.0.49` + `asyncpg>=0.31.0` — URL prefix `postgresql+asyncpg://`; do NOT also install `psycopg2`
- `alembic>=1.18.4` (async template) — never `Base.metadata.create_all`
- `pydantic>=2.13.3` + `pydantic-settings>=2.14.0` — settings reads `.env` directly, no separate `python-dotenv`
- `boto3>=1.42.96` — for S3 presign, Textract, Rekognition, Transcribe **Batch** only (wrap in `asyncio.to_thread`)
- **`amazon-transcribe>=0.6.4`** — separate awslabs SDK; the ONLY Python option for Transcribe Streaming
- `alibabacloud-oss-v2>=1.2.5` — V2 SDK for new projects (V1 sigs deprecated 2025-03-01)
- `openai>=2.32.0` against DashScope's `compatible-mode/v1` endpoint — same API surface, supports `response_format={"type": "json_object"}` on qwen-max/plus/turbo
- `redis>=7.4.0` — `redis.asyncio` is the merged successor to abandoned `aioredis`; works directly against Tair
- `pyjwt[crypto]>=2.12.1` — FastAPI moved off python-jose in 2024
- **`bcrypt>=4.2.0,<5.0.0`** used directly (no `passlib`); bcrypt 5 broke passlib's backend introspection

### Expected Features

This is a backend-replaces-mocks milestone, not feature design — see `FEATURES.md` for the complete mock-symbol → endpoint map. Every "feature" is a backend behaviour required so the existing UI works unchanged.

**Must have (table stakes — no UI mounts without these):**
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` with bcrypt + JWT; the 3 `DEMO_ACCOUNTS` (siti/amir/faiz, all password `demo`) must keep working
- Elder CRUD: listings, bookings (incoming + completed), accept/decline, earnings summary
- Requestor CRUD: listing search, provider detail, create booking, list bookings
- Companion: dashboard (status + weekly stats + HERO_ELDER snapshot), alerts (4-locale stored, server-picked), timeline, alert preferences PUT
- eKYC pipeline: `POST /kyc/session` (3 presigned PUTs) → `POST /kyc/verify` → poll `GET /kyc/status/{jobId}` → `POST /kyc/retry`
- Locale-aware responses (`ms`/`en`/`zh`/`ta`); columns `text_en/ms/zh/ta` on alerts/timeline/listing titles, server projects only the requested locale

**Should have (differentiators — but the prototype renders them, so they're effectively required):**
- Voice-to-profile **streaming** WS for `en-US`/`zh-CN` — headline demo, target 2-3s after stop speaking
- Voice-to-profile **batch** for `ms-MY`/`ta-IN` — multilingual pitch, 8-12s
- Qwen JSON extraction (transcript → ListingDraft) shared by both voice paths
- Qwen-powered match ranking (`matchScore` + `matchReason` are already rendered in the prototype)
- Tair read-through cache for listing search and earnings summary

**Defer (v1.x or v2):**
- Refresh-token flow, OSS upload UI for elder photos (use seeded URLs), live alert generation cron (seed alerts), separate `GET /listings/{id}/reviews` endpoint (embed in detail response)

**Anti-features (PROJECT.md "Out of Scope"):**
Real-time chat, payments, push notifications, admin surface, mobile-native shells, refresh-token rotation, replacing the `SpeechRecognition` fallback in `ElderVoice`, AWS Comprehend, AWS S3 for provider photos (OSS owns non-PII media).

### Architecture Approach

FastAPI module layout mirrors the frontend's `endpoints/*.ts` 1:1 — `routers/auth.py` ↔ `auth.ts`, `routers/elder.py` ↔ `elder.ts`, etc. Strict layering: `routers/` → `schemas/` + `services/`; `services/` → `models/` + `integrations/`; `integrations/` is the only layer that imports `boto3`/OSS/`amazon-transcribe`. Per-request `AsyncSession` via `Depends(get_db)`; engine + Redis pool + boto3 clients are process-singletons built in `lifespan`.

**Major components:**
1. **FastAPI app on Alibaba ECS (`ap-southeast-3`)** — routers + services + integrations; serves REST `/api/v1/*` and WS `/api/v1/voice-to-profile/stream`
2. **ApsaraDB Postgres** (system of record, 12+ tables: `users`, `companion_links`, `listings`, `listing_menu_items`, `bookings`, `reviews`, `companion_alerts`, `companion_alert_preferences`, `timeline_events`, `kyc_sessions`, `voice_sessions`)
3. **Tair (Redis-compatible)** — read-through cache only (NOT a job queue per `MULTI-CLOUD-ARCHITECTURE.md`); keys for search results, earnings summary, KYC polling, JWT session presence
4. **AWS edge AI in `ap-southeast-1`** — S3 KYC bucket (24h lifecycle), S3 audio bucket, Textract, Rekognition, Transcribe Streaming + Batch
5. **Alibaba data services** — OSS for provider photos (non-PII), DashScope for Qwen JSON extraction
6. **Browser-direct S3 PUT via presigned URLs** — backend never sees raw IC images or batch audio bytes (PII isolation)

The two trickiest data flows are documented in detail in `ARCHITECTURE.md` §3: (a) the WS proxy that bridges browser ⇄ `amazon-transcribe` SDK with two `asyncio.create_task`s and a partial-transcript queue; (b) the KYC async pipeline run as `asyncio.create_task` from `/kyc/verify` writing terminal state into `kyc_sessions`. The voice batch endpoint should NOT poll inline (60s ALB timeout) — submit + return jobId, frontend polls.

### Critical Pitfalls

These five are the cross-cutting corrections that change how a planner should structure the work. Full inventory of 20 pitfalls in `PITFALLS.md`.

1. **Textract `AnalyzeID` does not support MyKad** — it's hard-coded to US driver's licenses + US passports. The architecture doc and `kyc.ts` JSDoc are factually wrong. Use `AnalyzeDocument` (FORMS+TABLES) + a regex parser for the IC number pattern (`YYMMDD-PB-####`) and printed name. Decide the OCR strategy BEFORE the KYC phase begins or the entire flow is rework.
2. **`boto3` cannot do Transcribe Streaming** — only the `amazon-transcribe` PyPI package can. PROJECT.md currently says "boto3" — that's wrong. Pin `amazon-transcribe>=0.6.4` in Phase 1's `pyproject.toml` so it's already in `uv.lock` when streaming work begins.
3. **`bcrypt 5.0` silently breaks `passlib`** — bcrypt 5 (released 2025-09-25) removed `__about__`; passlib reads it for backend detection and explodes with a misleading "password longer than 72 bytes" error. Pin `bcrypt>=4.2.0,<5.0.0` and call bcrypt directly with no passlib. Also: bcrypt is CPU-bound — wrap every `checkpw` in `await asyncio.to_thread(...)` or it stutters concurrent requests for 250ms each.
4. **JWT algorithm-confusion auth bypass** — `jwt.decode(token, secret)` without explicit `algorithms=["HS256"]` accepts `{"alg":"none"}` forged tokens (CVE-2022-29217 PyJWT, CVE-2024-33663 python-jose). Build ONE central helper in `core/security.py` with `algorithms=["HS256"]` + `options={"require": ["exp", "sub"]}`; never expose raw `jwt.decode` to routers. Lock this in the Auth phase before any protected route is written.
5. **WebSocket cleanup leaks Transcribe sessions** — closing the browser tab does NOT auto-close the upstream Transcribe stream. Without `try/finally` in the WS handler calling `input_stream.end_stream()` and cancelling the partial-transcript reader task, ~30 demo attempts will hit the per-account streaming-session quota and brick the demo. Add a max-session timer (~90s) for hung handlers. Build the cleanup pattern in the FIRST WS handler — retrofitting is painful.

Honourable mentions also-critical: cross-cloud S3 CORS (3 origins to configure: CloudFront, backend, S3 bucket); region pinning (`ap-southeast-1` for ALL AWS, including the streaming SDK which has its own region resolution); per-request `AsyncSession` only (module-level shared session = silent connection corruption); Pydantic-validate Qwen JSON output (response_format isn't schema-enforcing — markdown fences and enum drift are routine); `debug=False` + global exception handler (or PII leaks via tracebacks).

## Implications for Roadmap

The architecture research surfaced a clean 7-phase DAG. Phases 4 and 5 are the only fork — they share zero code paths and can run in parallel if two devs are available. Within Phase 3, the four router tracks (D1-D4) can be split across developers; only `services/listing_service.py` is mildly shared between Elder and Requestor.

### Phase 1: Scaffold + DB + Alembic + Settings + Errors
**Rationale:** Every phase below depends on a runnable FastAPI app, a migrated schema, and a seeded DB. The schema is the contract for five parallel router tracks — getting it right early prevents rewrites.
**Delivers:** `app/main.py` boots, `/health` returns 200, `alembic upgrade head` migrates the full schema, `scripts/seed.py` loads `DEMO_ACCOUNTS` + `PROVIDERS` + `ELDER_LISTINGS` + `ELDER_BOOKINGS` + `REVIEWS` + `COMPANION_ALERTS` + `TIMELINE` (all idempotent via `ON CONFLICT (id) DO UPDATE`), Docker image runnable.
**Avoids pitfalls:** #2 (pin `amazon-transcribe` in deps now), #6 (region pinning + AWS budget alert), #8 (per-request `AsyncSession` pattern locked), #9 (connection pool sized), #10 (alembic from day one — never `create_all`), #11 (seed FK ordering + UUID5 deterministic IDs + ON CONFLICT upserts), #20 (`debug=False` + global exception handler scaffolded).

### Phase 2: Auth + middleware
**Rationale:** Every protected endpoint depends on `get_current_user`. Build the JWT helper once, lock the bcrypt + algorithm-confusion mitigations, then every router after this is a thin wrapper.
**Delivers:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`; bearer middleware; demo accounts seeded with bcrypt hashes; quick-login chips on the prototype login screen work end-to-end.
**Implements:** `core/security.py` (sole JWT decode call site), `deps/auth.py` (`get_current_user`, `get_current_user_ws` for query-string token), `services/auth_service.py`.
**Avoids pitfalls:** #3 (centralised `algorithms=["HS256"]` decode), #18 (bcrypt off the event loop via `asyncio.to_thread`), #19 (CORS allowlist not `*`, JWT secret ≥32 bytes from `secrets.token_urlsafe`, login rate-limit).

### Phase 3: Persona routers (Elder + Requestor + Companion + KYC) — parallelisable
**Rationale:** Five logical tracks, three of which (Elder/Requestor/Companion) are CRUD-shaped and one (KYC) is the longest critical path due to 4 endpoints + S3 + Textract + Rekognition + polling. Schedule KYC early within this phase so polling is testable end-to-end. Voice is split into Phase 4 because its risk profile is different.
**Delivers:** All non-voice endpoints in `FEATURES.md`'s v1 endpoint table; the prototype runs entirely on real DB reads if `voice.ts` and the WS are stubbed.
**Implements:** `routers/{elder,requestor,companion,kyc}.py` + matching services + `integrations/{s3,textract,rekognition}.py`.
**Avoids pitfalls:** #1 (decide MyKad OCR strategy — `AnalyzeDocument`+regex — at the START of this phase, not mid-implementation), #5 (S3 bucket CORS for KYC bucket), #15 (3-tier Rekognition state machine: ≥90% approved, ≥70% manual_review, else failed; surface enum failure code), #16 (project only the requested locale at SQL level for listings + alerts).

### Phase 4: Voice pipeline (streaming WS + batch)
**Rationale:** Risk-isolated phase because it concentrates the WebSocket + AWS streaming + Qwen JSON validation pitfalls. Can run in parallel with Phase 3 if a second dev exists, but treat as its own track because the failure modes are unique.
**Delivers:** WS `/voice-to-profile/stream` for en-US/zh-CN with 2-3s end-to-end target; `POST /voice-to-profile/batch` for ms-MY/ta-IN as async-job pattern (submit + return jobId, frontend polls); both paths share `qwen.extract_listing()` with strict Pydantic validation.
**Uses:** `amazon-transcribe` SDK (NOT boto3), `boto3` for batch, `openai` SDK against DashScope compatible-mode for Qwen.
**Avoids pitfalls:** #2 (`amazon-transcribe` SDK), #4 (WS `try/finally` cleanup + 90s max-session timer + log open/close pairs), #7 (Pydantic-validate Qwen output, strip markdown fences, 1-shot retry on ValidationError), #12 (frontend uses `AudioContext`/`AudioWorklet` for 16kHz PCM, NOT `MediaRecorder`), #13 (coalesce partials, throttle to 4/s), #14 (batch endpoint must NOT inline-poll — async-job pattern with frontend polling), #17 (uvicorn ws-ping + LB idle timeout ≥300s for WS path).

### Phase 5: Tair cache + listing search hot path polish
**Rationale:** Cache layer is additive — every endpoint works without it. Land last so cache-key choices reflect actual query patterns observed in Phase 3 traffic.
**Delivers:** Read-through cache on `listings:search:{hash}`, `listings:elder:{id}`, `earnings:elder:{id}`, `kyc:status:{jobId}`, `qwen:rank:{requestor}:{listings_hash}`; write-side cache invalidation on listing PATCH and booking creation.

### Phase 6: Frontend wiring + type extensions
**Rationale:** Until D1-D5 are deployed (or available on `localhost:8000`), frontend stays on mocks. Type extensions in `types.ts` must land BEFORE the screen-by-screen mock swap or TypeScript breaks every component reading `provider.matchScore`, `booking.requestorInitials`, etc.
**Delivers:** `frontend/src/services/api/types.ts` extended additively; inline mock helpers in `OnboardingFlow.jsx` swapped for `auth.ts`/`kyc.ts` imports; `ElderVoice` wired to WS while keeping `SpeechRecognition` fallback; new `voice.ts` endpoint module.

### Phase 7: Multi-cloud deploy
**Rationale:** Provisioning ECS + ApsaraDB + Tair + OSS + S3 (×2) + CloudFront can start in parallel with Phase 3 since it's mostly IaC; gates on having a runnable Docker image. Smoke test on the deployed CloudFront URL is the only place pitfall #5 (S3 CORS from real origin) surfaces.
**Delivers:** Live multi-cloud deploy; smoke-test login flow + KYC happy path + voice streaming through public CloudFront URL.

### Phase Ordering Rationale

- **Phase 1 → Phase 2 is mandatory sequential** — auth depends on the user table existing and migrations running.
- **Phase 2 → Phase 3 is mandatory** — every protected endpoint depends on `get_current_user`.
- **Phase 3 internal:** Elder/Requestor/Companion can fully parallelise; KYC is independent code-wise but is the longest critical path so prioritise it.
- **Phase 4 (Voice) can run in parallel with Phase 3** — shares zero code paths.
- **Phase 5 (Cache) is last among backend phases** — additive, depends on observed query patterns.
- **Phase 6 (Frontend wiring)** waits on D1-D5 deployed at minimum to localhost; type extensions land at the start of this phase.
- **Phase 7 (Deploy) is parallelisable from Phase 1** — IaC provisioning needs no application code, only env credentials.

### Research Flags

Phases likely needing deeper `/gsd-research-phase` during planning:
- **Phase 3 (KYC sub-track):** Decide MyKad OCR approach BEFORE phase starts. Default recommendation: `AnalyzeDocument` (FORMS+TABLES) + regex IC parser. Validate on a real (redacted) MyKad image before committing. Tune Rekognition similarity thresholds (90/70 are placeholders) on real test data.
- **Phase 4 (Voice streaming):** Frontend `AudioWorklet` 16kHz PCM Int16 conversion + Safari fallback. Confirm DashScope strict JSON-schema mode availability for `qwen-max`.

Phases with standard patterns (skip research):
- **Phase 1 (Scaffold/DB)** — `STACK.md` already prescribes packages and versions.
- **Phase 2 (Auth)** — `PITFALLS.md` #3, #18, #19 cover the gotchas.
- **Phase 3 (Elder/Requestor/Companion CRUD)** — mechanical mock-symbol → endpoint mapping in `FEATURES.md`.
- **Phase 5 (Tair cache)** — `ARCHITECTURE.md` §5 specifies cache key scheme + TTLs.
- **Phase 6 (Frontend wiring)** — type extensions enumerated in `FEATURES.md`; mock swap is mechanical.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against PyPI 2026-04-25; library choices grounded in official docs. The "what NOT to use" decisions are backed by GitHub issues (bcrypt #1079, boto3 #2296). |
| Features | HIGH | Frontend is the spec — every endpoint and DTO is grounded in actual files. Mock-symbol → endpoint map is exhaustive. |
| Architecture | HIGH (layout, schema) / MEDIUM (KYC thresholds) | Module layout mirrors frontend boundaries; schema columns trace 1:1 to mock-data fields and DTOs. KYC similarity/confidence thresholds and Tair TTLs are educated estimates. |
| Pitfalls | HIGH | All 20 pitfalls reproduced in linked GitHub issues, CVEs, official AWS docs. Pitfalls 1-4 are the cross-cutting corrections that override claims in PROJECT.md / `MULTI-CLOUD-ARCHITECTURE.md` / `kyc.ts` JSDoc. |

**Overall confidence:** HIGH

### Gaps to Address

- **MyKad OCR strategy decision** — must happen at the start of Phase 3's KYC sub-track. Default: `AnalyzeDocument` (FORMS+TABLES) + regex IC parser.
- **PROJECT.md said "AWS Transcribe Streaming via boto3"** — wrong; corrected to `amazon-transcribe` SDK in this milestone's PROJECT.md update.
- **`MULTI-CLOUD-ARCHITECTURE.md` claims `AnalyzeID` extracts MyKad fields** — wrong; correction tracked in PROJECT.md Key Decisions.
- **KYC decision thresholds** (Rekognition similarity, Textract confidence) need real-data tuning. Document chosen values in PROJECT.md Key Decisions when set.
- **DashScope strict JSON-schema mode** vs `json_object` mode — confirm strict mode is available on the model variant chosen for production.
- **Frontend `AudioWorklet` code** — flag for Phase 4 research; Safari fallback path may need additional investigation.
- **KYC orchestrator** (FastAPI background task vs Lambda per `MULTI-CLOUD-ARCHITECTURE.md`) — recommend FastAPI background task for v1 simplicity.

## Sources

### Primary (HIGH confidence)
- PyPI JSON metadata 2026-04-25
- [awslabs/amazon-transcribe-streaming-sdk](https://github.com/awslabs/amazon-transcribe-streaming-sdk)
- [boto3 #2296](https://github.com/boto/boto3/issues/2296)
- [pyca/bcrypt #1079](https://github.com/pyca/bcrypt/issues/1079)
- [AWS Textract `AnalyzeID` AI Service Card](https://docs.aws.amazon.com/ai/responsible-ai/textract-analyzeid/overview.html)
- [PortSwigger: JWT algorithm confusion](https://portswigger.net/web-security/jwt/algorithm-confusion); CVE-2022-29217, CVE-2024-33663
- [DashScope structured output / JSON mode docs](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output)
- [Alibaba OSS Python SDK V2 docs](https://www.alibabacloud.com/help/en/oss/developer-reference/get-started-with-oss-sdk-for-python-v2)
- [redis-py asyncio examples](https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html)
- [FastAPI #11345: time to abandon python-jose](https://github.com/fastapi/fastapi/discussions/11345)

### Tertiary / Internal (HIGH for project state)
- `/Users/user/repos/GingerGig/.planning/PROJECT.md`
- `/Users/user/repos/GingerGig/MULTI-CLOUD-ARCHITECTURE.md`
- `/Users/user/repos/GingerGig/frontend/docs/API_READY_MIGRATION.md`
- `/Users/user/repos/GingerGig/frontend/src/prototype/{mock-data.js,PrototypeApp.jsx,OnboardingFlow.jsx,*-screens.jsx}`
- `/Users/user/repos/GingerGig/frontend/src/services/api/{http,types,index}.ts` + `endpoints/*.ts`
- `/Users/user/repos/GingerGig/.planning/codebase/*.md`

---
*Research completed: 2026-04-25*
*Ready for roadmap: yes*
