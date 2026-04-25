# Stack Research

**Domain:** Multi-cloud FastAPI backend (AWS edge AI + Alibaba data plane) for a hyperlocal gig platform
**Researched:** 2026-04-25
**Confidence:** HIGH (versions verified against PyPI 2026-04-25; framework choices verified against official docs)

## Scope reminder

User has locked the high-level stack (FastAPI + `uv` + Python ≥3.12 + async SQLAlchemy + asyncpg, multi-cloud AWS+Alibaba). This document is **prescriptive at the package level** — exact PyPI names, minimum versions, and the "which library" answer for each integration point — not a framework debate.

## Recommended Stack

### Core Technologies

| Technology | Min Version | Purpose | Why Recommended |
|---|---|---|---|
| Python | `>=3.12,<3.14` | Language runtime | User-locked. 3.12 stabilized the `asyncio` task group and per-interpreter GIL changes; 3.14 (released 2025-10) has working wheels for everything below but pin upper bound to avoid surprise C-ext breaks during the hackathon. |
| `fastapi` | `>=0.136.1` | HTTP + WebSocket framework | User-locked. 0.136 is current PyPI release; ships native WebSocket support (no extra lib needed for the voice-to-profile streaming endpoint). |
| `uvicorn[standard]` | `>=0.46.0` | ASGI server | The `[standard]` extra pulls in `httptools`, `uvloop`, `websockets`, `watchfiles`, `python-dotenv` — required for production-grade WebSocket performance and dev `--reload`. Plain `uvicorn` is too bare for a WS workload. |
| `sqlalchemy[asyncio]` | `>=2.0.49` | Async ORM | User-locked. The `[asyncio]` extra is a no-op metadata marker but documents intent. `2.0.x` is the modern Mapped/typed-ORM API (do not write 1.x-style `Column` declarations). |
| `asyncpg` | `>=0.31.0` | Postgres driver | User-locked. SQLAlchemy 2 async pairs natively with asyncpg via the `postgresql+asyncpg://` URL prefix. **Do not** also install `psycopg2` — they conflict on URL parsing and asyncpg is faster. |
| `pydantic` | `>=2.13.3` | Request/response models | FastAPI 0.136 requires Pydantic v2. v2.13 has the stable `model_validator`, `Field(serialization_alias=...)` for `camelCase ↔ snake_case` mapping (the frontend sends `requestorInitials` / `kycStatus` / `accessToken` — server-side `snake_case` needs aliases to round-trip cleanly). |
| `pydantic-settings` | `>=2.14.0` | Env / config loading | Replaces `BaseSettings` from Pydantic v1 (which was removed). Reads `.env` directly — no need for separate `python-dotenv`. |
| `alembic` | `>=1.18.4` | DB migrations | Standard SQLAlchemy companion. Use `alembic init -t async migrations` to scaffold an asyncpg-aware env. Required for shipping schema changes between phases without manual SQL. |

### AWS SDKs (Singapore region, `ap-southeast-1`)

| Library | Min Version | Purpose | Notes |
|---|---|---|---|
| `boto3` | `>=1.42.96` | Sync AWS client (S3 presign, Textract, Rekognition, Transcribe Batch) | Use for one-shot calls (S3 `generate_presigned_url`, `start_transcription_job`, Textract `analyze_id`, Rekognition `compare_faces`). Blocks the event loop — wrap in `anyio.to_thread.run_sync` or `asyncio.to_thread`. |
| `botocore` | `>=1.42.96` | Pinned via boto3 | Don't add explicitly; boto3 pins it. Listing it separately just creates resolver thrash. |
| `amazon-transcribe` | `>=0.6.4` | **Streaming** ASR for `en-US` / `zh-CN` | **CRITICAL: This is the only correct package for Transcribe Streaming.** boto3 cannot do streaming — the streaming endpoint uses a custom HTTP/2 event-stream protocol that boto3 does not implement. Package name on PyPI is `amazon-transcribe`; repo is `awslabs/amazon-transcribe-streaming-sdk`. AWS labels it "proof of concept, no support commitment" but it's the only Python option AWS ships, and it's been stable since 2020 with a release as recent as 2025-05. Use `TranscribeStreamingClient(region="ap-southeast-1")` and an async `EventHandler`. |
| `aioboto3` | `>=15.5.0` *(optional)* | Fully-async boto3 wrapper | Only add if a phase needs concurrent S3 / Textract / Rekognition calls without thread overhead. For the hackathon path (1 user, ≤5 concurrent KYC jobs) plain boto3 in a threadpool is simpler. **Skip unless profiling shows blocking is hurting WS latency.** |

