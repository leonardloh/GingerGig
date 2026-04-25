---
phase: 1
slug: backend-scaffold-schema-seed
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x + pytest-asyncio + httpx 0.28+ (ASGITransport) |
| **Config file** | `backend/pyproject.toml` (`[tool.pytest.ini_options]`) |
| **Quick run command** | `cd backend && uv run pytest -x -q` |
| **Full suite command** | `cd backend && uv run pytest -v` |
| **Estimated runtime** | ~30-60 seconds (network round-trips to ApsaraDB `ap-southeast-3`) |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest -x -q` (fail-fast)
- **After every plan wave:** Run `uv run pytest -v` (full suite)
- **Before `/gsd-verify-work`:** Full suite + `make lint` + `make typecheck` all green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Filled in by the planner during plan generation. Each PLAN.md task references one row by Task ID.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _populated by planner_ | | | | | | | | | |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements (test scaffolding before any feature task)

- [ ] `backend/tests/conftest.py` — async engine, async session with SAVEPOINT rollback fixture, `httpx.AsyncClient(transport=ASGITransport(app=app))` client fixture, `gingergig_test` DB URL override
- [ ] `backend/pyproject.toml` `[tool.pytest.ini_options]` — `asyncio_mode = "auto"`, `testpaths = ["tests"]`
- [ ] `backend/tests/__init__.py` — empty marker
- [ ] `uv add --group dev pytest pytest-asyncio httpx` — dev-group deps installed

---

## Phase 1 Pinned Tests (from CONTEXT.md D-17, mapped to ROADMAP success criteria)

| # | Success Criterion | Test File | Assertion |
|---|------------------|-----------|-----------|
| 1 | `GET /health` returns `200 {"status":"ok"}` (FOUND-01) | `tests/test_health.py::test_health_returns_ok` | Response status 200 AND JSON body equals `{"status":"ok"}` exactly |
| 2 | `alembic upgrade head` against fresh `gingergig_test` creates all 11 tables (DATA-01) | `tests/test_migrations.py::test_alembic_upgrade_creates_all_tables` | After `command.upgrade(cfg, "head")` against a fresh DB, `information_schema.tables` contains all 11 named tables |
| 3 | `python scripts/seed.py` is idempotent across two consecutive runs (DATA-06) | `tests/test_seed.py::test_seed_idempotent` | Run seed twice; row counts per table unchanged AND SHA-256 of canonical-form rows unchanged AND no IntegrityError |
| 4 | Deliberate exception returns `{status, message, detail?}` envelope with no traceback (FOUND-06) | `tests/test_error_envelope.py::test_exception_returns_api_error_envelope` | Response body is JSON matching `{status: int, message: str, detail?: any}` AND body does NOT contain string `"Traceback"` |

---

## Recommended Schema-Shape Extensions (from RESEARCH.md "Validation Architecture")

| Test | Purpose |
|------|---------|
| `test_models_match_alembic.py` | Diff SQLAlchemy declarative metadata against `alembic upgrade head` schema — fail if drift |
| `test_dep_pins.py` | Assert `pyproject.toml` pins `bcrypt>=4.2,<5`, `amazon-transcribe>=0.6.4`, `pyjwt[crypto]`, `alibabacloud-oss-v2`, `redis>=7.4` |
| `test_no_forbidden_imports.py` | Grep `app/` for `import passlib`, `import jose`, `import aioredis`, `import oss2` — fail on any match |
| `test_cors_no_wildcard.py` | Boot the app, assert configured CORS origins do NOT include `"*"` |
| `test_no_create_all.py` | Grep `app/` and `scripts/` for `Base.metadata.create_all` — fail on any match |
| `test_seed_refused_without_env.py` | Run `seed.py` against ApsaraDB DSN without `ALLOW_SEED=1` — assert `SeedRefusedError` raised |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ApsaraDB instance reachable from dev machine over TLS | FOUND-05, D-11, D-22 | Cloud provisioning is human-driven and varies per environment; no automated test should assume the instance exists during `/gsd-execute-phase` | `uv run python -c "import asyncio, asyncpg; asyncio.run(asyncpg.connect(<DSN>, ssl='require')).close()"` succeeds |
| `make seed` creates 3 demo accounts that can be logged into manually | DATA-07 | Phase 2 owns auth; Phase 1 only seeds the bcrypt hashes | After seed, `psql ... -c "SELECT email FROM users WHERE email IN ('siti@gingergig.my','amir@gingergig.my','faiz@gingergig.my');"` returns 3 rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (pytest config, conftest, deps)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills the task map

**Approval:** pending
