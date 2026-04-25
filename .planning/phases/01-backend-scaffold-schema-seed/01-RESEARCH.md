# Phase 1: Backend Scaffold + Schema + Seed - Research

**Researched:** 2026-04-25
**Domain:** FastAPI ≥0.136 + async SQLAlchemy 2 + asyncpg + Alembic, on Python 3.12+ via `uv`, against ApsaraDB Postgres in `ap-southeast-3` (cloud-only dev)
**Confidence:** HIGH

---

## Summary

This is a **pre-researched phase**. The umbrella research artefacts (`.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md`) already prescribed the stack at the package level; the user's `01-CONTEXT.md` then locked 23 implementation decisions on top of them. The job here is to translate those into the concrete code-shape the planner needs: the file tree, the engine/lifespan wiring, the 11-table schema with column-level types and constraints, the idempotent-seed and `SeedRefusedError` patterns, the per-test SAVEPOINT fixture, and the four success-criterion tests pinned in D-17.

There are **two areas where the umbrella docs and the locked context disagree**, and the locked context wins:
1. `ARCHITECTURE.md` proposed `id TEXT PRIMARY KEY` (e.g. `"siti"`, `"l1"`). CONTEXT.md D-07 overrides — every entity uses **UUID5 with `kind:slug`** and a single `GINGERGIG_NS = uuid5(NAMESPACE_DNS, "gingergig.my")` namespace. Schema columns become `id UUID PRIMARY KEY`.
2. `ARCHITECTURE.md` proposed Postgres `ENUM` types for `role`, `locale`, `kyc_status`, `bookings.status`. CONTEXT.md D-01 overrides — every constrained string is `VARCHAR + CHECK(... IN (...))` plus a Python `StrEnum` mirror in `app/core/enums.py`.

Three other CONTEXT.md decisions need explicit reflection in plans because they're not in the umbrella docs:
- **D-04:** `companion_links` is N:M with composite PK `(companion_user_id, elder_user_id)` — `ARCHITECTURE.md` had `id TEXT PRIMARY KEY` + `UNIQUE(...)`. CONTEXT.md wins; drop the surrogate.
- **D-02:** `kyc_sessions` carries **two `JSONB` columns** (`textract_raw`, `rekognition_raw`) **plus** first-class parsed columns (`ic_number`, `ic_name`, `ic_dob`, `similarity_score`, `confidence`, `decision`, `decision_reason`).
- **D-10/D-11:** Cloud-only dev. ApsaraDB Postgres is provisioned in **Phase 1**, not Phase 8. Two databases on one instance: `gingergig` (dev + judging demo) + `gingergig_test` (tests). TLS required.

**Primary recommendation:** Build the scaffold strictly to D-01..D-23. Don't deviate to "improve" any locked decision — every drift creates planner thrash. The cross-cutting pitfall mitigations (alembic-from-day-one, per-request `AsyncSession`, `debug=False` + global handler, `bcrypt>=4.2,<5`, region pin, no `passlib`/`python-jose`/`aioredis`/`oss2`) are non-negotiable and appear in the Don't Hand-Roll table.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema modelling**
- **D-01:** Constrained-string columns use `VARCHAR + CHECK(... IN (...))` + Python `StrEnum` mirror. **No native Postgres `ENUM` types.**
- **D-02:** `kyc_sessions` has two `JSONB` columns (`textract_raw`, `rekognition_raw`) **plus** first-class parsed columns (`ic_number`, `ic_name`, `ic_dob`, `similarity_score`, `confidence`, `decision`, `decision_reason`).
- **D-03:** `TimestampMixin` adds `created_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ` to **every** table — `server_default=func.now()`, `onupdate=func.now()`.
- **D-04:** `companion_links` is N:M with composite PK `(companion_user_id, elder_user_id)`. `companion_alert_preferences` keys on the same composite.
- **D-05:** Earnings are computed on-the-fly from `bookings` (no table, no view). `Asia/Kuala_Lumpur` calendar boundaries.

**Seed data source-of-truth**
- **D-06:** Mock data is **hand-ported once** from `frontend/src/prototype/mock-data.js` and `PrototypeApp.jsx::DEMO_ACCOUNTS` into a new Python module `backend/scripts/seed_data.py` as plain dicts.
- **D-07:** Deterministic IDs — single namespace + typed name: `GINGERGIG_NS = uuid.uuid5(uuid.NAMESPACE_DNS, "gingergig.my")`, then `entity_id(kind, slug) = uuid.uuid5(GINGERGIG_NS, f"{kind}:{slug}")`. The `kind:` prefix prevents cross-table slug collisions.
- **D-08:** Demo passwords use bcrypt `gensalt(rounds=12)`. Idempotent re-runs **preserve existing `password_hash`** via partial `ON CONFLICT (id) DO UPDATE SET ...` that excludes `password_hash`.
- **D-09:** All four locale strings (`text_ms`, `text_en`, `text_zh`, `text_ta`) for `companion_alerts` and `timeline_events` are hand-written in `seed_data.py`. Volume small (~10–15 entries each).

**Local dev infrastructure (cloud-only — no local Postgres)**
- **D-10:** No local Postgres / no docker-compose. Dev runs against ApsaraDB Postgres on Alibaba Cloud (`ap-southeast-3`).
- **D-11:** ApsaraDB Postgres instance is **provisioned in Phase 1** (not Phase 8). Phase 1 tasks include: create instance, set IP allowlist, enable SSL, create two databases on it — `gingergig` and `gingergig_test`.
- **D-12:** Single dev DB. Recovery: `alembic downgrade base && alembic upgrade head && ALLOW_SEED=1 python scripts/seed.py`.
- **D-13:** Tair (Redis) is **not** provisioned in Phase 1 — defer to Phase 6. No `REDIS_URL` in `.env.example` until then.
- **D-14:** App runs natively via `uv run uvicorn app.main:app --reload`. A `Dockerfile` is written in Phase 1 (Phase 8 needs it for ECS) but is not part of any local workflow.
- **D-15:** Task runner is a `Makefile` at `backend/Makefile`. Targets: `dev`, `migrate`, `migrate-new`, `seed`, `test`, `lint`, `format`, `typecheck`. **No `docker-compose`/`up`/`down` targets.**
- **D-16:** Alembic's `alembic/env.py` imports the same `pydantic-settings` `Settings` class — single source of truth for `DATABASE_URL`.

**Test scaffolding**
- **D-17:** Phase 1 ships exactly four tests pinned to the success criteria:
  1. `GET /health` → `200 {"status":"ok"}`
  2. `alembic upgrade head` against fresh `gingergig_test` applies cleanly and creates all 11 tables
  3. `python scripts/seed.py` (with `ALLOW_SEED=1`) is idempotent across two consecutive runs (row count + SHA-256 of canonical-form rows unchanged)
  4. A test route raising a deliberate exception returns the `ApiError` envelope with no Python traceback
- **D-18:** Tests run against `gingergig_test` on ApsaraDB. Once-per-session migration; per-test SAVEPOINT rollback.
- **D-19:** Test client is `httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")` — httpx ≥0.28 pattern.
- **D-20:** Lint+typing is `ruff` (lint+format) + `mypy`, wired through `make lint`/`make format`/`make typecheck`. `.pre-commit-config.yaml` committed but not auto-installed.

**Cross-cutting safety**
- **D-21:** `scripts/seed.py` refuses to run unless host is `localhost`/`127.0.0.1` or env `ALLOW_SEED=1` is set. `make seed` injects `ALLOW_SEED=1` inline. Bare `python scripts/seed.py` against an ApsaraDB DSN exits with `SeedRefusedError`.
- **D-22:** ApsaraDB connections require **TLS**. `Settings` exposes `DATABASE_URL` plus `DATABASE_SSL_MODE` (default `"require"`).
- **D-23:** Phase 1 includes ApsaraDB provisioning + IP allowlist + SSL + two-DB creation. Phase 8 deploy scope correspondingly shrinks.

### Claude's Discretion

