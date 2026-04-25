---
phase: 01-backend-scaffold-schema-seed
plan: 01
subsystem: backend-foundation
tags: [fastapi, uv, sqlalchemy, asyncpg, pydantic-settings, pyjwt, bcrypt]

requires: []
provides:
  - Backend uv project scaffold with pinned dependency lockfile
  - Core config, enum, ID, error, security, and common schema contracts
  - Async SQLAlchemy engine/session plumbing and FastAPI DB dependency
  - Backend Makefile, Dockerfile, env example, README, and pre-commit config
affects: [phase-01-plan-02, phase-01-plan-03, phase-02-auth, phase-04-kyc, phase-05-voice, phase-06-cache]

tech-stack:
  added:
    - fastapi==0.136.1
    - sqlalchemy==2.0.49
    - asyncpg==0.31.0
    - alembic==1.18.4
    - pydantic==2.13.3
    - pydantic-settings==2.14.0
    - boto3==1.42.96
    - amazon-transcribe==0.6.4
    - alibabacloud-oss-v2==1.2.5
    - openai==2.32.0
    - redis==7.4.0
    - pyjwt==2.12.1
    - bcrypt==4.3.0
    - ruff==0.15.12
    - mypy==1.20.2
    - pytest==9.0.3
    - pytest-asyncio==1.3.0
    - httpx==0.28.1
  patterns:
    - Settings singleton via pydantic-settings with required DATABASE_URL and JWT_SECRET
    - Deterministic UUID5 IDs via entity_id(kind, slug)
    - ApiError envelope handlers returning {status, message, detail?}
    - Process-level AsyncEngine plus per-request AsyncSession dependency

key-files:
  created:
    - backend/.python-version
    - backend/.gitignore
    - backend/.pre-commit-config.yaml
    - backend/Dockerfile
    - backend/Makefile
    - backend/README.md
    - backend/app/core/config.py
    - backend/app/core/enums.py
    - backend/app/core/errors.py
    - backend/app/core/ids.py
    - backend/app/core/security.py
    - backend/app/db/base.py
    - backend/app/db/session.py
    - backend/app/deps/db.py
    - backend/app/schemas/common.py
  modified:
    - backend/.env.example
    - backend/pyproject.toml
    - backend/uv.lock
    - backend/db.py
    - backend/main.py
    - backend/models.py
    - backend/routes/.placeholder
    - backend/services/.placeholder

key-decisions:
  - "Kept Phase 1 to skeleton contracts only: no FastAPI main wiring, routers, models, migrations, or seed script until later 01-02 through 01-05 plans."
  - "Committed the old flat backend scaffold deletions with the new package layout so downstream plans import from app.* exclusively."
  - "Used ASCII-only wording in newly-created backend docs/comments while preserving the plan's technical content."

patterns-established:
  - "Forbidden dependency guard: passlib, python-jose, aioredis, oss2, and psycopg2 are absent from uv.lock."
  - "JWT decode is centralized in app.core.security and the Phase 2 stub documents algorithms=[\"HS256\"] and required exp/sub claims."
  - "Database access goes through build_engine(), get_sessionmaker(), and get_db(); no module-level AsyncSession exists."

requirements-completed: [FOUND-01, FOUND-02, FOUND-04, FOUND-05, FOUND-07]

duration: 6 min
completed: 2026-04-25
---

# Phase 01 Plan 01: Backend Skeleton Summary

**uv-managed FastAPI backend skeleton with core contracts, deterministic IDs, error envelopes, and async SQLAlchemy session plumbing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-25T14:47:05Z
- **Completed:** 2026-04-25T14:52:36Z
- **Tasks:** 3 completed
- **Files modified:** 32

## Accomplishments

- Created the backend uv project with Python 3.12, pinned production/dev dependencies, and a resolved `uv.lock`.
- Added the core contracts downstream plans depend on: `Settings`, all required `StrEnum`s, deterministic `entity_id`, error-envelope handlers, JWT stubs, and common schemas.
- Added SQLAlchemy base/session infrastructure plus Makefile, Dockerfile, `.env.example`, README, and opt-in pre-commit config.

## Task Commits

Each task was committed atomically:

1. **Task 1.1: Dependency tooling scaffold** - `9110fc2` (chore)
2. **Task 1.2: Core contracts and schemas** - `8207a84` (feat)
3. **Task 1.3: Database session scaffold and tooling docs** - `97d3a3e` (feat)

