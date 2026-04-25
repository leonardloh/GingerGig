# GingerGig API (backend)

FastAPI backend on Python 3.12+, async SQLAlchemy 2 + asyncpg, Alembic, Pydantic v2.
Connects to **ApsaraDB Postgres on Alibaba Cloud (`ap-southeast-3`)**. There is no
local Postgres / docker-compose (D-10).

## First-time setup

1. Provision ApsaraDB Postgres in `ap-southeast-3` and create two databases on it:
   `gingergig` (dev + judging demo) and `gingergig_test` (tests). See
   `docs/APSARADB_PROVISIONING.md` (Plan 07).
2. Add your dev machine's egress IP to the ApsaraDB allowlist; enable TLS.
3. `cp .env.example .env` and fill `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`.
   Generate `JWT_SECRET` with `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
4. `uv sync` to install deps (uv installs Python 3.12 if missing; see `.python-version`).
5. `make migrate` to apply the schema.
6. `make seed` to load the prototype mock data + 3 demo accounts.
7. `make dev` to run on `http://localhost:8000` with auto-reload.

## Make targets

| Target | Action |
|--------|--------|
| `make dev` | Run uvicorn with `--reload` |
| `make migrate` | `alembic upgrade head` |
| `make migrate-new MSG="..."` | Autogenerate a new revision |
| `make seed` | Idempotent seed (sets `ALLOW_SEED=1`) |
| `make test` | Run pytest against `gingergig_test` |
| `make lint` | `ruff check .` |
| `make format` | `ruff format .` |
| `make typecheck` | `mypy app` |

Optional: `pre-commit install` to enable git hooks (committed but opt-in per D-20).

## Recovery

If dev DB state gets weird:

```bash
uv run alembic downgrade base
make migrate
make seed
```

## What NOT to use (per `.planning/research/PITFALLS.md`)

- Do not use `passlib`, `python-jose`, `aioredis`, `oss2`, or `psycopg2`.
- Do not use `boto3` for Transcribe Streaming; use `amazon-transcribe`.
- Do not use Textract `AnalyzeID` for MyKad; use `AnalyzeDocument` + IC regex.
- Do not use `Base.metadata.create_all`; Alembic owns schema changes from day one.
- Do not create module-level `AsyncSession`; use per-request sessions via `Depends(get_db)`.
- Do not use `allow_origins=["*"]`; use the explicit `CORS_ORIGINS_CSV` allowlist.