### Alibaba Cloud SDKs (Malaysia region, `ap-southeast-3`)

| Library | Min Version | Purpose | Notes |
|---|---|---|---|
| `alibabacloud-oss-v2` | `>=1.2.5` | Alibaba OSS (provider photos) | **The v2 SDK is the recommended choice for new projects.** It supports the V4 signature algorithm; from 2025-03-01 the V1 algorithm is no longer available to new Alibaba accounts. Older `oss2` (2.19.x) still works but is the legacy SDK based on the original 1.0 codebase. New project → `alibabacloud-oss-v2`. (If the team already knows `oss2` from prior work, that's the only reason to fall back.) |
| `dashscope` | `>=1.25.17` | Qwen / DashScope native SDK | Vendor SDK with first-class support for Qwen-specific features (multimodal, doc OCR, function calling). |
| `openai` | `>=2.32.0` *(alternative)* | OpenAI-compatible client pointed at DashScope | DashScope ships an OpenAI-compatible endpoint at `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. Use `OpenAI(base_url=..., api_key=DASHSCOPE_API_KEY)` and call `chat.completions.create(response_format={"type": "json_object"})` — exactly the pattern documented in `MULTI-CLOUD-ARCHITECTURE.md`. **Recommendation: use `openai` SDK in compatible mode for the JSON-extraction path** — it's the same API surface most engineers already know, and `response_format={"type": "json_object"}` is supported on `qwen-max`, `qwen-plus`, `qwen-turbo`. Keep `dashscope` as a fallback only if a Qwen-only feature is needed (it isn't, for v1). |
| `redis` | `>=7.4.0` | Tair (Redis-compatible) client | **Do not install a separate `aioredis` package.** `aioredis` was merged into `redis-py` years ago — `redis-py>=4.2` ships native asyncio at `redis.asyncio.Redis`. Tair is wire-compatible with Redis OSS, so `redis-py` connects directly with no Alibaba-specific client. The legacy `aioredis` package on PyPI is abandoned. |

### Auth / Security

| Library | Min Version | Purpose | Notes |
|---|---|---|---|
| `pyjwt[crypto]` | `>=2.12.1` | JWT issue / verify | **Use PyJWT, not python-jose.** FastAPI's official tutorial moved off `python-jose` in 2024 because that project is effectively unmaintained (ANN security advisories, sparse releases). PyJWT is actively maintained. The `[crypto]` extra pulls `cryptography` for RS256/ES256 — leave at HS256 for the hackathon (single backend instance, shared secret). |
| `bcrypt` | `>=4.2.0,<5.0.0` | Password hashing | **CRITICAL VERSION CONSTRAINT.** `bcrypt 5.0.0` (released 2025-09-25) removed the `__about__` attribute and silently broke any code that does backend introspection. If you also install `passlib`, this manifests as a misleading "password cannot be longer than 72 bytes" error. **Pin to `>=4.2.0,<5.0.0` and call `bcrypt` directly** (see "What NOT to use" below). |
| `python-multipart` | `>=0.0.26` | FastAPI form-data parsing | Required for any `multipart/form-data` endpoint (login form, file upload). FastAPI imports it lazily and raises a clear error if missing. |
| `email-validator` | `>=2.3.0` | Pydantic `EmailStr` support | Pydantic v2's `EmailStr` requires this; not a transitive of pydantic. |

### Logging / Observability

| Library | Min Version | Purpose | Notes |
|---|---|---|---|
| `structlog` | `>=25.5.0` | Structured JSON logs | Hackathon-tier observability: JSON to stdout, scraped by ECS console / CloudWatch. Pairs with `uvicorn --log-config logging.json` to format access logs identically. |
| `orjson` | `>=3.11.8` *(optional)* | Faster JSON serialization | Drop-in via `app = FastAPI(default_response_class=ORJSONResponse)`. ~3x faster than stdlib `json` for the listings-search response which can be ~50KB after the cache hit. Worth adding for the demo. |

### Development tooling

| Tool | Purpose | Notes |
|---|---|---|
| `uv` `>=0.11.7` | Package manager + venv + lockfile | User-locked. `uv sync` (CI/CD) installs from `uv.lock`; `uv add <pkg>` (dev) updates `pyproject.toml` + lock atomically. **Never** mix `pip install` into a uv-managed project — it bypasses the lock. |
| `ruff` `>=0.15.12` | Lint + format | Replaces `black` + `isort` + `flake8` in one binary. Configure via `[tool.ruff]` in `pyproject.toml`. |
| `pytest` `>=9.0.3` | Test runner | |
| `pytest-asyncio` `>=1.3.0` | Async test fixtures | Required to test the async DB layer and the WebSocket handler. Use `asyncio_mode = "auto"` in pyproject. |
| `httpx` `>=0.28.1` | Test client + general HTTP | FastAPI's `TestClient` shim is built on httpx. Also useful as the OpenAI SDK's transport (auto-picked up). |

## Installation

The user has chosen `uv` — these are the commands, not `pip install`.

```bash
# 1. Bootstrap (run once)
cd backend
uv init --package gingergig-api --python ">=3.12,<3.14"

# 2. Core runtime
uv add \
  'fastapi>=0.136.1' \
  'uvicorn[standard]>=0.46.0' \
  'sqlalchemy[asyncio]>=2.0.49' \
  'asyncpg>=0.31.0' \
  'pydantic>=2.13.3' \
  'pydantic-settings>=2.14.0' \
  'alembic>=1.18.4' \
  'email-validator>=2.3.0' \
  'python-multipart>=0.0.26'

# 3. AWS — Singapore (ap-southeast-1)
uv add \
  'boto3>=1.42.96' \
  'amazon-transcribe>=0.6.4'

# 4. Alibaba — Malaysia (ap-southeast-3)
uv add \
  'alibabacloud-oss-v2>=1.2.5' \
  'openai>=2.32.0' \
  'redis>=7.4.0'

# 5. Auth
uv add \
  'pyjwt[crypto]>=2.12.1' \
  'bcrypt>=4.2.0,<5.0.0'

# 6. Logging / perf
uv add \
  'structlog>=25.5.0' \
  'orjson>=3.11.8'

# 7. Dev (PEP 735 dependency group)
uv add --dev \
  'ruff>=0.15.12' \
  'pytest>=9.0.3' \
  'pytest-asyncio>=1.3.0' \
  'httpx>=0.28.1'

# 8. Run
uv run uvicorn app.main:app --reload --port 8000

# 9. Lockfile workflows
uv sync                  # CI / fresh checkout — install exactly what's locked
uv sync --frozen         # CI hard-fail if pyproject changed without relocking
uv lock --upgrade        # bump everything within constraints (manual, off-CI)
```

### Resulting `pyproject.toml` shape

```toml
[project]
name = "gingergig-api"
version = "0.1.0"
description = "GingerGig FastAPI backend (Alibaba Cloud)"
requires-python = ">=3.12,<3.14"
dependencies = [
  "fastapi>=0.136.1",
  "uvicorn[standard]>=0.46.0",
  "sqlalchemy[asyncio]>=2.0.49",
  "asyncpg>=0.31.0",
  "pydantic>=2.13.3",
  "pydantic-settings>=2.14.0",
  "alembic>=1.18.4",
  "email-validator>=2.3.0",
  "python-multipart>=0.0.26",
  "boto3>=1.42.96",
  "amazon-transcribe>=0.6.4",
  "alibabacloud-oss-v2>=1.2.5",
  "openai>=2.32.0",
  "redis>=7.4.0",
  "pyjwt[crypto]>=2.12.1",
  "bcrypt>=4.2.0,<5.0.0",
  "structlog>=25.5.0",
  "orjson>=3.11.8",
]

[dependency-groups]
dev = [
  "ruff>=0.15.12",
  "pytest>=9.0.3",
  "pytest-asyncio>=1.3.0",
  "httpx>=0.28.1",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "B", "UP", "RUF"]

[tool.pytest.ini_options]
asyncio_mode = "auto"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

Note on dependency groups (PEP 735): `uv add --dev` writes into `[dependency-groups].dev` (modern) by default in `uv >= 0.5`, not the older `[tool.uv.dev-dependencies]`. The `dev` group auto-installs on `uv sync` / `uv run` unless `--no-dev` is passed.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|---|---|---|
| `pyjwt` | `python-jose` | Only if the codebase already imports it. python-jose 3.5 was released 2025-05 (snapped out of dormancy) but FastAPI's tutorial has moved on, and PyJWT is the safer maintained bet. |
| `bcrypt` (direct) | `passlib[bcrypt]` | Don't. passlib 1.7.4 is the latest, hasn't had a release since 2020, and breaks against `bcrypt>=4.1`. Pin/use bcrypt directly. |
| `alibabacloud-oss-v2` | `oss2` | If the team already wrote OSS code with the old SDK. oss2 still works but is legacy and uses the deprecated V1 signature path by default. |
| `openai` (compatible mode) for Qwen | `dashscope` native SDK | If you need a Qwen-only feature (Qwen-Doc-Turbo OCR, Qwen-VL multimodal). For plain JSON-mode chat completions the OpenAI SDK is fewer surprises. |
| `boto3` (in threadpool) | `aioboto3` | If profiling shows boto3's blocking calls hurting WS latency under concurrent KYC + Transcribe Batch polling. Otherwise the dependency tree gets heavier with no real win. |
| `redis-py` async | `aioredis` | Don't use `aioredis` — abandoned, merged into redis-py. |
| `uvicorn` | `hypercorn`, `granian` | Only if you need HTTP/3 (hypercorn) or extreme throughput (granian). FastAPI's docs and ecosystem assume uvicorn; stick with it. |
| `alembic` | `sqlalchemy-utils` migrations / hand-rolled SQL | For a hackathon you could hand-roll DDL, but seeding 8+ tables across phases gets painful fast. Alembic pays for itself by phase 2. |

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| `bcrypt>=5.0.0` (with passlib) | bcrypt 5.0 removed `__about__`; passlib 1.7.4 reads it for backend detection and explodes with a confusing "password longer than 72 bytes" error. ([GH bcrypt #1079](https://github.com/pyca/bcrypt/issues/1079)) | `bcrypt>=4.2.0,<5.0.0`, used **directly** (no passlib): `bcrypt.hashpw(pw.encode(), bcrypt.gensalt())` / `bcrypt.checkpw(pw.encode(), hashed)`. |
| `passlib` | Effectively unmaintained since 2020. Detection logic breaks against any modern bcrypt. | Call `bcrypt` directly. It's a 4-line wrapper. |
| `python-jose` | FastAPI removed it from the official OAuth2 JWT tutorial because the project sat dormant for years and shipped CVEs unpatched. Even after the 3.5.0 revival the ecosystem has moved. | `pyjwt[crypto]`. |
| `boto3` for Transcribe Streaming | boto3 has **no streaming Transcribe support** (HTTP/2 event-stream protocol isn't implemented). You will spend an hour on `client.start_stream_transcription` errors before realizing it's not in boto3. | `amazon-transcribe` (separate `awslabs/amazon-transcribe-streaming-sdk` repo). Use boto3 only for `start_transcription_job` (the **batch** API). |
| `aioredis` (PyPI package) | Abandoned. Merged into redis-py. Will pull in deprecated transitive deps. | `redis>=7.4.0`, import as `from redis.asyncio import Redis`. |
| `oss2` for new code | Legacy SDK on V1 signature path; new Alibaba accounts can no longer use V1 sigs as of 2025-03-01. | `alibabacloud-oss-v2>=1.2.5`. |
| Plain `uvicorn` (no `[standard]`) | Missing `websockets`, `httptools`, `uvloop` → bad WS performance and weird perf gaps. | `uvicorn[standard]>=0.46.0`. |
| `psycopg2` / `psycopg2-binary` alongside asyncpg | Two Postgres drivers in the resolver causes URL/dialect ambiguity and platform wheel headaches (`psycopg2` needs libpq, `psycopg2-binary` is musl-fragile). | Stick with asyncpg only. If you need a sync driver for Alembic offline mode, use `psycopg[binary]>=3.2` (psycopg3) — modern, separate name, no conflict. |
| `pydantic` v1 (`<2`) | FastAPI 0.100+ targets Pydantic v2. v1 patterns (`Config` class, `dict()`) are silently wrong on v2. | `pydantic>=2.13`, use `model_config = ConfigDict(...)` and `model_dump()`. |
| `python-dotenv` (alone) | Redundant when `pydantic-settings` is present — that already reads `.env`. | `pydantic-settings`'s `BaseSettings(model_config=SettingsConfigDict(env_file=".env"))`. |

## Stack Patterns by Variant

**If a phase introduces concurrent KYC throughput (>10 simultaneous Textract+Rekognition jobs):**
- Add `aioboto3>=15.5.0` so KYC orchestration doesn't pin worker threads
- Otherwise plain `boto3` in `asyncio.to_thread` is simpler and good enough for the demo

**If a phase needs production Redis TLS to Tair:**
- `redis-py` already supports it via `Redis(ssl=True, ssl_ca_certs=...)` — no extra package
- Use Tair connection string `rediss://` (note the double `s`) for TLS

**If a phase wires Qwen function-calling instead of plain JSON mode:**
- Stay on `openai>=2.32.0` (compatible mode supports tools)
- Only switch to `dashscope` SDK if you hit a feature gap, which the v1 prompts in `MULTI-CLOUD-ARCHITECTURE.md` do not require

**If a phase adds AWS Lambda for the KYC orchestrator (per `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md`):**
- Lambda is a deployment artifact, not a Python dep — no PyPI package change
- Use `boto3` (Lambda runtime ships it) and `aws-lambda-powertools` only if you start adding tracing

## Version Compatibility

| Package A | Compatible With | Notes |
|---|---|---|
| `fastapi>=0.136` | `pydantic>=2.13` | FastAPI 0.100+ is Pydantic v2; do not pin pydantic <2. |
| `sqlalchemy>=2.0.49` | `asyncpg>=0.31`, Python 3.12+ | URL prefix must be `postgresql+asyncpg://`. SQLAlchemy 2.0 typed Mapped[] requires Python 3.10+; we're on 3.12. |
| `bcrypt>=4.2,<5` | (alone, no passlib) | bcrypt 5.0.0 (2025-09-25) is incompatible with passlib 1.7.4. Pin **upper bound** explicitly. |
| `amazon-transcribe>=0.6.4` | `aiohttp>=3.9` (transitive) | Pulls aiohttp + h2 transitively. Don't add aiohttp explicitly unless you need it directly. |
| `redis>=7.4` | `redis.asyncio` API | Old `aioredis` package will not coexist cleanly — uninstall it if it shows up transitively. |
| `pydantic-settings>=2.14` | `pydantic>=2.13` | pydantic-settings 2.x requires pydantic v2. |
| `python-multipart>=0.0.20` | `fastapi>=0.115` | FastAPI 0.115 changed how it imports multipart; older 0.0.x versions miss the `Multipart` class export. |
| `uvicorn[standard]>=0.46` | `websockets>=14` (transitive) | The `[standard]` extra pins a working `websockets` for you. Don't add websockets directly. |
| `openai>=2.0` (DashScope compat) | DashScope `compatible-mode/v1` endpoint | Set `base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"` (Singapore/Intl) — `dashscope.aliyuncs.com` is China-only. |

## Sources

- PyPI JSON metadata, fetched 2026-04-25 (HIGH confidence — authoritative version data):
  - fastapi 0.136.1, sqlalchemy 2.0.49, asyncpg 0.31.0, uvicorn 0.46.0
  - boto3 1.42.96, amazon-transcribe 0.6.4 (last release 2025-05-05), aioboto3 15.5.0
  - alibabacloud-oss-v2 1.2.5, oss2 2.19.1, dashscope 1.25.17, openai 2.32.0
  - redis 7.4.0, pydantic 2.13.3, pydantic-settings 2.14.0
  - pyjwt 2.12.1, bcrypt 5.0.0 (avoided), passlib 1.7.4 (avoided)
  - alembic 1.18.4, structlog 25.5.0, orjson 3.11.8, ruff 0.15.12
  - python-multipart 0.0.26, email-validator 2.3.0, httpx 0.28.1
  - pytest 9.0.3, pytest-asyncio 1.3.0, websockets 16.0, uv 0.11.7
- [awslabs/amazon-transcribe-streaming-sdk](https://github.com/awslabs/amazon-transcribe-streaming-sdk) — confirms boto3 cannot do streaming, this is the only Python option (HIGH)
- [boto/boto3 issue #2296: Transcribe Streaming with Python](https://github.com/boto/boto3/issues/2296) — confirms streaming is not in boto3 and not planned (HIGH)
- [pyca/bcrypt issue #1079: Passlib 1.7.4 + bcrypt 5.0.0](https://github.com/pyca/bcrypt/issues/1079) — confirms 5.0 break (HIGH)
- [Alibaba Cloud OSS Python SDK V2 docs](https://www.alibabacloud.com/help/en/oss/developer-reference/get-started-with-oss-sdk-for-python-v2) — confirms v2 is recommended for new projects (HIGH)
- [aliyun/alibabacloud-oss-python-sdk-v2 GitHub](https://github.com/aliyun/alibabacloud-oss-python-sdk-v2) — confirms package name + Python ≥3.8 (HIGH)
- [DashScope OpenAI compatibility docs](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) — confirms compatible-mode endpoint and `response_format={"type": "json_object"}` (HIGH)
- [DashScope structured JSON output docs](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output) — confirms qwen-max/plus/turbo support strict JSON (HIGH)
- [Tair (Redis OSS-compatible) overview](https://www.alibabacloud.com/help/en/redis/product-overview/what-is-apsaradb-for-redis) — confirms wire-protocol compatibility, redis-py works direct (HIGH)
- [redis-py asyncio examples](https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html) — confirms `redis.asyncio` is the merged successor to aioredis (HIGH)
- [aio-libs-abandoned/aioredis-py](https://github.com/aio-libs-abandoned/aioredis-py) — confirms aioredis is abandoned (HIGH)
- [FastAPI discussion #11345: time to abandon python-jose](https://github.com/fastapi/fastapi/discussions/11345) — confirms PyJWT is the FastAPI-recommended path (HIGH)
- [astral-sh/uv dependency groups docs](https://docs.astral.sh/uv/concepts/projects/dependencies/) — confirms PEP 735 `[dependency-groups]` is the modern uv pattern (HIGH)

---
*Stack research for: multi-cloud FastAPI backend (AWS edge AI + Alibaba data plane)*
*Researched: 2026-04-25*
