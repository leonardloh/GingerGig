# Phase 1: Backend Scaffold + Schema + Seed - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 1 — Backend Scaffold + Schema + Seed
**Areas discussed:** Schema modelling, Seed source-of-truth, Local dev infrastructure, Test scaffolding

---

## Schema Modelling

### Constrained-string column representation

| Option | Description | Selected |
|--------|-------------|----------|
| VARCHAR + CHECK | Plain text + Postgres CHECK constraint, paired with Python StrEnum. Easy to add values later. | ✓ |
| Postgres native ENUM | True ENUM type. Adding a value requires `ALTER TYPE ... ADD VALUE`; reordering impossible. | |
| Plain VARCHAR (no DB constraint) | Application-only enforcement. | |

**User's choice:** VARCHAR + CHECK
**Notes:** Recommended; pairs with `app/core/enums.py` StrEnum classes.

### kyc_sessions raw response shape

| Option | Description | Selected |
|--------|-------------|----------|
| Two JSONB cols + parsed cols | `textract_raw JSONB`, `rekognition_raw JSONB`, plus first-class parsed fields. | ✓ |
| Single `raw_response JSONB` blob | Merged JSON for both vendor responses + parsed columns. | |
| Separate child tables | `kyc_textract_results`, `kyc_rekognition_results` joined by session id. | |

**User's choice:** Two JSONB cols + parsed cols
**Notes:** Best of both — auditable and queryable.

### Timestamp columns

| Option | Description | Selected |
|--------|-------------|----------|
| TimestampMixin on every table | `created_at` + `updated_at` everywhere via SQLAlchemy mixin. | ✓ |
| Only where the prototype needs them | Skip on lookup-style tables. | |
| `created_at` only, no `updated_at` | Track creation universally; no mutation tracking. | |

**User's choice:** TimestampMixin on every table

### companion_links cardinality

| Option | Description | Selected |
|--------|-------------|----------|
| N:M (composite PK) | Companion can monitor multiple elders; elder can have multiple companions. | ✓ |
| 1:1 elder→companion | Single companion per elder. | |
| 1:N elder→many companions | Asymmetric — unusual. | |

**User's choice:** N:M

### Earnings computation

| Option | Description | Selected |
|--------|-------------|----------|
| Computed from `bookings` | Aggregate query over `WHERE status='completed'`, `Asia/Kuala_Lumpur` boundaries. | ✓ |
| Materialised earnings table | `earnings_monthly(...)` updated on booking transitions. | |
| Postgres view over bookings | `CREATE VIEW earnings_summary`. | |

**User's choice:** Computed from `bookings`

---

## Seed Source-of-Truth

### Mock data location

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-port to Python module | One-time translation into `backend/scripts/seed_data.py`. | ✓ |
| Shared JSON fixture | Touches `mock-data.js` — violates no-frontend-change rule. | |
| Parse JS at seed time | Adds Node-at-seed-time dep. | |

**User's choice:** Hand-port to Python module

### UUID5 derivation

| Option | Description | Selected |
|--------|-------------|----------|
| Single namespace + typed name | `uuid5(GINGERGIG_NS, f"{kind}:{slug}")`. | ✓ |
| Per-table sub-namespace | One namespace per table. | |
| Derive from raw slug only | Cross-table collision risk. | |

**User's choice:** Single namespace + typed name

### bcrypt rounds for demo accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Production rounds, one-time hash | `gensalt(rounds=12)`, reuse hash on idempotent re-run. | ✓ |
| Lower rounds for dev (e.g., 4) | Faster local seeding; dev/prod hash divergence. | |
| Pre-computed constants | Hardcoded bcrypt strings in source. | |

**User's choice:** Production rounds, one-time hash

### 4-locale fill for alerts/timeline

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-write 4 locales in seed_data.py | Author all four `text_ms/en/zh/ta` strings inline. | ✓ |
| Same string in all 4 columns | English duplicated across locales. | |
| English only in `en`, NULL elsewhere (coalesce) | SQL projection falls back to English. | |

**User's choice:** Hand-write 4 locales

---

## Local Dev Infrastructure

> **Mid-discussion correction:** the user clarified they want to develop directly against ApsaraDB on Alibaba Cloud — no local Postgres at all. The four questions below were re-asked under that constraint after an initial pass had picked docker-compose / Postgres+Redis. The original pass is summarised under "Initial pass (superseded)".

### Initial pass (superseded by cloud-only flip)

