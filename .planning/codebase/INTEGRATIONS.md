# External Integrations

**Analysis Date:** 2026-04-25

## Overview

GingerGig's intended architecture is a multi-cloud split: AWS owns the user-facing edge (frontend hosting, ASR, eKYC); Alibaba Cloud owns the data plane and generative AI (FastAPI backend, Postgres, Redis, OSS, Qwen). Source: `MULTI-CLOUD-ARCHITECTURE.md` (top-level, identical-ish copy at `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` which adds the eKYC sub-flow).

**Implementation status today:**
- The frontend has typed client functions for every documented endpoint at `frontend/src/services/api/endpoints/`.
- No integration is actually live — the prototype runs entirely on mock data (`frontend/src/prototype/mock-data.js`).
- The backend that would orchestrate all of this is **planned/scaffolded but removed** (see git commit `3de5f53` for the deleted scaffold).
- Below, every entry is marked **[implemented]**, **[client-ready, backend missing]**, or **[planned only]**.

## APIs & External Services

**KYC / Identity (planned only — runs in AWS):**
- AWS Textract (`AnalyzeID` API) — OCR on Malaysian MyKad ID; extracts `fullName`, `icNumber`, `dateOfBirth`, `address`, `nationality`, `gender`, `confidence` 0–100. See `frontend/src/services/api/types.ts` (`ExtractedIdData`).
- AWS Rekognition (`CompareFaces`) — matches IC face vs selfie; returns similarity score 0–100. See `FaceMatchResult` in `frontend/src/services/api/types.ts`.
- AWS Rekognition Face Liveness — optional anti-spoof check. Field: `livenessScore` in `FaceMatchResult`.
- AWS Lambda — KYC orchestrator that chains Textract → Rekognition → writes back to backend via `PATCH /users/{userId}/kyc-result`. Documented in `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` lines 64–89.

