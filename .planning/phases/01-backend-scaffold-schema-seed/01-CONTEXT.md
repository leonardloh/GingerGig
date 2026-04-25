# Phase 1: Backend Scaffold + Schema + Seed - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a runnable FastAPI app at `localhost:8000` whose Postgres schema is migrated via Alembic against ApsaraDB and seeded idempotently with the prototype's mock data + the three demo accounts. This phase locks the contract that unblocks every parallel router track downstream (auth, persona routers, KYC, voice, cache).

Out of scope: any business logic in routers, auth verification, KYC pipeline wiring, voice handling, cache reads — those each have their own phase.

</domain>

<decisions>
## Implementation Decisions

### Schema Modelling

- **D-01:** All constrained-string columns (`users.role`, `users.locale`, `users.kyc_status`, `bookings.status`, `kyc_sessions.status`, `voice_sessions.status`) use `VARCHAR` + Postgres `CHECK` constraint enumerating allowed values. Pair with Python `enum.StrEnum` in `app/core/enums.py` for application-side type safety. **No native Postgres `ENUM` types** — adding a value later costs a single `ALTER TABLE` rather than `ALTER TYPE ... ADD VALUE` plus value-reordering pain.
- **D-02:** `kyc_sessions` stores **two JSONB columns** — `textract_raw JSONB` and `rekognition_raw JSONB` — *plus* first-class parsed columns: `ic_number`, `ic_name`, `ic_dob`, `similarity_score`, `confidence`, `decision`, `decision_reason`. Provenance and queryability both preserved; Phase 4 will populate.
- **D-03:** `TimestampMixin` adds `created_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ` to **every** model — `server_default=func.now()`, `onupdate=func.now()`. Cheap insurance for debugging seed re-runs, alert ordering, and any future audit needs.
- **D-04:** `companion_links` is **N:M** with composite primary key `(companion_user_id, elder_user_id)`. A companion may monitor multiple elders; an elder may have multiple companions. `companion_alert_preferences` keys on the same composite to track per-pair toggles.
- **D-05:** Earnings are **computed on-the-fly** from `bookings` rows — `monthTotal`, `weekTotal`, `activeDays` are aggregate queries with `WHERE elder_id = ? AND status = 'completed'` and `Asia/Kuala_Lumpur` calendar boundaries. No materialised table, no Postgres view. Phase 3 implements the actual SQL.

### Seed Data Source-of-Truth

