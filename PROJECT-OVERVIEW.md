# GingerGig Project Overview

GingerGig is a hyperlocal gig platform for Malaysian elders. Seniors can offer nearby services such as home cooking, traditional crafts, pet sitting, and light household help; requestors can discover and book them; companions can keep a lightweight view of an elder's activity, earnings, and care signals.

The current build started as a high-fidelity, mobile-shaped React prototype and is being turned into a real backend-backed application without changing the existing frontend feature set, layout, copy, or styling.

## Product Shape

The app has three personas:

- **Elder:** Manages listings, incoming bookings, earnings, profile, and voice-to-profile listing creation.
- **Requestor:** Searches local providers, views provider detail, and manages bookings.
- **Companion:** Watches an elder's dashboard, alerts, timeline, and alert preferences.

The UI is multilingual from day one, with Bahasa Malaysia, English, Chinese, and Tamil support. The design deliberately uses a warm elder-friendly visual system: larger body text, generous tap targets, a terracotta/cream palette, and calm language instead of growth-hacker metrics.

## Frontend Technologies

The frontend lives in `frontend/` and uses:

- **React 19** for UI rendering.
- **TypeScript 5.8** for typed app and API contracts.
- **Vite 8** for development server and production builds.
- **Native `fetch`** through the typed API wrapper in `frontend/src/services/api/http.ts`.
- **ESLint 9 and Prettier 3** for code quality and formatting.
- **CSS custom properties** and prototype CSS for the visual system; no router, state library, data-fetching library, or CSS framework is introduced.

Most UI code remains in `frontend/src/prototype/`. `App.tsx` re-exports the prototype shell, while `frontend/src/services/api/` provides typed endpoint modules for auth, elder, requestor, companion, KYC, and voice flows.

The frontend can run in mock mode or real API mode. In real mode, `VITE_API_BASE_URL` points at the FastAPI backend origin, and the HTTP client automatically prefixes `/api/v1`, injects `Authorization: Bearer <token>`, applies timeouts, and normalizes API errors.

## Backend Technologies

The backend lives in `backend/` and uses:

- **Python 3.12+** managed with **uv** and `uv.lock`.
- **FastAPI 0.136+** for REST and WebSocket endpoints.
- **Uvicorn standard extras** for ASGI serving and WebSocket support.
- **Pydantic v2** and **pydantic-settings** for DTOs and typed environment configuration.
- **SQLAlchemy 2 async ORM** with **asyncpg** for PostgreSQL access.
- **Alembic** for all schema changes; schema creation is migration-driven from day one.
- **PyJWT with crypto extras** for JWT issuance and verification.
- **bcrypt 4.2.x** directly for seeded password hashing; `passlib` is intentionally avoided.
- **pytest, pytest-asyncio, httpx, ruff, and mypy** for tests, async test clients, linting, formatting, and type checks.

The backend package is structured around clear boundaries:

- `routers/` exposes API endpoints under `/api/v1/*`.
- `schemas/` holds Pydantic request and response contracts.
- `services/` owns business logic and data orchestration.
- `models/` holds SQLAlchemy ORM models.
- `integrations/` wraps cloud SDK calls.
- `deps/` provides request-scoped dependencies such as auth and database sessions.
- `core/` centralizes settings, IDs, errors, enums, and security.

Database access is per request through `AsyncSession` dependencies. External clients are initialized through the FastAPI app lifecycle rather than as ad hoc per-request objects.

## Data Architecture

PostgreSQL is the system of record. The schema covers users, companion links, listings, listing menu items, bookings, reviews, companion alerts, alert preferences, timeline events, KYC sessions, and voice sessions.

Important data decisions:

- **Persona roles live in one `users` table** with an `elder`, `requestor`, or `companion` role.
- **Bookings denormalize display snapshots** such as requestor name, initials, avatar URL, listing title, quantity label, and item description so historical bookings survive later user or listing edits.
- **Locale-aware content uses explicit columns** for `ms`, `en`, `zh`, and `ta`, especially for listings, companion alerts, and timeline events.
- **Prototype data is seeded idempotently** from the original mock constants, including the Siti, Amir, and Faiz demo accounts with password `demo`.
- **API errors use one envelope:** `{status, message, detail?}`, matching the frontend's `ApiError` handling.

## API Architecture

All backend routes are mounted under `/api/v1`, matching the frontend API client. The main endpoint groups mirror the frontend service modules:

- `auth`: register, login, current user.
- `elder`: elder listings, bookings, booking responses, earnings summary.
- `requestor`: listing search, listing detail, create booking, requestor bookings.
- `companion`: dashboard, alerts, timeline, alert preferences.
- `voice`: voice-to-profile streaming, batch submission, and batch status.
- `kyc`: KYC contract surface retained for onboarding flows and future live verification.

Authentication uses bearer JWTs. Runtime decode is centralized in `core/security.py` with an explicit `algorithms=["HS256"]` allowlist and required `exp` and `sub` claims.

## Multi-Cloud Architecture

GingerGig is designed as a live multi-cloud demo:

- **AWS Singapore (`ap-southeast-1`)** owns the public frontend edge and audio AI services.
- **Alibaba Cloud Malaysia (`ap-southeast-3`)** owns the backend application and primary data plane.

Planned deployment responsibilities:

- **AWS S3 + CloudFront:** frontend hosting.
- **AWS S3 audio bucket:** browser-direct audio upload for batch ASR.
- **AWS Transcribe Streaming:** live ASR for English and Chinese.
- **AWS Transcribe Batch:** async ASR for Bahasa Malaysia and Tamil.
- **Alibaba ECS:** FastAPI backend container.
- **ApsaraDB PostgreSQL:** primary relational database.
- **Alibaba OSS:** provider photos and non-PII media.
- **DashScope/Qwen:** transcript-to-listing JSON extraction and matching intelligence.

The backend acts as the control plane and WebSocket proxy. Browser clients do not receive AWS credentials. For PII-heavy assets such as audio or identity images, the intended pattern is browser-direct upload to AWS S3 via presigned URLs so raw bytes do not pass through application logs.

## Voice-to-Profile Architecture

The voice feature has two language-dependent paths:

- **Streaming path:** `en-US` and `zh-CN` use a WebSocket from the browser to FastAPI. FastAPI bridges 16 kHz PCM audio to AWS Transcribe Streaming using the `amazon-transcribe` SDK, emits partial transcript updates, then sends the final transcript to Qwen for strict JSON extraction.
- **Batch path:** `ms-MY` and `ta-IN` use browser-recorded audio uploaded directly to S3. FastAPI starts an AWS Transcribe Batch job, tracks status, and sends the final transcript to the same Qwen extraction service.

Both paths produce a validated `ListingDraft`. Qwen responses are parsed as JSON, validated with Pydantic, and retried once with validation feedback if the first response is malformed.

## Build Approach

The implementation is phase-driven through the GSD planning workflow:

1. **Backend scaffold, schema, and seed:** FastAPI app, config, Alembic schema, and prototype seed data.
2. **Auth and bearer middleware:** demo accounts, JWT issuance, `/auth/register`, `/auth/login`, and `/auth/me`.
3. **Persona routers:** elder, requestor, and companion endpoints backed by Postgres.
4. **Voice-to-profile pipeline:** streaming and batch ASR plus Qwen listing extraction.
5. **Frontend wiring:** typed API imports replace mock helpers while preserving the shipped UI.
6. **Multi-cloud live deployment:** public CloudFront frontend, Alibaba ECS backend, managed database, object storage, and smoke-tested demo flow.

The core engineering principle is conservative integration: preserve the frontend experience, match existing DTOs and endpoint modules, keep routers thin, put business logic in services, isolate SDK plumbing in integration modules, and use migrations plus tests as the backend contract hardens.