- Listing pricing decimal precision (`numeric(10,2)` vs `int` cents) — research recommends `numeric(10,2)` (matches `ARCHITECTURE.md`; readable in psql; good enough for the prototype's whole-ringgit + half-ringgit values). Lock in plan.
- FK cascade rules — research recommends `ON DELETE RESTRICT` as default; explicit `ON DELETE CASCADE` only on (a) `companion_links` (when a user is removed, their pairings should disappear), (b) `listing_menu_items` (child of listing), (c) `companion_alert_preferences` (child of the link composite). All others restrict.
- `voice_sessions` schema — Phase 5 owns the heavy lifting; Phase 1 just creates the table with the columns named in CONTEXT.md `<decisions>`: `id`, `elder_id`, `language`, `mode` (`stream`/`batch`), `status`, `transcript`, `listing_draft JSONB`, `error`, `created_at`, `updated_at`.
- README install + onboarding text — write what reflects the Makefile + ApsaraDB workflow.

### Deferred Ideas (OUT OF SCOPE)

- **Tair / Redis provisioning** — stays in Phase 6.
- **Logging shape (JSON structured vs stdlib)** — defer to whenever production observability lands.
- **`/health/deep` (DB ping, Redis ping)** — defer to Phase 8.
- **Refresh-token flow** — explicit anti-feature.
- **Earnings materialised table or view** — rejected for v1.
- **App-in-Docker for local dev** — rejected; native uvicorn is faster. Dockerfile exists only for Phase 8 ECS.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | FastAPI app scaffolded with `uv` (Python ≥3.12), runs at `localhost:8000`, exposes `GET /health` returning `200 {"status":"ok"}` | §App Skeleton, §Code Examples #1 (lifespan), §Standard Stack |
| FOUND-02 | `pyproject.toml` declares the locked stack | §Standard Stack (full pin list) |
| FOUND-03 | All routers mounted under `/api/v1/*`; CORS configured to accept frontend origin (no `*`) | §Code Examples #2 (CORS allowlist) |
| FOUND-04 | Module layout mirrors frontend: `routers/{auth,elder,requestor,companion,kyc,voice}.py`, `services/`, `models/`, `schemas/`, `integrations/`, `core/`, `deps/`, `db.py`, `main.py` | §Architecture Patterns (concrete file tree) |
| FOUND-05 | Pydantic-settings reads typed config from environment | §Code Examples #3 (Settings) + §Specifics (.env.example) |
| FOUND-06 | Global exception handler returns `{status, message, detail?}` matching `ApiError`; `debug=False` in production | §Code Examples #4 (exception handlers) |
| FOUND-07 | Per-request `AsyncSession` via `Depends(get_db)`; engine + clients are process-singletons built in `lifespan` | §Code Examples #5 (engine + get_db) |
| DATA-01 | Postgres schema migrated via Alembic (no `Base.metadata.create_all`); covers all 11 tables | §Schema Sketch (column-level for all 11) |
| DATA-02 | `users` schema includes id, email, phone, password_hash, name, role, locale, kyc_status, area, age, avatar_url, created_at | §Schema Sketch §1 |
| DATA-03 | `listings` preserves every field the prototype renders + 1:N `listing_menu_items` | §Schema Sketch §3, §4 |
| DATA-04 | `bookings` denormalises requestor + listing snapshot fields | §Schema Sketch §5 |
| DATA-05 | `companion_alerts` and `timeline_events` store all four locales as columns | §Schema Sketch §7, §9 |
| DATA-06 | Seed script idempotently loads every prototype constant via `ON CONFLICT (id) DO UPDATE` | §Code Examples #7 (idempotent seed) |
| DATA-07 | The 3 `DEMO_ACCOUNTS` seeded with bcrypt password hashes; quick-login chips work | §Code Examples #8 (preserving password_hash) |

---

## Architectural Responsibility Map

Phase 1 is single-tier (backend only). The frontend is not touched.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Receive HTTP requests at `/api/v1/*` | FastAPI app on uvicorn (Backend) | — | Single-process ASGI; Phase 8 will front this with Alibaba SLB |
| Persist canonical state (users, listings, bookings, etc.) | ApsaraDB Postgres (Database) | — | System of record per PROJECT.md |
| Apply schema migrations | Alembic CLI invoked from Makefile (Tooling) | Postgres | Per-DDL-version revisions; replayable |
| Seed mock data | `scripts/seed.py` invoked from Makefile (Tooling) | Postgres | Idempotent upserts; refuses non-localhost without `ALLOW_SEED=1` |
| Validate request/response envelopes | FastAPI + Pydantic (Backend) | — | Contract with frontend's `apiRequest<T>` |
| Surface `ApiError` envelope on failure | FastAPI exception handlers (Backend) | — | Matches frontend `http.ts::parseError` |
| Configure runtime (DB DSN, CORS, JWT secret slot) | `pydantic-settings` reading `.env` (Backend) | — | Single Settings class shared by app + Alembic env.py |
| Run async test suite | pytest + pytest-asyncio + httpx ASGITransport (Tooling) | `gingergig_test` DB | Per-test SAVEPOINT rollback |

**Tier-correctness check for the planner:** Nothing in Phase 1 should leak into the Browser/Frontend tier. Auth verification, KYC pipeline, voice handlers — all Phase 2+ territory. Phase 1's `routers/{auth,elder,...}.py` are stubs that mount but return `501 Not Implemented` (or empty handlers) so route paths are reserved.

---

## Standard Stack

All versions verified against PyPI as of 2026-04-25 in the umbrella `STACK.md` `[VERIFIED: PyPI 2026-04-25]`. Re-verify before locking in plan via `npm view`-equivalent: `uv pip index versions <pkg>` or `pip index versions <pkg>`.

### Core Runtime

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | `>=3.12,<3.14` | Language runtime | User-locked. 3.12 stabilised TaskGroup; pin `<3.14` to avoid surprise C-ext breaks during the hackathon. `[VERIFIED: STACK.md]` |
| `fastapi` | `>=0.136.1` | HTTP + WebSocket framework | User-locked. Native WS support. `[VERIFIED: STACK.md, PyPI]` |
| `uvicorn[standard]` | `>=0.46.0` | ASGI server | `[standard]` extra pulls `httptools`/`uvloop`/`websockets`/`watchfiles` — required for production WS perf and `--reload`. Plain `uvicorn` is too bare. `[VERIFIED: STACK.md]` |
| `sqlalchemy[asyncio]` | `>=2.0.49` | Async ORM | User-locked. SQLAlchemy 2.x typed Mapped[]/`mapped_column()` API. `[VERIFIED: STACK.md]` |
| `asyncpg` | `>=0.31.0` | Postgres driver | User-locked. Pairs with SQLAlchemy 2 via `postgresql+asyncpg://`. **Do not** also install `psycopg2`. `[VERIFIED: STACK.md]` |
| `pydantic` | `>=2.13.3` | Request/response models | FastAPI 0.136 requires Pydantic v2. `[VERIFIED: STACK.md]` |
| `pydantic-settings` | `>=2.14.0` | Env / config loading | Replaces v1 `BaseSettings`; reads `.env` directly (no separate `python-dotenv`). `[VERIFIED: STACK.md]` |
| `alembic` | `>=1.18.4` | DB migrations | Use `alembic init -t async migrations` to scaffold an asyncpg-aware env. `[VERIFIED: STACK.md]` |
| `email-validator` | `>=2.3.0` | Pydantic `EmailStr` support | Required transitively when DTOs use `EmailStr`. `[VERIFIED: STACK.md]` |
| `python-multipart` | `>=0.0.26` | FastAPI form-data parsing | Lazy-imported by FastAPI; needed once any form route exists. Phase 2 will use it for login form, but pin in Phase 1 so the lockfile is stable. `[VERIFIED: STACK.md]` |

### Pinned Now for Downstream Phases (so `uv.lock` is stable)

Per ROADMAP success criterion 5: Phase 1 must pin the non-obvious deps so downstream phases inherit a locked tree.

| Library | Version | Used by Phase | Why Phase 1 Pins It |
|---------|---------|---------------|---------------------|
| `boto3` | `>=1.42.96` | 4, 5 (KYC + voice batch) | Avoid resolver thrash later. `[VERIFIED: STACK.md]` |
| `amazon-transcribe` | `>=0.6.4` | 5 (voice streaming) | Separate awslabs SDK — boto3 cannot do streaming. Pinning now per ROADMAP. `[VERIFIED: PITFALLS Pitfall 2, STACK.md]` |
| `alibabacloud-oss-v2` | `>=1.2.5` | 4, 5 (provider photo + audio paths via OSS) | V2 SDK; V1 sigs deprecated 2025-03-01 for new accounts. `[VERIFIED: STACK.md]` |
| `openai` | `>=2.32.0` | 5 (Qwen via DashScope OpenAI-compatible mode) | `[VERIFIED: STACK.md]` |
| `redis` | `>=7.4.0` | 6 (Tair) | `redis.asyncio` is the merged successor to abandoned `aioredis`. Pinned now per ROADMAP even though Phase 6 actually uses it. `[VERIFIED: STACK.md]` |
| `pyjwt[crypto]` | `>=2.12.1` | 2 (auth) | FastAPI moved off python-jose in 2024. `[VERIFIED: STACK.md]` |
| `bcrypt` | `>=4.2.0,<5.0.0` | 2 (auth) + Phase 1 seed (D-08) | bcrypt 5.0 silently breaks any code that does backend introspection (passlib trap). **Phase 1 actually uses this — seeded password hashes.** `[VERIFIED: PITFALLS, STACK.md]` |

### Development Tooling

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `uv` | `>=0.6.3` (local already satisfies) | Package manager + lockfile | STACK.md recommends `>=0.11.7`; local install is `0.6.3` (verified `[VERIFIED: bash command]`) which still supports `[dependency-groups]`. Plan should NOT force a `uv` upgrade. |
| `ruff` | `>=0.15.12` | Lint + format | Replaces black + isort + flake8. `[VERIFIED: STACK.md]` |
| `mypy` | `>=1.13.0` | Type-checking | Not in STACK.md table but D-20 mandates it. **`[ASSUMED]` version pin — verify before locking.** |
| `pytest` | `>=9.0.3` | Test runner | `[VERIFIED: STACK.md]` |
| `pytest-asyncio` | `>=1.3.0` | Async test fixtures | Use `asyncio_mode = "auto"`. `[VERIFIED: STACK.md]` |
| `httpx` | `>=0.28.1` | Test client | `ASGITransport(app=app)` pattern (D-19). `[VERIFIED: STACK.md]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `alembic` async template | Hand-rolled DDL or `Base.metadata.create_all` | Forbidden by D-01 / DATA-01 / Pitfall 10. **Don't.** |
| `pydantic-settings` | `python-dotenv` + manual `os.environ` parsing | pydantic-settings already does this with type validation. STACK.md flags `python-dotenv` alone as redundant. |
| `pyjwt` | `python-jose` | Phase 2 concern, but pinned in Phase 1. python-jose was unmaintained (CVE-2024-33663). PyJWT is the active path. |
| `bcrypt` (direct) | `passlib[bcrypt]` | Forbidden — passlib reads bcrypt's removed `__about__` and breaks. **Don't.** |
| `alibabacloud-oss-v2` | `oss2` | Legacy V1-sig SDK. New accounts can't use V1 since 2025-03-01. |
| `psycopg2` alongside asyncpg | — | Two Postgres drivers cause URL/dialect ambiguity. Use asyncpg only. (psycopg3 with name `psycopg` is fine if a sync driver is ever needed; do not add for Phase 1.) |

### Installation

```bash
cd backend
uv init --package gingergig-api --python ">=3.12,<3.14"

uv add 'fastapi>=0.136.1' 'uvicorn[standard]>=0.46.0' \
       'sqlalchemy[asyncio]>=2.0.49' 'asyncpg>=0.31.0' \
       'pydantic>=2.13.3' 'pydantic-settings>=2.14.0' \
       'alembic>=1.18.4' 'email-validator>=2.3.0' 'python-multipart>=0.0.26' \
       'boto3>=1.42.96' 'amazon-transcribe>=0.6.4' \
       'alibabacloud-oss-v2>=1.2.5' 'openai>=2.32.0' 'redis>=7.4.0' \
       'pyjwt[crypto]>=2.12.1' 'bcrypt>=4.2.0,<5.0.0'

uv add --dev 'ruff>=0.15.12' 'mypy>=1.13.0' \
             'pytest>=9.0.3' 'pytest-asyncio>=1.3.0' 'httpx>=0.28.1'
```

**Version verification:** Re-confirm each pin at plan time. PyPI versions verified in the umbrella STACK.md on 2026-04-25 (today's date) so the data is fresh for this phase, but a re-check costs 30 seconds and prevents a surprise:

```bash
for pkg in fastapi sqlalchemy asyncpg uvicorn pydantic pydantic-settings alembic \
           boto3 amazon-transcribe alibabacloud-oss-v2 openai redis pyjwt bcrypt \
           ruff mypy pytest pytest-asyncio httpx; do
    uv pip index versions "$pkg" 2>/dev/null | head -1
done
```

---

## Architecture Patterns

### System Architecture Diagram (Phase 1 only)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Developer machine (laptop)                                                 │
│                                                                            │
│  $ make dev   ──────►  uv run uvicorn app.main:app --reload --port 8000   │
│  $ make migrate ────►  uv run alembic upgrade head                        │
│  $ make seed  ──────►  ALLOW_SEED=1 uv run python scripts/seed.py         │
│  $ make test  ──────►  uv run pytest -q (against gingergig_test)          │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │ FastAPI app (app.main:app)                                       │      │
│  │                                                                   │      │
│  │  request flow:                                                    │      │
│  │  HTTP ──► CORSMiddleware ──► Router (/api/v1/...) ──► Pydantic    │      │
│  │           (allowlist)         (auth/elder/...)        validate    │      │
│  │                                  │                                │      │
│  │                                  ▼                                │      │
│  │                              service func ──► AsyncSession        │      │
│  │                                                (get_db dep)       │      │
│  │                                                  │                │      │
│  │                                                  ▼                │      │
│  │                                              SQL via asyncpg      │      │
│  │                                                                   │      │
│  │  error flow:                                                      │      │
│  │  raise ──► global exception handler ──► JSONResponse              │      │
│  │            ({status, message, detail?})                           │      │
│  │                                                                   │      │
│  │  lifespan:                                                        │      │
│  │  startup ──► create_async_engine(DATABASE_URL, ssl=...) ──►       │      │
│  │             stash on app.state.engine                             │      │
│  │  shutdown ──► engine.dispose()                                    │      │
│  └────────────┬─────────────────────────────────────────────────────┘      │
│               │                                                            │
└───────────────┼────────────────────────────────────────────────────────────┘
                │  TLS (DATABASE_SSL_MODE=require)
                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ApsaraDB PostgreSQL — Alibaba Cloud, ap-southeast-3 (KL)                   │
│                                                                            │
│   ┌──────────────────────┐         ┌──────────────────────┐                │
│   │ database: gingergig  │         │ database: gingergig_test │             │
│   │   (dev + judging)    │         │   (per-test SAVEPOINT)   │             │
│   │                      │         │                      │                │
│   │   11 tables, all     │         │   same schema,       │                │
│   │   migrated via       │         │   same migrations    │                │
│   │   alembic            │         │                      │                │
│   └──────────────────────┘         └──────────────────────┘                │
└────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (FOUND-04 — locked by CONTEXT.md ↔ ARCHITECTURE.md)

```
backend/
├── pyproject.toml                  # uv-managed; version pins per Standard Stack
├── uv.lock                         # commit
├── .env.example                    # see "Pydantic Settings" section
├── .env                            # gitignored; dev fills locally
├── alembic.ini                     # minimal; DSN comes from env.py
├── Dockerfile                      # for Phase 8 ECS only; not used locally (D-14)
├── Makefile                        # task runner (D-15)
├── README.md                       # install + Makefile + ApsaraDB workflow
├── .pre-commit-config.yaml         # committed but opt-in (D-20)
├── alembic/
│   ├── env.py                      # imports app.core.config.Settings (D-16)
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_schema.py  # all 11 tables in one revision
├── scripts/
│   ├── __init__.py
│   ├── seed.py                     # entry; refuses non-localhost without ALLOW_SEED=1 (D-21)
│   └── seed_data.py                # plain dicts hand-ported from mock-data.js (D-06, D-09)
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI(), lifespan, CORS, exception handlers, router includes
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Settings(BaseSettings) — single source of truth
│   │   ├── enums.py                # StrEnum mirrors of CHECK constraints (D-01)
│   │   ├── ids.py                  # GINGERGIG_NS + entity_id(kind, slug) (D-07)
│   │   └── errors.py               # ApiError envelope + handler registration
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                 # DeclarativeBase + naming_convention
│   │   └── session.py              # async_engine builder, async_sessionmaker, get_db
│   ├── models/                     # SQLAlchemy 2 ORM (Mapped[], mapped_column)
│   │   ├── __init__.py             # re-exports for Alembic autogenerate
│   │   ├── _mixins.py              # TimestampMixin (D-03)
│   │   ├── user.py                 # User
│   │   ├── companion.py            # CompanionLink, CompanionAlert, CompanionAlertPreference, TimelineEvent
│   │   ├── listing.py              # Listing, ListingMenuItem
│   │   ├── booking.py              # Booking, Review
│   │   ├── kyc.py                  # KycSession
│   │   └── voice.py                # VoiceSession
│   ├── schemas/                    # Pydantic DTOs (Phase 1 ships shells; Phase 2+ fills)
│   │   ├── __init__.py
│   │   └── common.py               # ApiError, HealthResponse
│   ├── deps/
│   │   ├── __init__.py
│   │   └── db.py                   # get_db (yields AsyncSession)
│   ├── routers/                    # all six files exist; bodies are stubs in Phase 1
│   │   ├── __init__.py
│   │   ├── health.py               # GET /health (no /api/v1 prefix per D-17 #1)
│   │   ├── auth.py                 # stub
│   │   ├── elder.py                # stub
│   │   ├── requestor.py            # stub
│   │   ├── companion.py            # stub
│   │   ├── kyc.py                  # stub
│   │   └── voice.py                # stub
│   ├── services/                   # empty placeholder package; phase 2+ fills
│   │   └── __init__.py
│   └── integrations/               # empty placeholder package; phases 4-5 fill
│       └── __init__.py
└── tests/
    ├── __init__.py
    ├── conftest.py                 # session engine, function SAVEPOINT, AsyncClient
    ├── test_health.py              # D-17 #1
    ├── test_migrations.py          # D-17 #2
    ├── test_seed_idempotency.py    # D-17 #3
    └── test_error_envelope.py      # D-17 #4 (registers a /tests/__boom test route)
```

> Empty `services/` and `integrations/` packages are intentional — they reserve the import paths so Phase 2+ adds files without restructuring. CLAUDE.md requires the `services/` directory; Phase 1 leaves it empty with `__init__.py`.

> The deleted scaffold (`git show 3de5f53:backend/`) used `routes/` and a flat layout. **Discard it.** ARCHITECTURE.md is the authority and chose `routers/` matching FastAPI's official tutorial. STRUCTURE.md notes the deleted scaffold is a "negative reference" (re: `allow_origins=["*"]` and empty `models.py`).

### Pattern 1: Process-Singleton Engine, Per-Request Session (FOUND-07)

**What:** Build the async engine once in `lifespan(app)`, stash on `app.state.engine`, and yield a fresh `AsyncSession` per request via `Depends(get_db)`.

**When to use:** Every protected and unprotected route. **Forbidden alternative:** module-level `AsyncSession` — see Pitfall 8 in PITFALLS.md (concurrent-request connection corruption).

**Example:** see Code Examples #5 below.

### Pattern 2: VARCHAR + CHECK + StrEnum Mirror (D-01)

**What:** For every constrained string (`role`, `locale`, `kyc_status`, `bookings.status`, `kyc_sessions.status`, `voice_sessions.status`, etc.) declare:
1. The Postgres column as `VARCHAR(N) NOT NULL CHECK (col IN ('a','b','c'))`
2. A Python `StrEnum` in `app/core/enums.py` whose values match the CHECK list
3. The SQLAlchemy column type as `Mapped[UserRole]` with `mapped_column(String(16), CHECK constraint via __table_args__)`

**When to use:** All seven constrained-string columns listed in CONTEXT.md D-01. Adding a new value later costs one `ALTER TABLE` + one Python literal — no `ALTER TYPE … ADD VALUE` rebuild dance.

**Example:** Code Examples #6.

### Pattern 3: TimestampMixin on Every Table (D-03)

**What:** A reusable mixin in `app/models/_mixins.py` adds `created_at` and `updated_at` columns with `server_default=func.now()` and `onupdate=func.now()`. Every model inherits from `Base, TimestampMixin`.

**When to use:** All 11 tables. The composite-PK `companion_links` and `companion_alert_preferences` get the mixin too.

### Pattern 4: Composite-PK N:M Tables (D-04)

**What:** `companion_links` has primary key `(companion_user_id, elder_user_id)` — no surrogate `id`. SQLAlchemy 2 expresses this via two `mapped_column(..., primary_key=True)`. `companion_alert_preferences` keys on the same composite, both columns being foreign keys to `users.id`.

**When to use:** Both tables. Diverges from `ARCHITECTURE.md` which had a surrogate `id` — CONTEXT.md wins.

### Pattern 5: Two-JSONB-Plus-Parsed-Columns on `kyc_sessions` (D-02)

**What:** Keep raw provenance (`textract_raw JSONB NULL`, `rekognition_raw JSONB NULL`) **and** the parsed fields the API consumes (`ic_number TEXT NULL`, `ic_name TEXT NULL`, `ic_dob DATE NULL`, `similarity_score NUMERIC(5,2) NULL`, `confidence NUMERIC(5,2) NULL`, `decision VARCHAR + CHECK NULL`, `decision_reason TEXT NULL`).

**When to use:** Only `kyc_sessions`. Phase 4 fills the columns; Phase 1 just creates them all NULL-able with the right types.

### Anti-Patterns to Avoid

- **`Base.metadata.create_all()`** — silently no-ops on column adds. Forbidden. Use Alembic from day one (Pitfall 10).
- **Module-level `AsyncSession`** — concurrent-task connection corruption (Pitfall 8).
- **Postgres `ENUM` types** — `ALTER TYPE … ADD VALUE` is awkward and forbids cleanup; CONTEXT.md D-01 vetoes it.
- **`allow_origins=["*"]`** — the deleted scaffold did this. Don't. Hard-code the allowlist (Pitfall 19, FOUND-03).
- **`debug=True`** — leaks tracebacks (Pitfall 20). Default to False; never read from env in v1.
- **`uvicorn --workers 4`** — forces shared connection contention; FastAPI's value-add is async, not multi-process. Use `--workers 1` for dev (Pitfall 9).
- **Rolling your own `from_url()` engine builder ignoring SSL** — TLS to ApsaraDB is required (D-22). Configure asyncpg explicitly (Code Examples #5).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema management | `Base.metadata.create_all()` or hand-rolled DDL | `alembic` async template | Pitfall 10. First column-add silently fails. |
| Password hashing | A wrapper over `hashlib` or `passlib` | `bcrypt>=4.2,<5` direct | passlib breaks against bcrypt 5; bcrypt 5 broke `__about__`. Pin and call `bcrypt.gensalt(rounds=12)` / `bcrypt.hashpw` directly. |
| JWT decode (Phase 2 concern, but Phase 1 keeps the pin) | `python-jose` or hand-rolled HMAC | `pyjwt[crypto]>=2.12.1` | Algorithm-confusion bypass (Pitfall 3). |
| Redis client (Phase 6 concern; pinned now) | `aioredis` | `redis>=7.4` (`redis.asyncio`) | aioredis is abandoned; merged into redis-py. |
| OSS upload (Phase 4-5 concern; pinned now) | `oss2` | `alibabacloud-oss-v2>=1.2.5` | V1 sig deprecated 2025-03-01. |
| Transcribe streaming (Phase 5; pinned now) | `boto3.client("transcribe").start_stream_transcription(...)` | `amazon-transcribe>=0.6.4` | boto3 has no streaming. AttributeError on import. |
| Env loading | `os.environ` parsing | `pydantic-settings` `BaseSettings` | Type validation, defaults, `.env` reading built-in. |
| Async DB session per request | A global `session = AsyncSession()` | `Depends(get_db)` yielding from `async_sessionmaker(...)` | Concurrent-request data corruption (Pitfall 8). |
| Idempotent seed | `try: insert except IntegrityError: pass` | `pg_insert(...).on_conflict_do_update(...)` | Existing rows get refreshed, not skipped, and re-runs are deterministic (Pitfall 11). |
| UUID generation per row | `uuid.uuid4()` everywhere | `entity_id(kind, slug)` using `uuid5(GINGERGIG_NS, ...)` | Deterministic IDs survive seed re-runs (D-07). |
| Connection-pool tuning | Default SQLAlchemy `pool_size=5, max_overflow=10` × `--workers 4` | `pool_size=10, max_overflow=5, pool_pre_ping=True, pool_recycle=1800`, single worker | Pitfall 9 (pool exhaustion + ApsaraDB connection limit). |
| Test client | `starlette.testclient.TestClient` | `httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")` | D-19 mandates async-end-to-end on httpx ≥0.28. |
| Pre-commit auto-install | A `setup.sh` that runs `pre-commit install` for everyone | Commit `.pre-commit-config.yaml`, document `pre-commit install` in README | D-20: developer opt-in. |
| Local Postgres bootstrapping | docker-compose with a Postgres container | ApsaraDB-only — no local DB | D-10/D-13/D-15: zero local infra. |

**Key insight:** Phase 1 is largely "wire well-known libraries together correctly." Every cell in this table is a place where an experienced engineer will reach for the wrong thing on autopilot. The plan must explicitly flag these as forbidden in task descriptions.

---

## Schema Sketch (DATA-01..05) — Column-Level for All 11 Tables

Conventions applied to every table:
- `id UUID PRIMARY KEY DEFAULT NULL` (no Postgres `gen_random_uuid()` default — IDs are produced by `app/core/ids.py::entity_id` for seeded data and `uuid4()` for runtime-created data; the model layer assigns).
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` via `TimestampMixin` (D-03). Composite-PK tables get them too.
- All FKs `ON DELETE RESTRICT` unless otherwise stated. Cascades only on the three places listed under "Claude's Discretion" above.
- All money columns: `NUMERIC(10,2) NOT NULL` (Claude's Discretion lock).
- Constrained strings: `VARCHAR(N) + CHECK (col IN (...))`, paired with a `StrEnum` (D-01).
- Locale columns are 4 separate `TEXT` columns (`*_ms`, `*_en`, `*_zh`, `*_ta`) — never JSONB.
- All FKs target `users(id)` use `users.id UUID`; same for cross-table.

### 1. `users` (DATA-02)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK; `entity_id("user", slug)` for seeded |
| `email` | VARCHAR(254) | NOT NULL | — | `UNIQUE`; lowercase pre-stored at app layer |
| `phone` | VARCHAR(20) | NULL | — | E.164 |
| `password_hash` | VARCHAR(60) | NOT NULL | — | bcrypt output is exactly 60 bytes |
| `name` | VARCHAR(120) | NOT NULL | — | Display name; "Makcik Siti" |
| `role` | VARCHAR(16) | NOT NULL | — | CHECK IN (`elder`,`requestor`,`companion`); StrEnum `UserRole` |
| `locale` | VARCHAR(2) | NOT NULL | `'en'` | CHECK IN (`ms`,`en`,`zh`,`ta`); StrEnum `Locale` |
| `kyc_status` | VARCHAR(16) | NOT NULL | `'not_started'` | CHECK IN (`not_started`,`pending`,`approved`,`failed`,`manual_review`) |
| `area` | VARCHAR(120) | NULL | — | "Kepong, Kuala Lumpur" |
| `age` | SMALLINT | NULL | — | |
| `avatar_url` | TEXT | NULL | — | randomuser.me URL or future OSS key |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `UNIQUE(email)`; `INDEX(role)`; `INDEX(locale)`.

> Note vs ARCHITECTURE.md: drops `full_name`, `initials`, `tone` columns. The frontend computes initials from `name`; `tone` is per-listing not per-user. CLAUDE.md says bookings denormalise `requestor_initials` (so it's stored on the booking, not the user). Keep the `users` table tighter; computed/extra fields go where they're consumed.

### 2. `companion_links` (D-04)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `companion_user_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `elder_user_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `relationship` | VARCHAR(40) | NULL | — | Free-form: "daughter", "son", etc. |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Primary key: `(companion_user_id, elder_user_id)` — composite; no surrogate `id`.
Indexes: PK already covers `(companion_user_id, elder_user_id)`; add `INDEX(elder_user_id)` for reverse lookups.

### 3. `listings` (DATA-03)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK; `entity_id("listing", slug)` |
| `elder_id` | UUID | NOT NULL | — | FK → `users(id)` |
| `category` | VARCHAR(32) | NOT NULL | — | CHECK IN (`cat_cooking`,`cat_crafts`,`cat_pet`,`cat_household`,`cat_other`); StrEnum `ListingCategory` |
| `title_ms` | TEXT | NOT NULL | — | |
| `title_en` | TEXT | NOT NULL | — | |
| `title_zh` | TEXT | NULL | — | |
| `title_ta` | TEXT | NULL | — | |
| `description` | TEXT | NOT NULL | — | Single-locale free-text |
| `price` | NUMERIC(10,2) | NOT NULL | — | Lower bound when range; single price otherwise |
| `price_max` | NUMERIC(10,2) | NULL | — | NULL when single price |
| `price_unit` | VARCHAR(16) | NOT NULL | — | CHECK IN (`per_meal`,`per_hour`,`per_day`,`per_month`,`per_visit`,`per_piece`,`per_box`); StrEnum `PriceUnit` |
| `currency` | VARCHAR(3) | NOT NULL | `'MYR'` | CHECK (currency = 'MYR') |
| `halal` | BOOLEAN | NOT NULL | `FALSE` | |
| `rating` | NUMERIC(3,2) | NOT NULL | `0` | |
| `review_count` | INTEGER | NOT NULL | `0` | |
| `is_active` | BOOLEAN | NOT NULL | `TRUE` | |
| `days` | TEXT[] | NOT NULL | `'{}'` | `['Mon','Tue',...]`; matches prototype |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(elder_id)`; `INDEX(category, is_active) WHERE is_active`.

> Notes: `matchScore`, `matchReason`, `distance` are NOT stored — Phase 3 computes them at search time. `dietary_tags` deferred to a later phase (Phase 5 Qwen path). Dropped vs ARCHITECTURE.md to keep Phase 1 minimal.

### 4. `listing_menu_items` (DATA-03)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK |
| `listing_id` | UUID | NOT NULL | — | FK → `listings(id)` ON DELETE CASCADE |
| `name` | VARCHAR(120) | NOT NULL | — | "Rendang Daging" |
| `price` | NUMERIC(10,2) | NOT NULL | — | |
| `sort_order` | SMALLINT | NOT NULL | `0` | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(listing_id, sort_order)`.

### 5. `bookings` (DATA-04)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK |
| `listing_id` | UUID | NOT NULL | — | FK → `listings(id)` (RESTRICT — keep historical) |
| `requestor_user_id` | UUID | NOT NULL | — | FK → `users(id)` (RESTRICT) |
| `requestor_name` | VARCHAR(120) | NOT NULL | — | **Snapshot** |
| `requestor_initials` | VARCHAR(4) | NOT NULL | — | **Snapshot** |
| `requestor_avatar_url` | TEXT | NULL | — | **Snapshot** |
| `listing_title` | TEXT | NOT NULL | — | **Snapshot** (locale-dependent: pick at create-time per requestor's locale) |
| `quantity_label` | VARCHAR(60) | NOT NULL | — | "2 portions" |
| `item_description` | TEXT | NULL | — | Optional note |
| `notes` | TEXT | NULL | — | Requestor's free-form |
| `scheduled_at` | TIMESTAMPTZ | NOT NULL | — | |
| `amount` | NUMERIC(10,2) | NOT NULL | — | |
| `currency` | VARCHAR(3) | NOT NULL | `'MYR'` | |
| `status` | VARCHAR(16) | NOT NULL | — | CHECK IN (`pending`,`confirmed`,`completed`,`cancelled`); StrEnum `BookingStatus` |
| `completed_at` | TIMESTAMPTZ | NULL | — | Set when status → completed |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(listing_id, status)`; `INDEX(requestor_user_id, status)`; partial `INDEX(completed_at) WHERE status='completed'` (earnings query — D-05).

### 6. `reviews` (DATA-03 §rating + denormalised review_count)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK |
| `booking_id` | UUID | NULL | — | FK → `bookings(id)`; NULL for seeded |
| `listing_id` | UUID | NOT NULL | — | FK → `listings(id)` ON DELETE CASCADE |
| `author_user_id` | UUID | NULL | — | FK → `users(id)`; NULL for seeded |
| `author_name` | VARCHAR(120) | NOT NULL | — | "Amir R." |
| `rating` | SMALLINT | NOT NULL | — | CHECK BETWEEN 1 AND 5 |
| `body` | TEXT | NOT NULL | — | |
| `relative_date` | VARCHAR(40) | NULL | — | "2 weeks ago" — pre-formatted display |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(listing_id, created_at DESC)`.

### 7. `companion_alerts` (DATA-05)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK |
| `elder_user_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `kind` | VARCHAR(16) | NOT NULL | — | CHECK IN (`care`,`celebration`); maps DTO type. ARCHITECTURE.md had a wider set; DTO is narrow — go with DTO |
| `severity` | VARCHAR(16) | NOT NULL | `'info'` | CHECK IN (`info`,`warning`,`critical`) |
| `title_ms` | TEXT | NOT NULL | — | All four locales required (D-09 small volume) |
| `title_en` | TEXT | NOT NULL | — | |
| `title_zh` | TEXT | NOT NULL | — | |
| `title_ta` | TEXT | NOT NULL | — | |
| `text_ms` | TEXT | NOT NULL | — | |
| `text_en` | TEXT | NOT NULL | — | |
| `text_zh` | TEXT | NOT NULL | — | |
| `text_ta` | TEXT | NOT NULL | — | |
| `read_at` | TIMESTAMPTZ | NULL | — | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(elder_user_id, created_at DESC)`.

### 8. `companion_alert_preferences` (D-04, COMP-04)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `companion_user_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `elder_user_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `inactivity_24h` | BOOLEAN | NOT NULL | `TRUE` | |
| `overwork_signals` | BOOLEAN | NOT NULL | `TRUE` | |
| `earnings_milestones` | BOOLEAN | NOT NULL | `TRUE` | |
| `new_bookings` | BOOLEAN | NOT NULL | `TRUE` | |
| `reviews` | BOOLEAN | NOT NULL | `TRUE` | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Primary key: `(companion_user_id, elder_user_id)` — composite, mirrors `companion_links`.

### 9. `timeline_events` (DATA-05)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK |
| `elder_user_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `occurred_at` | TIMESTAMPTZ | NOT NULL | — | |
| `relative_label` | VARCHAR(60) | NULL | — | "Today, 4:20 PM" — pre-formatted |
| `event_type` | VARCHAR(40) | NULL | — | `booking_confirmed`,`listing_posted`,`review_received`,etc. |
| `related_id` | UUID | NULL | — | Soft FK (no constraint) |
| `text_ms` | TEXT | NOT NULL | — | All four locales (D-09) |
| `text_en` | TEXT | NOT NULL | — | |
| `text_zh` | TEXT | NOT NULL | — | |
| `text_ta` | TEXT | NOT NULL | — | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(elder_user_id, occurred_at DESC)`.

### 10. `kyc_sessions` (D-02; Phase 4 owns the writes)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK; surfaced to frontend as `sessionId` |
| `user_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `ic_front_s3_key` | TEXT | NULL | — | Bucket key only; bytes never seen |
| `ic_back_s3_key` | TEXT | NULL | — | |
| `selfie_s3_key` | TEXT | NULL | — | |
| `status` | VARCHAR(16) | NOT NULL | `'not_started'` | CHECK IN (`not_started`,`pending`,`approved`,`failed`,`manual_review`) |
| `job_id` | UUID | NULL | — | Frontend polls this |
| `ic_number` | VARCHAR(20) | NULL | — | Parsed; `YYMMDD-PB-####` |
| `ic_name` | VARCHAR(120) | NULL | — | Parsed |
| `ic_dob` | DATE | NULL | — | Parsed |
| `similarity_score` | NUMERIC(5,2) | NULL | — | Rekognition 0..100 |
| `confidence` | NUMERIC(5,2) | NULL | — | Textract 0..100 |
| `decision` | VARCHAR(16) | NULL | — | CHECK IN (`approved`,`failed`,`manual_review`); only set on terminal states |
| `decision_reason` | TEXT | NULL | — | Free-text or enum-coded reason |
| `textract_raw` | JSONB | NULL | — | Provenance |
| `rekognition_raw` | JSONB | NULL | — | Provenance |
| `started_at` | TIMESTAMPTZ | NULL | — | |
| `completed_at` | TIMESTAMPTZ | NULL | — | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(user_id, created_at DESC)`; `INDEX(job_id) WHERE job_id IS NOT NULL`.

### 11. `voice_sessions` (Phase 5 owns; Phase 1 just creates the table per Claude's Discretion bullet)

| Column | Type | Null? | Default | Notes |
|--------|------|-------|---------|-------|
| `id` | UUID | NOT NULL | — | PK |
| `elder_id` | UUID | NOT NULL | — | FK → `users(id)` ON DELETE CASCADE |
| `language` | VARCHAR(8) | NOT NULL | — | CHECK IN (`en-US`,`zh-CN`,`ms-MY`,`ta-IN`) |
| `mode` | VARCHAR(8) | NOT NULL | — | CHECK IN (`stream`,`batch`) |
| `status` | VARCHAR(16) | NOT NULL | `'recording'` | CHECK IN (`recording`,`transcribing`,`extracting`,`ready`,`saved`,`failed`) |
| `transcript` | TEXT | NULL | — | Phase 5 fills |
| `listing_draft` | JSONB | NULL | — | Qwen output |
| `error` | TEXT | NULL | — | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | TimestampMixin |

Indexes: `INDEX(elder_id, created_at DESC)`.

> **Coverage check:** All 11 tables match DATA-01's enumeration verbatim: `users`, `companion_links`, `listings`, `listing_menu_items`, `bookings`, `reviews`, `companion_alerts`, `companion_alert_preferences`, `timeline_events`, `kyc_sessions`, `voice_sessions`.

---

## Code Examples

All examples are derived from the umbrella `ARCHITECTURE.md`, `STACK.md`, and the SQLAlchemy 2 / FastAPI / Alembic / pydantic-settings official docs cited in `Sources`. Confidence: HIGH.

### #1: `app/main.py` skeleton

```python
# Source: ARCHITECTURE.md §1; FastAPI lifespan docs
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.session import build_engine, dispose_engine
from app.routers import auth, companion, elder, health, kyc, requestor, voice


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = build_engine(settings)
    yield
    await dispose_engine(app.state.engine)


app = FastAPI(
    title="GingerGig API",
    version="0.1.0",
    debug=False,                            # Pitfall 20 — never True in any env
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,    # parsed from CSV; first entry localhost:5173
    allow_credentials=False,                # bearer token, no cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

API = "/api/v1"
app.include_router(health.router)                       # /health, no prefix
app.include_router(auth.router,      prefix=API)
app.include_router(elder.router,     prefix=API)
app.include_router(requestor.router, prefix=API)
app.include_router(companion.router, prefix=API)
app.include_router(kyc.router,       prefix=API)
app.include_router(voice.router,     prefix=API)
```

### #2: CORS allowlist parsing in Settings

```python
# Source: pydantic-settings v2 docs (model_config + field_validator)
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database (D-22)
    database_url: str = Field(..., description="postgresql+asyncpg://... DSN")
    database_ssl_mode: str = Field(default="require", description="asyncpg ssl arg")

    # Auth (Phase 2 fills, Phase 1 reads to validate length)
    jwt_secret: str = Field(..., min_length=32)

    # CORS (FOUND-03 — allowlist, not "*")
    cors_origins_csv: str = Field(default="http://localhost:5173")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_csv.split(",") if o.strip()]

    # Cloud creds (Phase 4-5 use; Phase 1 just declares so .env.example is complete)
    aws_region: str = Field(default="ap-southeast-1")
    aws_access_key_id: str = Field(default="")
    aws_secret_access_key: str = Field(default="")
    s3_kyc_bucket: str = Field(default="")
    s3_audio_bucket: str = Field(default="")

    dashscope_api_key: str = Field(default="")
    dashscope_base_url: str = Field(
        default="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    )

    oss_region: str = Field(default="ap-southeast-3")
    oss_access_key_id: str = Field(default="")
    oss_access_key_secret: str = Field(default="")
    oss_bucket: str = Field(default="")
    oss_endpoint: str = Field(default="")


settings = Settings()  # module-level singleton
```

### #3: `.env.example`

```bash
# === Database (D-22) ===
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST.rds.aliyuncs.com:5432/gingergig
DATABASE_SSL_MODE=require

# === Auth ===
# Generate: python -c "import secrets; print(secrets.token_urlsafe(64))"
JWT_SECRET=change_me_min_32_chars_use_secrets_token_urlsafe_64_bytes_strongly

# === CORS (FOUND-03 — never "*") ===
# Comma-separated. First entry must be the Vite dev server.
CORS_ORIGINS_CSV=http://localhost:5173

# === AWS (ap-southeast-1; Phase 4-5 use) ===
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_KYC_BUCKET=
S3_AUDIO_BUCKET=

# === DashScope / Qwen (Phase 5) ===
DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# === Alibaba OSS (ap-southeast-3; Phase 4-5) ===
OSS_REGION=ap-southeast-3
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_ENDPOINT=
# REDIS_URL deliberately absent — Tair is Phase 6 (D-13).
```

### #4: Global exception handlers (FOUND-06)

```python
# Source: FastAPI exception handler docs; frontend http.ts::parseError
import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _envelope(status: int, message: str, detail: Any | None = None) -> JSONResponse:
    body: dict[str, Any] = {"status": status, "message": message}
    if detail is not None:
        body["detail"] = detail
    return JSONResponse(status_code=status, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return _envelope(exc.status_code, exc.detail or "Request failed")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _envelope(422, "Validation failed", detail=exc.errors())

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # PII hygiene: log full exception, surface only sanitised message.
        logger.exception("unhandled", extra={"path": request.url.path})
        return _envelope(500, "Internal server error")
```

> Frontend's `parseError(response)` produces `{status, message, detail}` from response body's JSON. The handler above guarantees that shape from any uncaught path. **Test D-17 #4** registers a `GET /tests/__boom` route that raises `RuntimeError("kaboom")` and asserts the response has no `Traceback` substring and matches `{status: 500, message: "Internal server error"}`.

### #5: Engine + `get_db` (FOUND-07)

```python
# Source: SQLAlchemy 2 async docs; asyncpg SSL options
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def build_engine(s) -> AsyncEngine:
    # asyncpg accepts ssl via connect_args; "require" enables TLS without cert verification
    # which is the right default for ApsaraDB until a CA bundle is set up (Phase 8 hardens).
    connect_args: dict = {}
    if s.database_ssl_mode == "require":
        connect_args["ssl"] = "require"
    elif s.database_ssl_mode == "disable":
        connect_args["ssl"] = False

    return create_async_engine(
        s.database_url,
        echo=False,
        pool_size=10,           # Pitfall 9
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args=connect_args,
    )


_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,   # required for FastAPI; lazy attrs after commit
        )
    return _sessionmaker


async def dispose_engine(engine: AsyncEngine) -> None:
    await engine.dispose()


# app/deps/db.py
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    sm = get_sessionmaker(request.app.state.engine)
    async with sm() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

> **TLS note:** asyncpg accepts an `ssl` keyword in `connect_args`. Values: `True`, `False`, `"require"`, or an `ssl.SSLContext`. ApsaraDB ships a CA bundle but the simple `"require"` value is fine for dev (encryption without server-cert verification). Phase 8 may tighten to a verified context with the ApsaraDB-provided CA. `[CITED: asyncpg connection docs; SQLAlchemy asyncpg dialect docs]`

### #6: SQLAlchemy 2 model with TimestampMixin + StrEnum + CHECK

```python
# Source: SQLAlchemy 2 declarative docs; mapped_column docs
from datetime import datetime
from enum import StrEnum
from typing import Annotated
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# app/db/base.py
class Base(DeclarativeBase):
    metadata_naming_convention = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }


# app/models/_mixins.py
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )


# app/core/enums.py
class UserRole(StrEnum):
    elder = "elder"
    requestor = "requestor"
    companion = "companion"

class Locale(StrEnum):
    ms = "ms"
    en = "en"
    zh = "zh"
    ta = "ta"

class KycStatus(StrEnum):
    not_started = "not_started"
    pending = "pending"
    approved = "approved"
    failed = "failed"
    manual_review = "manual_review"


# app/models/user.py
class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('elder','requestor','companion')",
            name="role_in_enum",
        ),
        CheckConstraint(
            "locale IN ('ms','en','zh','ta')",
            name="locale_in_enum",
        ),
        CheckConstraint(
            "kyc_status IN ('not_started','pending','approved','failed','manual_review')",
            name="kyc_status_in_enum",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    locale: Mapped[str] = mapped_column(String(2), nullable=False, server_default="en")
    kyc_status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="not_started"
    )
    area: Mapped[str | None] = mapped_column(String(120))
    age: Mapped[int | None]
    avatar_url: Mapped[str | None]
```

### #7: UUID5 helper (D-07)

```python
# Source: CONTEXT.md D-07
# app/core/ids.py
import uuid

GINGERGIG_NS: uuid.UUID = uuid.uuid5(uuid.NAMESPACE_DNS, "gingergig.my")


def entity_id(kind: str, slug: str) -> uuid.UUID:
    """Deterministic UUID5 for seeded entities.

    The "kind:" prefix prevents cross-table slug collisions
    (e.g. listing "siti" vs user "siti").
    """
    if not kind or not slug:
        raise ValueError("kind and slug are both required")
    return uuid.uuid5(GINGERGIG_NS, f"{kind}:{slug}")


# Usage:
#   entity_id("user", "siti")            -> deterministic UUID5
#   entity_id("listing", "siti-listing-1")
#   entity_id("booking", "siti-b1")
```

### #8: Idempotent seed with `password_hash` preservation (D-08, D-21)

```python
# Source: SQLAlchemy 2 postgresql.dml.insert + on_conflict_do_update
# scripts/seed.py
import asyncio
import os
import sys
from urllib.parse import urlparse

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.ids import entity_id
from app.db.session import build_engine, get_sessionmaker
from app.models.user import User
from scripts import seed_data


class SeedRefusedError(RuntimeError):
    """Raised when seed.py is invoked against a non-localhost DSN without ALLOW_SEED=1."""


_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _check_safety(database_url: str) -> None:
    if os.environ.get("ALLOW_SEED") == "1":
        return
    host = urlparse(database_url).hostname or ""
    if host in _LOCAL_HOSTS:
        return
    raise SeedRefusedError(
        f"Refusing to seed against {host!r}; set ALLOW_SEED=1 to override "
        "(make seed already does this for you)."
    )


def _hash_password(plaintext: str) -> str:
    import bcrypt
    return bcrypt.hashpw(
        plaintext.encode("utf-8"), bcrypt.gensalt(rounds=12)
    ).decode("ascii")


async def _seed_users(session: AsyncSession) -> None:
    rows = []
    for u in seed_data.DEMO_USERS:                # plain dicts from seed_data.py
        rows.append({
            "id": entity_id("user", u["slug"]),
            "email": u["email"],
            "phone": u.get("phone"),
            "password_hash": _hash_password(u["password"]),
            "name": u["name"],
            "role": u["role"],
            "locale": u["locale"],
            "kyc_status": u.get("kyc_status", "not_started"),
            "area": u.get("area"),
            "age": u.get("age"),
            "avatar_url": u.get("avatar_url"),
        })

    stmt = pg_insert(User).values(rows)
    # D-08: re-runs preserve existing password_hash (don't re-hash deterministically)
    stmt = stmt.on_conflict_do_update(
        index_elements=[User.id],
        set_={
            "email": stmt.excluded.email,
            "phone": stmt.excluded.phone,
            "name": stmt.excluded.name,
            "role": stmt.excluded.role,
            "locale": stmt.excluded.locale,
            "kyc_status": stmt.excluded.kyc_status,
            "area": stmt.excluded.area,
            "age": stmt.excluded.age,
            "avatar_url": stmt.excluded.avatar_url,
            # password_hash: deliberately omitted — preserves existing hash on re-run
            "updated_at": pg_insert(User).excluded.updated_at,  # bumps timestamp
        },
    )
    await session.execute(stmt)


async def main() -> int:
    _check_safety(settings.database_url)

    engine = build_engine(settings)
    sm = get_sessionmaker(engine)
    try:
        async with sm() as session:
            async with session.begin():     # one transaction for the whole seed
                await _seed_users(session)
                # ...other tables in FK order: listings → menu_items → bookings → reviews
                #                              companion_links → companion_alerts → ...
    finally:
        await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
```

### #9: pytest async fixtures with SAVEPOINT rollback (D-18, D-19)

```python
# Source: pytest-asyncio docs; SQLAlchemy "Joining a Session into an external transaction"
# tests/conftest.py
import asyncio
import os
from collections.abc import AsyncIterator

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.db.session import build_engine
from app.deps.db import get_db
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Single event loop for the whole test session.

    pytest-asyncio 1.x strict mode requires this when using session-scoped async fixtures.
    """
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    # Force the test DSN regardless of .env (CI may set it).
    test_settings = settings.model_copy(update={
        "database_url": os.environ["TEST_DATABASE_URL"],   # ...rds.../gingergig_test
    })
    engine = build_engine(test_settings)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncIterator[AsyncSession]:
    """Per-test SAVEPOINT rollback (D-18)."""
    async with engine.connect() as conn:
        trans = await conn.begin()
        sm = async_sessionmaker(bind=conn, expire_on_commit=False)
        async with sm() as session:
            await session.begin_nested()         # SAVEPOINT
            try:
                yield session
            finally:
                await trans.rollback()           # discards all writes


@pytest_asyncio.fixture
async def client(db_session) -> AsyncIterator[httpx.AsyncClient]:
    """ASGITransport client — D-19."""
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

### #10: Alembic async `env.py`

```python
# Source: Alembic async template (alembic init -t async); SQLAlchemy 2 docs
# alembic/env.py (key bits)
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import AsyncEngine, async_engine_from_config
from sqlalchemy import pool

from app.core.config import settings
from app.db.base import Base
from app.models import (  # noqa: F401  — registers all models on Base.metadata
    user, listing, booking, companion, kyc, voice,
)

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable: AsyncEngine = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

### #11: Makefile (D-15)

```makefile
# backend/Makefile — task runner; no docker-compose targets (D-15)
SHELL := /bin/bash
.PHONY: dev migrate migrate-new seed test lint format typecheck

dev:
	uv run uvicorn app.main:app --reload --port 8000

migrate:
	uv run alembic upgrade head

migrate-new:
	@if [ -z "$(MSG)" ]; then echo "Usage: make migrate-new MSG=\"add foo column\""; exit 1; fi
	uv run alembic revision --autogenerate -m "$(MSG)"

seed:
	ALLOW_SEED=1 uv run python scripts/seed.py

test:
	uv run pytest -q

lint:
	uv run ruff check .

format:
	uv run ruff format .

typecheck:
	uv run mypy app
```

### #12: Dockerfile (D-14 — Phase 8 use only)

```dockerfile
# Multi-stage uv build; non-root; Phase 8 ECS target.
# Source: astral-sh/uv official Dockerfile examples
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /usr/local/bin/
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN uv sync --frozen --no-dev

FROM base AS runtime
RUN useradd --create-home --shell /usr/sbin/nologin gingergig
WORKDIR /app
COPY --from=builder --chown=gingergig:gingergig /app /app
ENV PATH="/app/.venv/bin:$PATH"
USER gingergig
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Common Pitfalls

These are the Phase-1-relevant entries from the umbrella `PITFALLS.md`. Tasks/verification steps must explicitly check for each.

### Pitfall A: `Base.metadata.create_all` instead of Alembic (PITFALLS #10)
**What goes wrong:** First column-add silently doesn't exist in the DB. Subtle null-everywhere bugs.
**How to avoid:** Initialise Alembic with the async template (`alembic init -t async alembic`). Generate `0001_initial_schema.py` from the SQLAlchemy models; commit it. Run `make migrate` (`alembic upgrade head`) at every dev startup.
**Warning signs:** Any `Base.metadata.create_all()` call; no `alembic.ini`.

### Pitfall B: Module-level `AsyncSession` (PITFALLS #8)
**What goes wrong:** `asyncpg.exceptions.InterfaceError: cannot perform operation: another operation is in progress` under concurrent requests.
**How to avoid:** Engine in `lifespan`; `get_db` in `app/deps/db.py` yields a per-request session via `async_sessionmaker(...)`. Code Examples #5.
**Warning signs:** `grep -r "AsyncSession(" app/ scripts/` returning matches outside `app/db/session.py`.

### Pitfall C: `passlib` + `bcrypt>=5.0` (PITFALLS, STACK)
**What goes wrong:** Misleading "password longer than 72 bytes" error; auth is silently broken.
**How to avoid:** Pin `bcrypt>=4.2.0,<5.0.0` and call bcrypt directly. **No passlib in `pyproject.toml`.**
**Warning signs:** `passlib` ever appears in `uv.lock`; `bcrypt>=5` ever resolves.

### Pitfall D: `python-jose` for JWT (PITFALLS #3)
**What goes wrong:** Phase 2 issue, but Phase 1 pins the dep tree. Algorithm-confusion bypass.
**How to avoid:** `pyjwt[crypto]>=2.12.1` only.
**Warning signs:** `python-jose` in `pyproject.toml` or `uv.lock`.

### Pitfall E: `aioredis` (PITFALLS, STACK)
**What goes wrong:** Pulls in deprecated transitive deps; abandoned package.
**How to avoid:** `redis>=7.4.0` only. (Phase 6 actually uses it; Phase 1 just pins.)
**Warning signs:** `aioredis` in lockfile.

### Pitfall F: `oss2` for new code (PITFALLS, STACK)
**What goes wrong:** V1 sigs deprecated 2025-03-01 for new accounts; uploads fail.
**How to avoid:** `alibabacloud-oss-v2>=1.2.5`.
**Warning signs:** `oss2` in lockfile.

### Pitfall G: `boto3` for Transcribe Streaming (PITFALLS #2)
**What goes wrong:** AttributeError on `start_stream_transcription`. boto3 has no streaming.
**How to avoid:** `amazon-transcribe>=0.6.4` pinned in Phase 1 even though Phase 5 uses it.
**Warning signs:** Plan adds boto3-only deps and forgets `amazon-transcribe`.

### Pitfall H: Region drift (PITFALLS #6)
**What goes wrong:** AWS clients default to `us-east-1`; cross-region egress costs and latency.
**How to avoid:** `Settings.aws_region = "ap-southeast-1"` defaulted; `.env.example` makes it explicit.
**Warning signs:** No region pin in Settings; `boto3.Session().region_name` is `None`.

### Pitfall I: `allow_origins=["*"]` (PITFALLS #19)
**What goes wrong:** Token theft surface; the deleted scaffold did this.
**How to avoid:** `Settings.cors_origins_csv` parsed to a list; first entry `http://localhost:5173`.
**Warning signs:** Any `*` in CORS config; `allow_credentials=True` (we don't use cookies).

### Pitfall J: `debug=True` (PITFALLS #20)
**What goes wrong:** Tracebacks (potentially containing IC numbers in Phase 4) leak to clients.
**How to avoid:** `FastAPI(debug=False)` hard-coded; never read `debug` from env.
**Warning signs:** `debug=settings.debug` pattern; tests #4 fails (response body contains "Traceback").

### Pitfall K: Seed FK ordering and re-run unsafety (PITFALLS #11)
**What goes wrong:** Naive `INSERT` order throws `ForeignKeyViolationError`; re-runs blow up on uniques.
**How to avoid:** Order: `users → companion_links → listings → listing_menu_items → bookings → reviews → companion_alerts → companion_alert_preferences → timeline_events → kyc_sessions → voice_sessions`. Use `pg_insert(...).on_conflict_do_update(...)` everywhere. Wrap entire seed in one transaction.
**Warning signs:** Any `try/except IntegrityError: pass` in seed; second `make seed` fails.

### Pitfall L: Connection-pool sizing (PITFALLS #9)
**What goes wrong:** ApsaraDB free/small tier connection cap (~100) hit easily. Default `pool_size=5` × `--workers 4` × multiple devs and CI = exhaustion.
**How to avoid:** `pool_size=10, max_overflow=5, pool_pre_ping=True, pool_recycle=1800` (Code Examples #5). Single `--workers 1` for dev. No PgBouncer in Phase 1.
**Warning signs:** `QueuePool limit … reached` in logs.

### Pitfall M: Missing TLS config for ApsaraDB (D-22)
**What goes wrong:** Connection refused or insecure plaintext to ApsaraDB.
**How to avoid:** `connect_args={"ssl": "require"}` for asyncpg. `Settings.database_ssl_mode` defaults to `"require"`.
**Warning signs:** Direct connection works locally but fails on first push (not applicable here — no local dev) or `ssl` keyword absent in connect_args.

### Pitfall N: `password_hash` clobbered on idempotent re-seed (D-08)
**What goes wrong:** Each `make seed` regenerates a different hash (bcrypt salt is random); existing rows get a new hash; "demo" still works (bcrypt is salt-aware) but row hashes drift, hurting test determinism.
**How to avoid:** `pg_insert(User).on_conflict_do_update(set_={...})` with `password_hash` deliberately omitted from the update set. Code Examples #8.
**Warning signs:** Test #3 (idempotency SHA-256) fails on second run; users.password_hash changes between two `make seed` calls.

---

## Runtime State Inventory

This is a greenfield phase (re-scaffold); the prior `backend/` was deleted on this branch. Including this section to confirm "nothing to migrate":

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — backend was empty before this milestone. ApsaraDB instance does not exist yet (provisioned by this phase). | None — fresh schema only. |
| Live service config | None — no n8n / Datadog / Tailscale / Cloudflare in scope for this project. | None. |
| OS-registered state | None — no Task Scheduler / pm2 / launchd / systemd registrations from prior work. | None. |
| Secrets and env vars | `JWT_SECRET` is new. `AWS_*`, `DASHSCOPE_API_KEY`, `OSS_*` referenced now but consumed Phases 4-5. | Add to `.env.example` only; user fills locally. |
| Build artifacts / installed packages | None — no `backend/.venv` or `backend/uv.lock` exists yet. | None. |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `uv` | All `make *` targets | ✓ | 0.6.3 | — (STACK.md recommends ≥0.11.7 but 0.6.3 supports `[dependency-groups]` and is fine) |
| Python 3.12+ | Project runtime | ✗ system | 3.9.6 system; `uv` provisions 3.12+ from `.python-version` | `uv python install 3.12` (uv handles automatically) |
| `psql` CLI | Manual DB inspection (optional) | ✓ | 14.19 | — (any psql ≥13 works against PG ≥14) |
| `docker` | **Not used in Phase 1** (D-14); only for Phase 8 image build verification | ✓ | 29.3.1 | — |
| Git | Commits | ✓ | (system) | — |
| Outbound TCP 5432 to ApsaraDB | Required for dev once DB is provisioned | unknown — depends on user's network | — | If blocked, document that ApsaraDB-side IP allowlist must include the dev machine's egress IP (D-11). |
| ApsaraDB Postgres instance | All DB work | **✗ — must be provisioned in this phase (D-11/D-23)** | — | None — phase task explicitly creates it. |

**Missing dependencies with no fallback:** ApsaraDB instance — but that's a Phase 1 deliverable, not a blocker.

**Missing dependencies with fallback:** System Python is 3.9; `uv` will provision 3.12+ on first `uv sync`. The plan must include a `.python-version` file with `3.12` so `uv` resolves correctly without a manual `uv python install 3.12`.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` per `.planning/config.json`. Phase 1 ships test infrastructure for the whole project; downstream phases extend.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 9.x + pytest-asyncio 1.x |
| Config file | `pyproject.toml` `[tool.pytest.ini_options]` (`asyncio_mode = "auto"`); `tests/conftest.py` for fixtures |
| Quick run command | `make test` (= `uv run pytest -q`) |
| Full suite command | `make test` (Phase 1 has only ~4 tests; entire suite is "quick") |
| Coverage | not pinned in Phase 1 (defer to a later phase if useful) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `GET /health` returns `200 {"status":"ok"}` | smoke | `pytest tests/test_health.py::test_health_ok -x` | ❌ Wave 0 |
| FOUND-02 | Locked deps install + pyproject pins are correct | unit | `pytest tests/test_dependencies.py::test_pinned_versions -x` | ❌ Wave 0 (optional — see Sampling Rate note) |
| FOUND-03 | `/api/v1` prefix mounted; CORS allowlist not `*` | unit | `pytest tests/test_health.py::test_cors_allowlist_not_wildcard -x` | ❌ Wave 0 |
| FOUND-04 | Module layout exists | structure | `pytest tests/test_structure.py::test_module_layout -x` (asserts package paths importable) | ❌ Wave 0 (optional) |
| FOUND-05 | Settings reads `.env`; required fields raise on miss | unit | `pytest tests/test_settings.py::test_required_fields_error -x` | ❌ Wave 0 (optional) |
| FOUND-06 | Exception handler returns ApiError envelope, no traceback | integration | `pytest tests/test_error_envelope.py::test_unhandled_returns_envelope -x` | ❌ Wave 0 (D-17 #4) |
| FOUND-07 | `get_db` yields per-request session; engine is singleton | integration | `pytest tests/test_db_session.py::test_per_request_session -x` | ❌ Wave 0 (optional) |
| DATA-01 | `alembic upgrade head` applies cleanly; 11 tables exist | integration | `pytest tests/test_migrations.py::test_upgrade_creates_eleven_tables -x` | ❌ Wave 0 (D-17 #2) |
| DATA-02..05 | Schema matches Schema Sketch (column types, CHECK constraints, denorm fields, locale columns) | integration | `pytest tests/test_migrations.py::test_users_columns`, `test_listings_columns`, `test_bookings_denormalised_fields`, `test_locale_columns_on_alerts_and_timeline` | ❌ Wave 0 (extends D-17 #2; recommended) |
| DATA-06 | Seed runs idempotently; second run leaves identical state | integration | `pytest tests/test_seed_idempotency.py::test_two_runs_no_drift -x` | ❌ Wave 0 (D-17 #3) |
| DATA-07 | 3 demo accounts seeded; bcrypt password verifies | integration | `pytest tests/test_seed_idempotency.py::test_demo_accounts_password_demo -x` | ❌ Wave 0 (extends D-17 #3) |

> **Per CONTEXT.md D-17, the four pinned tests are the minimum.** The expanded grid above is what the verifier should ideally check; if Wave 0 only ships the four, that's compliant. The plan should at minimum include the four; extending to schema-shape tests is recommended.

### Sampling Rate

- **Per task commit:** `make test` (Phase 1 suite is fast — all four pinned tests run in <10s including ApsaraDB round-trip).
- **Per wave merge:** `make test` (same; entire suite at this stage).
- **Phase gate:** Full suite green + manual smoke `make dev` then `curl http://localhost:8000/health` returns `{"status":"ok"}`, before `/gsd-verify-work`.

### Wave 0 Gaps

Required (the four pinned tests in D-17):

- [ ] `tests/conftest.py` — session engine fixture against `gingergig_test`, function-scoped SAVEPOINT rollback, `httpx.AsyncClient(transport=ASGITransport(app=app))` client. Code Examples #9.
- [ ] `tests/test_health.py` — covers FOUND-01 (`{"status":"ok"}`) and FOUND-03 (CORS allowlist not `*`).
- [ ] `tests/test_migrations.py` — covers DATA-01 (alembic upgrade against fresh `gingergig_test`, asserts the 11 tables exist).
- [ ] `tests/test_seed_idempotency.py` — covers DATA-06/07 (two `make seed` calls; row count + SHA-256 of canonical-form rows unchanged; password verification with bcrypt + plaintext "demo").
- [ ] `tests/test_error_envelope.py` — covers FOUND-06 (registers `GET /tests/__boom` test route that raises `RuntimeError`; asserts `response.json() == {"status": 500, "message": "Internal server error"}` and `"Traceback" not in response.text`).
- [ ] Framework install: already in dev group via `uv add --dev pytest pytest-asyncio httpx`.

Recommended (DATA-02..05 schema-shape tests): listed above as optional.

---

## Sources

### Primary (HIGH confidence)

- `/Users/user/repos/GingerGig/.planning/phases/01-backend-scaffold-schema-seed/01-CONTEXT.md` — 23 locked decisions
- `/Users/user/repos/GingerGig/.planning/research/STACK.md` — pinned versions verified against PyPI 2026-04-25
- `/Users/user/repos/GingerGig/.planning/research/ARCHITECTURE.md` — module layout, schema starting point, lifespan + per-request session pattern
- `/Users/user/repos/GingerGig/.planning/research/PITFALLS.md` — 20 cross-cutting pitfalls; this RESEARCH.md tags A through N for Phase 1
- `/Users/user/repos/GingerGig/.planning/research/SUMMARY.md` — overall direction
- `/Users/user/repos/GingerGig/.planning/REQUIREMENTS.md` §Foundation, §Database & Seed
- `/Users/user/repos/GingerGig/.planning/ROADMAP.md` Phase 1 success criteria
- `/Users/user/repos/GingerGig/MULTI-CLOUD-ARCHITECTURE.md` — cloud topology (note its `AnalyzeID` claim is wrong per PITFALLS #1, but irrelevant to Phase 1)
- `/Users/user/repos/GingerGig/CLAUDE.md` (root) — API prefix, `ApiError` envelope, locale columns, denorm pattern, demo accounts
- `/Users/user/repos/GingerGig/frontend/src/services/api/types.ts` — `ApiError`, `KycStatus`, `UserRole`, `Locale` shapes the backend mirrors
- `/Users/user/repos/GingerGig/frontend/src/services/api/http.ts` — `parseError(response)` envelope shape `{status, message, detail}`
- `/Users/user/repos/GingerGig/frontend/src/prototype/PrototypeApp.jsx` lines 72-97 — `DEMO_ACCOUNTS` shape (siti / amir / faiz; password `demo`)
- `/Users/user/repos/GingerGig/frontend/src/prototype/mock-data.js` — seed source-of-truth shape (HERO_ELDER, PROVIDERS×6, listings, bookings, reviews, alerts, timeline, portraits)
- `/Users/user/repos/GingerGig/.planning/codebase/STRUCTURE.md` — backend structure deleted on this branch; planner re-scaffolds

### Secondary (MEDIUM confidence — official docs)

- [SQLAlchemy 2 ORM tutorial — Declarative + Mapped + mapped_column](https://docs.sqlalchemy.org/en/20/orm/quickstart.html) `[CITED]`
- [SQLAlchemy 2 async docs](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) — engine, sessionmaker, expire_on_commit `[CITED]`
- [SQLAlchemy postgresql.dml.insert + on_conflict_do_update](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#insert-on-conflict-upsert) `[CITED]`
- [SQLAlchemy "Joining a Session into an external transaction"](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites) — SAVEPOINT pattern for tests `[CITED]`
- [Alembic async template](https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic) `[CITED]`
- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/) — startup/shutdown via async context manager `[CITED]`
- [FastAPI exception handlers](https://fastapi.tiangolo.com/tutorial/handling-errors/) `[CITED]`
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/) `[CITED]`
- [pydantic-settings v2](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) — BaseSettings + SettingsConfigDict + env_file `[CITED]`
- [asyncpg connection options](https://magicstack.github.io/asyncpg/current/api/index.html#asyncpg.connection.connect) — `ssl` keyword values (`True`, `"require"`, `SSLContext`) `[CITED]`
- [pytest-asyncio docs](https://pytest-asyncio.readthedocs.io/en/latest/) — `asyncio_mode="auto"` and event_loop fixture scope `[CITED]`
- [httpx ASGITransport](https://www.python-httpx.org/async/#calling-into-python-web-apps) — official pattern since 0.28 `[CITED]`
- [astral-sh/uv dependency groups](https://docs.astral.sh/uv/concepts/projects/dependencies/) — PEP 735 `[dependency-groups]` `[CITED]`

### Tertiary (LOW confidence — flagged)

- mypy version pin (`>=1.13.0`) is `[ASSUMED]` — verify against current PyPI before locking. STACK.md doesn't list a mypy version (lint+format-only via ruff was the original recommendation; D-20 added mypy).

---

## Assumptions Log

Three claims are tagged `[ASSUMED]` and warrant a quick check before plan execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | mypy `>=1.13.0` is appropriate for FastAPI + SQLAlchemy 2 + Pydantic v2 in 2026-04. | Standard Stack | Low — any 1.x mypy works; just re-pin during plan. |
| A2 | asyncpg's `ssl="require"` keyword (vs `True`, vs an `SSLContext`) is the correct dev-default for ApsaraDB without explicit CA verification. | Code Examples #5 | Low — docs confirm it's a valid value; Phase 8 hardens with a real CA bundle. If ApsaraDB rejects it, fall back to `ssl=True` (verifies system roots). |
| A3 | Local `uv 0.6.3` supports `[dependency-groups]` as documented for `>=0.5`. | Standard Stack | Low — documented as available since 0.5; if not, plan can `uv self update` as a one-liner. |

All other claims are either `[VERIFIED]` (PyPI, project files I read) or `[CITED]` (official docs).

---

## Open Questions

1. **Should Phase 1 ship the `0001_initial_schema.py` migration as one revision, or split per aggregate?**
   - What we know: Alembic supports either; one revision is the common starting baseline.
   - What's unclear: Whether downstream phases prefer additive small migrations (suggesting "add later") or a fresh baseline at end of Phase 1.
   - Recommendation: **One initial revision** containing all 11 tables. Cleaner for the test (D-17 #2 asserts "all 11 tables created"); subsequent phases add their own incremental revisions for new columns.

2. **CA bundle for ApsaraDB TLS verification?**
   - What we know: ApsaraDB ships a CA bundle on its console page.
   - What's unclear: Whether Phase 1 should download + bundle it, or accept `ssl="require"` (encryption only, no cert validation) as the dev default.
   - Recommendation: **Accept `ssl="require"` for dev**. Phase 8 hardens to a verified `SSLContext` with the ApsaraDB CA. Document this trade-off in README.

3. **Does the plan want `pgcrypto` extension enabled?**
   - What we know: We don't use Postgres-side `gen_random_uuid()` because all UUIDs are produced app-side via `uuid5` or `uuid4`.
   - What's unclear: Whether any Phase 4-5 feature needs `pgcrypto`.
   - Recommendation: **Don't enable in Phase 1.** Add as a phase-5 migration if Qwen output ever needs hashing.

4. **`scripts/seed_data.py` shape: typed dataclasses or plain dicts?**
   - What we know: D-06 says "plain dicts (typed where useful)".
   - What's unclear: Where the bar sits between "useful" and "overkill".
   - Recommendation: **Plain `dict` literals** for users/listings/etc.; use `TypedDict` only if a downstream test wants attribute access. Pure data — no behaviour.

---

## State of the Art

This is brownfield-shaped (frontend exists, backend is being re-scaffolded), so no major paradigm shifts apply. A few currency notes:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `from sqlalchemy.ext.declarative import declarative_base` + `Column` | `from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column` | SQLAlchemy 2.0 (2023) | All models use new style; Alembic autogenerate emits new style too. |
| `BaseSettings` from `pydantic` | `BaseSettings` from `pydantic_settings` | Pydantic 2.0 (2023) | Already pinned correctly. |
| `from starlette.testclient import TestClient` | `httpx.AsyncClient(transport=ASGITransport(app=app))` | httpx 0.28 (2024) | D-19 mandates the new pattern. |
| `aioredis` | `redis.asyncio` | Merged into redis-py 4.2 (2022); aioredis abandoned | Avoid the trap. |
| `oss2` | `alibabacloud-oss-v2` | V1 sigs deprecated 2025-03-01 for new accounts | Avoid the trap. |
| `python-jose` | `pyjwt[crypto]` | FastAPI tutorial moved 2024 | Avoid the trap. |
| `passlib` | direct `bcrypt` (4.x) | bcrypt 5.0 (2025-09-25) broke passlib | Pin `<5`, no passlib. |
| `boto3` for Transcribe Streaming | `amazon-transcribe` SDK | boto3 has never supported streaming | Use the right SDK. |

**Deprecated/outdated references in our docs:**
- `MULTI-CLOUD-ARCHITECTURE.md` — claims `AnalyzeID` works on MyKad. Wrong. Use `AnalyzeDocument` + regex (Phase 4 concern; flagged here for awareness only).
- The deleted scaffold (`git show 3de5f53`) — `routes/` directory, empty `models.py`, `allow_origins=["*"]`. Discard entirely.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: **HIGH** — versions verified against PyPI 2026-04-25 (today) in umbrella STACK.md; user's CONTEXT.md confirms.
- Architecture (file tree, lifespan, per-request session): **HIGH** — directly traceable to ARCHITECTURE.md and FastAPI/SQLAlchemy official docs.
- Schema sketch (11 tables, column-level): **HIGH** — every column traces to a CONTEXT.md decision, a REQUIREMENTS field, or a frontend type. CHECK-vs-ENUM choice is locked by D-01.
- Pitfalls: **HIGH** — all 14 pitfalls cited in `PITFALLS.md` are reproduced in linked GitHub issues / CVEs / official docs.
- Validation Architecture: **HIGH** for the 4 pinned tests (D-17 mandates them); MEDIUM for the recommended schema-shape tests (those are best practice, not locked).
- mypy pin: **MEDIUM** (assumed `>=1.13.0`).

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days; stable libraries, no fast-moving framework changes expected). Re-verify dep versions if planning slips past that.

---

*Phase: 01-backend-scaffold-schema-seed*
*Research completed: 2026-04-25*