- **D-06:** Mock data is **hand-ported once** from `frontend/src/prototype/mock-data.js` and `PrototypeApp.jsx::DEMO_ACCOUNTS` into a new Python module `backend/scripts/seed_data.py` as plain dicts (typed where useful). The frontend mocks are frozen for this milestone (no-frontend-change rule), so drift risk is minimal.
- **D-07:** Deterministic UUID5 IDs use a **single project namespace + typed name** — `GINGERGIG_NS = uuid.uuid5(uuid.NAMESPACE_DNS, "gingergig.my")`, then every entity id is `uuid.uuid5(GINGERGIG_NS, f"{kind}:{slug}")` (e.g., `user:siti`, `listing:siti-listing-1`, `booking:siti-booking-1`). The `kind:` prefix prevents cross-table slug collisions.
- **D-08:** Demo-account passwords use **production bcrypt cost** (`bcrypt.gensalt(rounds=12)`). The seed script is idempotent: when a row already exists the existing `password_hash` is **preserved** (reuse, don't re-hash) so re-runs are fast and deterministic. Apply via partial `ON CONFLICT (id) DO UPDATE SET ... ` that excludes `password_hash` from the update set.
- **D-09:** All four locale strings (`text_ms`, `text_en`, `text_zh`, `text_ta`) for `companion_alerts` and `timeline_events` are **hand-written in `seed_data.py`**. Volume is small (~10–15 entries each); the 4-language end-to-end story is a hackathon judging signal.

### Local Dev Infrastructure (cloud-only — no local Postgres)

- **D-10:** **No local Postgres / docker-compose.** Development runs against **ApsaraDB Postgres on Alibaba Cloud (`ap-southeast-3`)** from day one — `DATABASE_URL` in `.env` points directly at the cloud DSN.
- **D-11:** ApsaraDB Postgres instance is **provisioned in Phase 1** (not deferred to Phase 8). Phase 1 tasks include: create the instance, set IP allowlist for the dev machine, enable SSL, create two databases on it — `gingergig` (dev + judging demo) and `gingergig_test` (test runs).
- **D-12:** **Single dev DB** — no separate staging/prod split. The same `gingergig` DB serves daily development and the Phase 8 judging demo. Recovery path if state gets weird: `alembic downgrade base && alembic upgrade head && ALLOW_SEED=1 python scripts/seed.py`.
- **D-13:** Tair (Redis) is **not provisioned in Phase 1**. Cache is additive (Phase 6) and every endpoint must function without it. Defer Tair provisioning to Phase 6 — no Redis in `.env.example` until then.
- **D-14:** App runs **natively via `uv run uvicorn app.main:app --reload`** during dev — fast restart, easy debugging. A `Dockerfile` *is* written in Phase 1 (Phase 8 needs it for ECS), but it is not part of any local workflow.
- **D-15:** Task runner is a **`Makefile`** at `backend/Makefile`. Targets: `dev`, `migrate`, `migrate-new`, `seed`, `test`, `lint`, `format`, `typecheck`. No `docker-compose`/`up`/`down` targets (no local containers).
- **D-16:** Alembic's `alembic/env.py` **imports the same `pydantic-settings` `Settings`** class used by the FastAPI app and reads `DATABASE_URL` from there — single source of truth for connection config, no duplication in `alembic.ini`.

### Test Scaffolding

- **D-17:** Phase 1 ships `pytest` + `pytest-asyncio` + `httpx>=0.28` and writes **exactly four tests** pinned to the success criteria:
  1. `GET /health` returns `200 {"status":"ok"}`
  2. `alembic upgrade head` against a fresh `gingergig_test` DB applies cleanly and creates all 11 tables
  3. `python scripts/seed.py` (with `ALLOW_SEED=1`) is idempotent across two consecutive runs — row count and SHA-256 of canonical-form rows unchanged
  4. A test route raising a deliberate exception returns `{status, message, detail?}` with no Python traceback in the body
- **D-18:** Tests run against `gingergig_test` on ApsaraDB. **Once-per-session migration** (`alembic upgrade head` against the test DB), then **per-test SAVEPOINT rollback** for isolation. Network round-trips to `ap-southeast-3` are accepted overhead.
- **D-19:** Test client is **`httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`** — the supported async-end-to-end pattern since httpx 0.28. No `Starlette TestClient`.
- **D-20:** Lint and typing tooling is **`ruff` (lint + format) + `mypy`**, wired through `make lint`, `make format`, `make typecheck`. A `.pre-commit-config.yaml` is committed but not auto-installed (developer opt-in via `pre-commit install`).

### Cross-Cutting Safety

- **D-21:** `scripts/seed.py` **refuses to run** unless either (a) `DATABASE_URL` host is `localhost`/`127.0.0.1` (none of our cases), or (b) the env var `ALLOW_SEED=1` is explicitly set. The `Makefile`'s `seed` target sets `ALLOW_SEED=1` inline so `make seed` works; bare `python scripts/seed.py` against an ApsaraDB DSN exits with `SeedRefusedError`. Prevents `ON CONFLICT DO UPDATE` from clobbering hand-edited dev rows by muscle-memory.
- **D-22:** ApsaraDB connections require **TLS**. `Settings` exposes `DATABASE_URL` plus an `DATABASE_SSL_MODE` flag (default `require`) consumed by the asyncpg engine builder.

### Phase Scope Shifts (vs. original ROADMAP)

- **D-23:** Phase 1 now includes **ApsaraDB Postgres provisioning + IP allowlist + SSL setup + two-DB creation**. Phase 8's deploy scope correspondingly shrinks — Phase 8 will *not* provision the Postgres instance, only the ECS + CloudFront + S3 layer on top of an already-running database.

### Claude's Discretion

- Listing pricing decimal precision (`numeric(10,2)` vs `int` cents) — pick one consistent approach in the planning step; either works for the prototype's price values.
- FK cascade rules (e.g., delete a user → cascade or restrict bookings?). Default to `ON DELETE RESTRICT` for safety unless the prototype's data-flow obviously demands cascade. Document the picks in the migration.
- `voice_sessions` schema details (status enum values, transcript storage shape). Phase 5 owns the heavy lifting; Phase 1 just needs the table to exist with `id`, `elder_id`, `language`, `mode` (`stream`/`batch`), `status`, `transcript`, `listing_draft JSONB`, `error`, `created_at`, `updated_at`.
- README install + onboarding text — write what reflects the Makefile + ApsaraDB workflow.

### Folded Todos

None — discussion stayed within phase scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Locked decisions, constraints, anti-features
- `.planning/REQUIREMENTS.md` §Foundation, §Database & Seed — FOUND-01..07, DATA-01..07
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 numbered items)
- `.planning/STATE.md` — Carried-forward locked decisions

### Research & cross-cutting design
- `.planning/research/SUMMARY.md` — Cross-cutting design corrections
- `.planning/research/ARCHITECTURE.md` — Backend module shape, lifespan singletons
- `.planning/research/PITFALLS.md` — Mandatory: passlib (avoid), `Base.metadata.create_all` (avoid), per-request session, JWT centralisation, bcrypt off-loop, region pinning
- `.planning/research/STACK.md` — Pinned dep versions
- `.planning/research/FEATURES.md` — Feature-by-feature backend mapping

### Architecture & topology
- `MULTI-CLOUD-ARCHITECTURE.md` (root) — Multi-cloud split (note: `AnalyzeID` claim is wrong; we use `AnalyzeDocument` + IC regex per PITFALLS)

### Codebase analysis (frontend, read-only for Phase 1)
- `.planning/codebase/STRUCTURE.md` — Backend mirrors frontend's `src/services/api/endpoints/{auth,elder,requestor,companion,kyc}` shape
- `.planning/codebase/CONVENTIONS.md` — `ApiError` envelope, `Authorization: Bearer` injection, `/api/v1` prefix
- `.planning/codebase/INTEGRATIONS.md` — Frontend's `apiRequest<T>` wrapper expectations