**Speech-to-text (planned only — runs in AWS):**
- AWS Transcribe Streaming — for `en-US` and `zh-CN`; live partials over WebSocket. ~2-3s end-to-end. See `frontend/docs/API_READY_MIGRATION.md` lines 306–321.
- AWS Transcribe Batch — for `ms-MY` and `ta-IN` (streaming doesn't support these). ~8-12s. Endpoint: `POST /voice-to-profile/batch`.

**LLM (planned only — runs in Alibaba Cloud):**
- Qwen / DashScope — JSON extraction from voice transcripts, listing copy generation, matching ranking, earnings nudges. Strict-JSON mode (`response_format={"type": "json_object"}`). Schema documented in `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` lines 114–132. Backend env key: `DASHSCOPE_API_KEY` (from former `backend/.env.example`).

**Frontend HTTP client [implemented]:**
- All calls go through `frontend/src/services/api/http.ts` (`apiRequest<T>`).
- Auto-prepends `/api/v1` prefix to every path.
- Bearer token attached via `setApiAccessToken()` after login/register.
- Aborts via `AbortController` after `VITE_API_TIMEOUT_MS` (default 15s) and surfaces as `{ status: 408 }`.
- Throws typed `ApiError` (`{ status, message, detail }`) on non-2xx.

**Application API endpoints [client-ready, backend missing]:**
All under `{VITE_API_BASE_URL}/api/v1`:

| Module | File | Endpoints |
|---|---|---|
| Auth | `frontend/src/services/api/endpoints/auth.ts` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (logout is client-only) |
| KYC | `frontend/src/services/api/endpoints/kyc.ts` | `POST /kyc/session`, `POST /kyc/verify`, `GET /kyc/status/:jobId`, `POST /kyc/retry` (plus direct PUT to presigned S3 URL) |
| Elder | `frontend/src/services/api/endpoints/elder.ts` | `GET /elders/:id/listings`, `PATCH /listings/:id`, `GET /elders/:id/bookings`, `POST /bookings/:id/respond`, `GET /elders/:id/earnings/summary` |
| Requestor | `frontend/src/services/api/endpoints/requestor.ts` | `GET /requestor/listings/search`, `POST /requestor/bookings`, `GET /requestor/bookings` |
| Companion | `frontend/src/services/api/endpoints/companion.ts` | `GET /companions/elders/:elderId/dashboard`, `GET /companions/elders/:elderId/alerts`, `PUT /companions/elders/:elderId/alert-preferences` |

## Data Storage

**Databases (planned only):**
- Alibaba ApsaraDB PostgreSQL — primary relational store (users, listings, bookings, earnings, KYC sessions). Region: `ap-southeast-3` (Malaysia). Connection env: `DATABASE_URL` (former `backend/.env.example`).
- Driver intended: SQLAlchemy 2.x async + asyncpg (former `backend/db.py`, `backend/pyproject.toml`).
- DynamoDB referenced once in `frontend/src/services/api/endpoints/kyc.ts` JSDoc as the KYC session store, but `MULTI-CLOUD-ARCHITECTURE.md` says Postgres holds it. Treat the JSDoc note as stale — Postgres is the system of record.

**File / object storage (planned only):**
- AWS S3 (audio bucket, `ap-southeast-1`) — voice recordings for batch ASR (BM, Tamil only). Browser PUTs via presigned URL.
- AWS S3 (KYC bucket, `ap-southeast-1`) — IC front, IC back, selfie. Browser PUTs via presigned URL. **24-hour lifecycle auto-delete** (per `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md`). Backend never sees raw images.
- Alibaba OSS — provider profile photos / non-PII media. Env: `OSS_ENDPOINT`, `OSS_BUCKET`.

**Cache (planned only):**
- Alibaba Tair (Redis) — listings cache, search results, session lookups. Used as a read-through cache only; explicitly **not** a job queue (per `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` line 111).

## Authentication & Identity

**Auth approach [client-ready, backend missing]:**
- Custom Bearer-token JWT, issued by the backend on `/auth/register` and `/auth/login`.
- Token storage: in-memory only (module-level `accessToken` variable in `frontend/src/services/api/http.ts`). Not persisted to localStorage / cookies — refresh wipes the session. This will need revisiting before production.
- Token attached to every subsequent request as `Authorization: Bearer <token>` by `apiRequest()` in `frontend/src/services/api/http.ts`.
- No refresh-token flow defined. `RegisterResponse.expiresIn` and `Session.expiresIn` are present in `frontend/src/services/api/types.ts` but not yet consumed.

**Identity verification (KYC) [planned only]:**
- Required for `elder` role only. Flagged via `kycRequired: boolean` in `RegisterResponse`.
- Status machine: `not_started` → `pending` → `approved` | `failed` | `manual_review` (terminal). Defined in `frontend/src/services/api/types.ts` as `KycStatus`.
- Polling cadence: every 2.5s, max 24 polls = 60s total before timeout. See `POLL_INTERVAL_MS` and `MAX_POLLS` in `frontend/src/services/api/endpoints/kyc.ts`.

**Roles & locales:**
- Roles: `"elder" | "requestor" | "companion"` (`UserRole` in `types.ts`).
- Locales: `"ms" | "en" | "zh" | "ta"` (`Locale` in `types.ts`).

## Monitoring & Observability

**Error tracking:** Not detected. No Sentry, Rollbar, Datadog, or similar SDK in `frontend/package.json`.

**Frontend logs:** Not detected — no `console.log` strategy or logging wrapper. Errors are thrown as `ApiError` and assumed to be handled at component level.

**Backend logs:** Not applicable (backend removed).

## CI/CD & Deployment

**Hosting (planned only):**
- Frontend: AWS S3 + CloudFront, region `ap-southeast-1`. CloudFront edge POP at KL/Cyberjaya per `MULTI-CLOUD-ARCHITECTURE.md`.
- Backend: Alibaba Cloud ECS, region `ap-southeast-3`.

**CI pipeline:** Not detected. No `.github/workflows/`, no GitLab CI, no other CI config in the repo (`.github/` is gitignored per `.gitignore`).

**Lockfiles committed:**
- `frontend/package-lock.json` — present.
- `backend/uv.lock` — was committed in `3de5f53`, deleted in working tree.

## Environment Configuration

**Frontend (`frontend/.env.example`):**
- `VITE_API_BASE_URL` — bare host (no `/api/v1` suffix). Default `http://localhost:8000`. Production placeholder noted as `https://api.gingergig.my`.
- `VITE_API_TIMEOUT_MS` — request timeout in ms. Default `15000`.

**Backend (planned — from former `backend/.env.example`, recoverable from commit `3de5f53`):**
- `DATABASE_URL` — Postgres connection string (asyncpg DSN)
- `DASHSCOPE_API_KEY` — Qwen / Alibaba DashScope API key
- `OSS_ENDPOINT`, `OSS_BUCKET` — Alibaba OSS bucket for provider photos
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` — credentials for S3, Textract, Rekognition, Transcribe

**Secrets location:** No vault / secret manager configured. Local development relies on `.env.local` (frontend) and the missing `backend/.env`. `.env` is in `.gitignore`.

## Webhooks & Callbacks

**Incoming webhooks:** None defined.

**Outgoing webhooks / callbacks (planned only):**
- KYC Lambda → Backend: `PATCH /users/{userId}/kyc-result` once Textract + Rekognition complete (per `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` line 77). This is an internal AWS-to-Alibaba HTTPS call, not a third-party webhook.

## WebSockets & Streaming

**Voice-to-profile streaming (planned only — not yet wired in frontend):**
- URL: `wss://<backend>/voice-to-profile/stream`
- Handshake frame: `{ language: "ms-MY" | "en-US" | "zh-CN" | "ta-IN" }`
- Client sends 16kHz PCM binary chunks; receives `{ type: "partial", text }` then `{ type: "final", listing }`.
- Languages routed: `en-US` and `zh-CN` only (other two go through batch).
- Frontend prototype currently uses browser `window.SpeechRecognition` as a stand-in (`frontend/src/prototype/elder-screens.jsx`). Backend wiring guidance in `frontend/docs/API_READY_MIGRATION.md` lines 306–321.

## Notable Integration Decisions

- **PII isolation across clouds.** IC images and selfies live exclusively in AWS S3 (`ap-southeast-1`). The Alibaba backend only ever sees extracted text fields and a pass/fail status — never raw images. Source: `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` line 160.
- **Direct browser-to-S3 uploads.** Both KYC images and batch-ASR audio are uploaded by the browser via presigned PUT URLs. No upload bytes pass through the backend, keeping PII off application logs (`frontend/src/services/api/endpoints/kyc.ts` JSDoc).
- **Backend as WebSocket proxy for Transcribe.** Browser does not talk to AWS Transcribe directly — keeps AWS credentials server-side and gives a single switch point for streaming-vs-batch routing by language code.
- **Qwen-only entity extraction.** AWS Comprehend was explicitly rejected (`frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` line 156): its entity types don't map to domain concepts (cuisines, dietary tags, capacity), and Qwen handles all four languages with native structured-JSON output.
- **Cross-region latency** SG ↔ KL: ~10-15ms RTT, considered negligible vs ASR processing time.

---

*Integration audit: 2026-04-25*
