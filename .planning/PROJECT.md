# GingerGig

## What This Is

GingerGig is a hyperlocal gig platform for Malaysian elders — a mobile-first React app that lets seniors offer services (home cooking, traditional crafts, pet sitting, light housekeeping) to nearby requestors, with a "companion" persona so adult children can monitor mum/dad's activity, earnings, and well-being. The frontend is built and runs on mock data; this milestone replaces all in-memory constants with a real multi-cloud backend (FastAPI on Alibaba Cloud + AWS for ASR) and feeds the existing UI from Postgres.

## Core Value

The frontend continues to work exactly as today — every screen, every persona, every i18n string — but every piece of "data" loads from the database via the existing typed API client. No feature is added, removed, or visually changed.

## Requirements

### Validated

<!-- Inferred from existing frontend codebase — already shipped and working on mock data. Backend implementation must preserve these behaviors. -->

- ✓ Three-persona UI shell (elder / requestor / companion) with persona-specific tab sets — existing
- ✓ Login screen with quick-login demo accounts (Siti / Amir / Companion) — existing
- ✓ Onboarding flow for new users (role pick → basic info → KYC stepper) — existing
- ✓ Elder dashboard, listings list, voice-to-profile screen, earnings, profile — existing
- ✓ Requestor home/search, provider detail, bookings, profile — existing
- ✓ Companion dashboard, alerts feed, timeline, profile — existing
- ✓ 4-language i18n (`ms` / `en` / `zh` / `ta`) with runtime language switcher — existing
- ✓ Typed API client at `frontend/src/services/api/` covering auth, kyc, elder, requestor, companion endpoints — existing
- ✓ Generic HTTP wrapper with `Authorization: Bearer` injection, `AbortController` timeout, `ApiError` envelope — existing
- ✓ Phase 1 backend foundation — FastAPI scaffold, async SQLAlchemy/Alembic schema, ApsaraDB connectivity, idempotent prototype seed data, demo bcrypt accounts, and backend test harness validated on 2026-04-25
- ✓ Phase 5 frontend wiring — additive DTO extensions, typed auth/persona/voice endpoint imports, no `mock-data.js` screen imports, origin-only `VITE_API_BASE_URL`, and no visual/CSS drift validated on 2026-04-25

### Active

<!-- Backend milestone v1 — hypotheses until shipped. Frontend is NOT changed except: (a) swap inline mock helpers for typed-API imports, (b) extend types where the prototype showed fields not yet in DTOs. -->

- [x] FastAPI backend scaffolded with `uv` (Python 3.12+), running at `localhost:8000` and serving `/api/v1/*` — validated in Phase 1
- [x] Postgres schema covering users, listings, bookings, reviews, earnings, companion alerts, timeline events, KYC sessions — validated in Phase 1
- [x] Seed script that loads the existing prototype constants (PROVIDERS, HERO_ELDER, ELDER_LISTINGS, ELDER_BOOKINGS, ELDER_COMPLETED, REVIEWS, COMPANION_ALERTS, TIMELINE) plus the 3 DEMO_ACCOUNTS into the database — validated in Phase 1
- [ ] Real auth: bcrypt password hashing, JWT issuance, `Authorization: Bearer` middleware
- [ ] Auth endpoints implemented (`POST /auth/register`, `POST /auth/login`, `GET /auth/me`)
- [ ] Elder endpoints implemented (listings CRUD, bookings list, respond, earnings summary)
- [ ] Requestor endpoints implemented (search, create booking, list bookings)
- [ ] Companion endpoints implemented (dashboard, alerts, alert preferences)
- [ ] Voice-to-profile streaming WebSocket (`en-US`/`zh-CN`) wired to AWS Transcribe Streaming via the `amazon-transcribe` Python SDK (boto3 does not support streaming), then to Qwen for JSON extraction
- [ ] Voice-to-profile batch path (`ms-MY`/`ta-IN`) wired to S3 presigned PUT + AWS Transcribe Batch + Qwen
- [ ] Redis (Tair) read-through cache for listing search results and session lookups
- [ ] Alibaba OSS for provider photo uploads
- [x] Frontend wired: every prototype mock helper replaced with the corresponding `src/services/api/endpoints/*` import; no behavior change — validated in Phase 5
- [ ] Live multi-cloud deployment: frontend on AWS S3+CloudFront (`ap-southeast-1`), backend on Alibaba ECS (`ap-southeast-3`), ApsaraDB Postgres, Tair Redis, Alibaba OSS, AWS S3 audio bucket, DashScope/Qwen account
- [x] Type extensions in `frontend/src/services/api/types.ts` for fields the prototype already renders but aren't in DTOs (`Listing.category/priceUnit/rating/reviewCount/halal/days/menu/matchScore/matchReason/distance`, `Booking.requestorInitials/portrait/qty/itemDescription`, etc.) — additive only; validated in Phase 5