### Frontend artefacts that drive Phase 1
- `frontend/src/prototype/mock-data.js` — **Seed source-of-truth** (HERO_ELDER, PROVIDERS×6, ELDER_LISTINGS, ELDER_BOOKINGS, ELDER_COMPLETED, REVIEWS, COMPANION_ALERTS, TIMELINE, PORTRAITS)
- `frontend/src/prototype/PrototypeApp.jsx` — `DEMO_ACCOUNTS` (siti/amir/faiz, password `demo`)
- `frontend/src/services/api/types.ts` — Current DTO shapes; informs the schema's column names
- `frontend/src/services/api/http.ts` — `ApiError` envelope shape `{status, message, detail?}`

### Repo guides
- `CLAUDE.md` (root) — Conventions: API prefix, error envelope, locale columns, denormalisation, demo accounts, idempotent seed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Frontend typed API client** (`frontend/src/services/api/`) is the *contract* the backend must serve. `endpoints/{auth,elder,requestor,companion,kyc}.ts` enumerate exactly which routes exist, their request shapes, and their response shapes — backend routers should mirror them route-for-route.
- **Prior backend scaffold** (`git show 3de5f53`) used `allow_origins=["*"]` and an empty `models.py` — useful as a *negative* reference (we know what NOT to do for CORS) but otherwise discard.

### Established Patterns
- **`/api/v1` prefix is non-negotiable** — `frontend/src/services/api/http.ts::apiRequest` already prepends it.
- **`ApiError` envelope `{status, message, detail?}`** is the only shape the frontend's HTTP wrapper handles cleanly — global exception handlers must serialise to this shape (FOUND-06).
- **Frontend dev port** is Vite's default `http://localhost:5173` — first entry in CORS allowlist.
- **Locale columns pattern** (`text_ms`, `text_en`, `text_zh`, `text_ta`) is already in mock data; backend mirrors it on `companion_alerts`, `timeline_events`, `listings.title_*`.
- **Booking denormalisation** (`requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`) is already visible in mock-data.js shapes — bookings table snapshots these at create-time per CLAUDE.md.

### Integration Points
- **`Authorization: Bearer` header injection** is wired in `http.ts` — backend just needs middleware that reads it (Phase 2 territory; Phase 1 leaves auth-protected routes stubbed).
- **`VITE_API_BASE_URL`** is the env var that points the frontend at the backend; localhost during dev, ApsaraDB-fronted ECS in Phase 8.
- **Backend module mirror** (FOUND-04): `routers/{auth,elder,requestor,companion,kyc,voice}.py` (six files, mirroring the five frontend endpoint files plus a new `voice` router for ASR). `services/`, `models/`, `schemas/`, `integrations/`, `core/`, `deps/`, `db.py`, `main.py`.

</code_context>

<specifics>
## Specific Ideas

- **`GET /health` body is exactly `{"status":"ok"}`** — verbatim per success criterion #1, no version field, no DB ping. Add `/health/deep` later if observability needs grow.
- **`uuid5` namespace constant lives in `app/core/ids.py`** alongside helper `entity_id(kind: str, slug: str) -> uuid.UUID`. Used by both seed script and (later) any code that needs to look up a known seeded row.
- **`SeedRefusedError`** is a real exception class in `scripts/seed.py` — surfaces a useful message ("Refusing to seed against {host}; set ALLOW_SEED=1 to override").
- **`AsyncSession` singleton-engine pattern** per FOUND-07: engine built in `lifespan(app)`, stored on `app.state.engine`; `get_db()` yields a per-request session bound to it.
- **Pre-commit config committed but not auto-installed** — opt-in via `pre-commit install`. Avoids surprising teammates in CI sweep PRs.
- **`Makefile` `.PHONY` targets only** — no file-based targets; everything runs via `uv run`.
- **Test isolation via SAVEPOINT** — `pytest-asyncio` fixture wraps each test in `async with session.begin_nested():` and rolls back on teardown.

</specifics>

<deferred>
## Deferred Ideas

- **Tair / Redis provisioning** — stays in Phase 6 (cache is additive). Don't add `REDIS_URL` to `.env.example` until then.
- **Logging shape (JSON structured vs. stdlib)** — defer to whichever phase first needs production observability. Phase 1 ships with FastAPI's default Uvicorn logging.
- **`/health/deep` (DB ping, Redis ping)** — defer to deployment / observability work in Phase 8.
- **Refresh-token flow** — explicit anti-feature per PROJECT.md.
- **Earnings materialised table or view** — rejected for v1; reconsider only if Phase 6 cache analysis flags the aggregate query as a hotspot.
- **App-in-Docker for local dev** — rejected; native uvicorn is faster. The `Dockerfile` written in Phase 1 is exclusively for Phase 8's ECS deployment.

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 01-backend-scaffold-schema-seed*
*Context gathered: 2026-04-25*