| Question | Initial choice | Status |
|----------|----------------|--------|
| Postgres for dev | docker-compose with Postgres + Redis | **Superseded** — no local DB |
| Task runner | Makefile | **Kept** |
| Alembic env | env.py imports pydantic-settings | **Kept** |
| App in Docker | Native uvicorn locally, Docker for prod | **Kept** |

### Re-pass (cloud-only)

#### ApsaraDB provisioning timing

| Option | Description | Selected |
|--------|-------------|----------|
| Provision in Phase 1, before scaffold runs | Spin up ApsaraDB as the very first task; Phase 8 only adds ECS + CloudFront on top. | ✓ |
| Use existing ApsaraDB instance | Skip provisioning if one already exists. | |
| Manual provisioning outside GSD flow | User handles Alibaba console click-through. | |

**User's choice:** Provision in Phase 1
**Notes:** Phase 8 deploy scope correspondingly shrinks.

#### Test database

| Option | Description | Selected |
|--------|-------------|----------|
| Separate test DB on ApsaraDB (`gingergig_test`) | One alembic upgrade per session, SAVEPOINT rollback per test. | ✓ |
| Same DB, transactional rollback only | Tests share `gingergig` with dev. | |
| Disposable Docker Postgres for tests only | Contradicts "no local DB" intent. | |

**User's choice:** Separate test DB on ApsaraDB

#### Idempotent seed safety

| Option | Description | Selected |
|--------|-------------|----------|
| Refuse seed unless `ALLOW_SEED=1` | `SeedRefusedError` against non-localhost DSN unless explicitly overridden. | ✓ |
| No guard — always seed | Standard idempotent UPSERT semantics. | |
| `ON CONFLICT DO NOTHING` | Preserves manual edits; breaks DATA-06 idempotency. | |

**User's choice:** Refuse seed unless `ALLOW_SEED=1`

#### Migration target during Phase 1–7

| Option | Description | Selected |
|--------|-------------|----------|
| Same ApsaraDB dev DB, no separate staging | Single `gingergig` DB serves dev + judging demo. | ✓ |
| Two ApsaraDB DBs: dev + prod | `gingergig_dev` + `gingergig`. | |
| ApsaraDB just for prod, dev DB unspecified | Backtrack to local Docker Postgres. | |

**User's choice:** Same ApsaraDB dev DB

---

## Test Scaffolding

### Test scope for Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| Scaffold + 4 success-criterion tests | pytest + asyncio + httpx; one test per Phase-1 success criterion. | ✓ |
| Bare scaffold only | Just `/health` smoke test; defer the rest. | |
| Defer all tests to phase 2+ | No tests in Phase 1. | |

**User's choice:** Scaffold + 4 success-criterion tests

### Test database strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Ephemeral schema per session, SAVEPOINT rollback per test | One alembic upgrade per session against `gingergig_test`; SAVEPOINT per test. | ✓ |
| Fresh DB per session, no per-test isolation | Tests share state. | |
| Throwaway docker DB per test run | Slowest, most isolated. | |

**User's choice:** Ephemeral schema + SAVEPOINT rollback

### Test client

| Option | Description | Selected |
|--------|-------------|----------|
| `httpx.AsyncClient` + `ASGITransport` | Async-end-to-end pattern since httpx 0.28. | ✓ |
| Starlette `TestClient` (sync) | Sync wrapper. | |
| Real uvicorn + `requests` | Most realistic, slowest. | |

**User's choice:** `httpx.AsyncClient` + `ASGITransport`

### Lint & format

| Option | Description | Selected |
|--------|-------------|----------|
| ruff (lint + format) + mypy | `make lint`, `make format`, `make typecheck`; pre-commit committed but opt-in. | ✓ |
| ruff only, no mypy | Linting + formatting; runtime types via Pydantic only. | |
| Defer to later phase | Add tooling when something breaks. | |

**User's choice:** ruff + mypy

---

## Claude's Discretion

- Listing pricing decimal precision (`numeric(10,2)` vs cents-as-int)
- FK cascade rules (default `ON DELETE RESTRICT`)
- `voice_sessions` exact schema details
- README onboarding text

## Deferred Ideas

- Tair / Redis provisioning (stays in Phase 6)
- Logging shape (defer to phase that needs production observability)
- `/health/deep` (defer to Phase 8 observability)
- Refresh-token flow (anti-feature)
- Earnings materialised table/view (revisit only if cache analysis flags it)
- App-in-Docker for local dev (Dockerfile is for Phase 8 only)