### Out of Scope

- Real-time chat between requestor and elder — not in prototype, defer to v2
- Payment processing / payout integration — earnings figures are static; no Stripe/FPX integration
- Push notifications — companion alerts read-only in-app, no APNs/FCM
- Mobile-native app — web-first, mobile-shaped UI is enough for hackathon demo
- Admin / moderation surface — no admin role exists in the prototype
- Refresh-token flow — `expiresIn` is in the DTO but token refresh deferred to v2 (in-memory token is fine for demo)
- New product features — explicit constraint from user: do not add or change any UI feature
- Replacing browser SpeechRecognition fallback in `ElderVoice` — keep it as a non-WebSocket-capable fallback alongside the real WS path
- Translating companion alerts on the server — prototype stores `text_en/ms/zh/ta` per alert; backend will store all four and pick by user locale (no realtime translation service)

## Context

**Repository state at start of milestone:**
- Frontend: implemented, runnable (`cd frontend && npm install && npm run dev`). React 19 + TypeScript 5.8 + Vite 8. Lives in `frontend/`.
- Backend: empty. A scaffold (`backend/main.py`, `db.py`, `models.py`, `pyproject.toml`, `uv.lock`, `.env.example`) was deleted on the current `backend` branch — it's recoverable from commit `3de5f53` if useful as a reference, but we'll re-scaffold cleanly.
- Architecture doc: `MULTI-CLOUD-ARCHITECTURE.md` at the repo root (untracked) and `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` (committed). Both describe the same intent.
- Codebase mapping already done in `.planning/codebase/` — ARCHITECTURE.md, STACK.md, STRUCTURE.md, INTEGRATIONS.md, CONCERNS.md, CONVENTIONS.md, TESTING.md.

**Frontend prototype shape:**
- All UI lives in `frontend/src/prototype/*.jsx`. `App.tsx` is a 3-line re-export of `PrototypeApp.jsx`.
- Mock data in `frontend/src/prototype/mock-data.js`: `HERO_ELDER`, `PROVIDERS` (6 entries), `ELDER_LISTINGS`, `ELDER_BOOKINGS`, `ELDER_COMPLETED`, `REVIEWS`, `COMPANION_ALERTS`, `TIMELINE`, `PORTRAITS`.
- Demo login accounts in `PrototypeApp.jsx`: `DEMO_ACCOUNTS` array (Siti / Amir / Companion).
- Inline mock async helpers in `OnboardingFlow.jsx`: `apiRegister`, `apiInitiateKycSession`, `apiStartVerification`, `apiWaitForResult` — these need to be swapped for `src/services/api/endpoints/*` imports.
- API client (typed, ready to use, not yet wired): `src/services/api/{http,types,index}.ts` + `src/services/api/endpoints/{auth,elder,requestor,companion,kyc}.ts`.

**Multi-cloud split (per `MULTI-CLOUD-ARCHITECTURE.md`):**
- AWS (`ap-southeast-1`): S3+CloudFront for frontend; S3 audio bucket for batch ASR; Transcribe Streaming + Batch.
- Alibaba (`ap-southeast-3`): ECS for FastAPI; ApsaraDB PostgreSQL; Tair (Redis); OSS for provider photos; DashScope/Qwen for JSON extraction.
- PII isolation: batch audio never passes through the application server — browser uploads via presigned URLs.

**Known field gaps** (from `frontend/docs/API_READY_MIGRATION.md` — fields rendered by prototype but missing from the typed DTOs):
- `Listing` is missing `category`, `priceUnit`, `priceMax`, `rating`, `reviewCount`, `halal`, `titleMs/En/Zh/Ta`, `days`, `menu`, `matchScore`, `matchReason`, `distance`.
- `Booking` is missing `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`.
- `UserProfile` is missing `kycStatus`, `avatarUrl`, `area`, `age`, `phone`.
- `CompanionAlert` is missing `title`.