**Plan metadata:** included in final docs commit

## Files Created/Modified

- `backend/pyproject.toml` - uv project metadata, runtime deps, dev deps, ruff/mypy/pytest config.
- `backend/uv.lock` - resolved lockfile; final notable versions include `amazon-transcribe==0.6.4`, `bcrypt==4.3.0`, `pyjwt==2.12.1`, `redis==7.4.0`, `alibabacloud-oss-v2==1.2.5`.
- `backend/app/core/config.py` - `Settings` singleton with DB, JWT, CORS, AWS, DashScope, and OSS fields.
- `backend/app/core/enums.py` - all 13 StrEnum mirrors required by later CHECK constraints.
- `backend/app/core/ids.py` - `GINGERGIG_NS` and deterministic `entity_id(kind, slug)`.
- `backend/app/core/errors.py` - FastAPI exception handlers returning `{status, message, detail?}` without leaking raw exceptions.
- `backend/app/core/security.py` - Phase 2 JWT helper stubs with explicit HS256 decode requirements.
- `backend/app/db/base.py` and `backend/app/db/session.py` - naming convention, async engine builder, sessionmaker, disposal helper.
- `backend/app/deps/db.py` - per-request `AsyncSession` dependency with commit/rollback behavior.
- `backend/.env.example`, `backend/Makefile`, `backend/Dockerfile`, `backend/.pre-commit-config.yaml`, `backend/README.md` - backend runtime and developer tooling.

## Decisions Made

- Followed the plan boundary strictly: no `app.main`, no SQLAlchemy models, no Alembic migration, and no seed script in 01-01.
- Removed the old flat scaffold (`backend/db.py`, `backend/main.py`, `backend/models.py`, old placeholders) instead of restoring it.
- Kept `REDIS_URL` out of `.env.example`; Tair configuration remains Phase 6.

## Deviations from Plan

### Auto-fixed Issues

None - no Rule 1-3 implementation deviations were required.

### Minor Formatting Adjustment

New backend docs/comments use ASCII punctuation instead of the plan's non-ASCII symbols. Technical content and verification criteria are unchanged.

---

**Total deviations:** 0 auto-fixed.  
**Impact on plan:** No behavior or contract impact.

## Issues Encountered

- The first combined verification command used `python` for shell command substitution, but this machine only exposes `python3` directly. The verification was rerun with `python3` for generating `JWT_SECRET`; `uv run python` remains available inside the backend virtualenv and passed.

## Known Stubs

- `backend/app/core/security.py` intentionally raises `NotImplementedError` in `encode_jwt` and `decode_jwt`; Phase 2 implements JWT auth.
- Empty package initializers in `backend/app/models`, `backend/app/routers`, `backend/app/services`, and `backend/app/integrations` intentionally reserve import paths for later plans.

## Verification

- PASS: `uv sync`
- PASS: import smoke test for `app.core.*`, `app.db.*`, `app.deps.db`, `app.schemas.common`, and placeholder packages with `DATABASE_URL` and `JWT_SECRET` set.
- PASS: deterministic `entity_id("user", "siti")` check.
- PASS: `decode_jwt.__doc__` contains `algorithms=["HS256"]`.
- PASS: `rg` scan found none of `passlib`, `python-jose`, `aioredis`, `oss2`, or `psycopg2` in `backend/uv.lock`.
- PASS: `.env.example` has no `REDIS_URL`.
- PASS: `Makefile` has no `docker-compose`, `up`, or `down` target and includes `ALLOW_SEED=1`.
- PASS: Makefile recipe lines are tab-indented and `make -n dev` prints `uv run uvicorn app.main:app --reload --port 8000`.
- PASS: `uv run ruff check .`
- PASS: `uv run mypy app`

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Ready for `01-02-PLAN.md` to add FastAPI `app.main`, lifespan, CORS, `/health`, and router stubs. No blockers.

## Self-Check: PASSED

- All key files listed in the plan exist or were intentionally removed as part of the clean re-scaffold.
- All three task commits exist in git history.
- Plan-level verification passed after the local `python` alias adjustment noted above.

---
*Phase: 01-backend-scaffold-schema-seed*
*Completed: 2026-04-25*