These need to be added to `types.ts` before swapping mock helpers — this is allowed under the "no UI changes" rule because the data already exists at runtime, the DTO just lags.

## Constraints

- **Tech stack (backend)**: FastAPI ≥0.136, SQLAlchemy 2.x async + asyncpg, `uv` for deps & lockfile, Python ≥3.12 — explicit user requirement
- **Tech stack (frontend)**: No changes — React 19 + TypeScript 5.8 + Vite 8, native `fetch` via existing `apiRequest<T>` wrapper. Do not introduce a router, state library, data-fetching library (TanStack Query, SWR), or CSS framework
- **Multi-cloud**: AWS + Alibaba split per `MULTI-CLOUD-ARCHITECTURE.md` is non-negotiable — it's the hackathon judging criterion
- **PII**: batch-ASR audio goes browser → AWS S3 directly via presigned URLs. Backend never sees raw bytes
- **Region**: AWS resources in `ap-southeast-1` (Singapore); Alibaba resources in `ap-southeast-3` (Malaysia)
- **API prefix**: `/api/v1` (frontend's `apiRequest` already prepends this)
- **Auth**: in-memory bearer token on the frontend (existing) — no localStorage/cookie persistence for v1
- **Languages**: must support all 4 locales end-to-end (`ms`, `en`, `zh`, `ta`); voice routing splits streaming (`en-US`/`zh-CN`) vs batch (`ms-MY`/`ta-IN`)
- **No frontend feature changes**: the only frontend edits permitted are (1) swapping mock helpers for typed-API imports, (2) extending `types.ts` additively, (3) connecting the WebSocket for voice in `ElderVoice`. UX, copy, layout, styling, navigation must not change.
- **Demo accounts must keep working**: the 3 hardcoded login chips on the prototype login screen continue to work after backend is wired (passwords seeded via bcrypt)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FastAPI + `uv` for backend | Explicit user requirement; matches deleted scaffold + README | — Pending |
| Re-scaffold backend (don't restore commit `3de5f53`) | Cleaner foundation; prior scaffold was stub-only | — Pending |
| Live multi-cloud deployment (real AWS + Alibaba) | Hackathon judging criterion; user picked "Live multi-cloud" | — Pending |
| Real AI features (Transcribe + Qwen) | User picked "Both, real" — keep frontend `SpeechRecognition` only as graceful fallback | — Pending |
| Real auth, seed DEMO_ACCOUNTS | User picked "Real auth, seeded users"; preserves prototype quick-login UX | — Pending |
| Postgres as system-of-record (not DynamoDB) | `MULTI-CLOUD-ARCHITECTURE.md` says Postgres; the lone DynamoDB JSDoc reference in `kyc.ts` is stale | — Pending |
| Use `amazon-transcribe` Python SDK for streaming ASR (not boto3) | boto3 has zero Transcribe Streaming support — `amazon-transcribe>=0.6.4` is the only Python option | — Pending |
| Use bcrypt directly (no `passlib`); pin `bcrypt>=4.2.0,<5.0.0` | bcrypt 5.0 (Sep 2025) silently breaks passlib's backend introspection with a misleading 72-byte error | — Pending |
| Centralise JWT decode in `core/security.py` with explicit `algorithms=["HS256"]` | CVE-2022-29217 / CVE-2024-33663 — algorithm-confusion bypass if any decode call omits the allowlist | — Pending |
| WebSocket handlers must `try/finally` end Transcribe session and a 90s max-session timer | Browser disconnect does not auto-close upstream stream — quota exhaustion risk during demo | — Pending |
| Companion alerts: store all 4 locales in DB, server picks by user locale | Matches existing `text_en/ms/zh/ta` shape; no realtime translation cost | — Pending |
| Additive type extensions in `types.ts` | Prototype already renders fields not in DTOs; backend will provide them | Validated in Phase 5 |
| Tair as read-through cache (not job queue) | `MULTI-CLOUD-ARCHITECTURE.md` decision | — Pending |
| Browser-direct S3 uploads via presigned PUT | PII off application logs; matches frontend's `kyc.ts uploadDocument` | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after Phase 5 completion*
