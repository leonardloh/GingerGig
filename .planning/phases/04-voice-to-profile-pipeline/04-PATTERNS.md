# Phase 4 — Voice-to-Profile Pipeline: Pattern Map (GSD)

**Objective:** Point implementers at **existing repo patterns** for routers, schemas, deps, DB, errors, and tests; flag **gaps** that Phase 4 must introduce (WS, streaming SDK shell, Qwen service).

**Sources:** `04-RESEARCH.md`, `ROADMAP.md`, `backend/app/**`, `backend/tests/**`, `backend/pyproject.toml`.

---

## 1. Files to create / modify (closest analogs)

| Target | Action | Closest analog |
|--------|--------|------------------|
| `app/routers/voice.py` | Replace stub with WS + HTTP routes | `app/routers/auth.py` (router prefix, async handlers, `HTTPException`); `app/routers/elder.py` (type aliases, elder guard) |
| `app/schemas/voice.py` (or split) | Create | `app/schemas/auth.py` + `app/schemas/persona.py` (response/request shapes, FE-facing field names) |
| `app/services/qwen_service.py` | Create | **No** analog — new; only `app/core/config.py` (`dashscope_*`) and `openai` in `pyproject.toml` are prerequisites |
| `app/integrations/transcribe_streaming.py` | Create | **No** full analog; guardrails in `tests/test_no_forbidden_imports.py` + dep pin in `tests/test_dep_pins.py` |
| `app/integrations/transcribe_batch.py` | Create | New; boto3 is allowed here (not in streaming module) |
| `app/services/voice_service.py` | Create | Orchestration is new; **reuse** `require_role` from `app/services/persona_queries.py` for elder checks |
| `app/models/voice_session.py` + Alembic | Extend | `app/models/voice_session.py` as-is; migration style from Phase 1 Alembic |
| `app/core/config.py` | Extend only if new envs | Already has `aws_region`, `s3_audio_bucket`, DashScope — extend minimally |
| `app/deps/auth.py` | Optional doc / signature alignment | `get_current_user_ws` **already** implements JWT-from-token + DB user load (AUTH-06) |
| `app/main.py` | Unchanged except docstrings if needed | Router already `include_router(voice_router.router, prefix=API)` |
| `tests/test_voice_*.py` | Create | `tests/test_auth_demo.py` (httpx + JSON assertions); `tests/conftest.py` (overrides) |
| `tests/test_qwen_*.py` (optional) | Create | `tests/test_error_envelope.py` (status + body shape) |
| Guardrail tests | Extend | `tests/test_no_forbidden_imports.py` (add rule for **streaming** file if split warrants) |
| `backend/pyproject.toml` | Unchanged unless new deps | `amazon-transcribe`, `boto3`, `openai` already present |

---

## 2. Exact patterns to copy

### 2.1 Router module layout

- **Router object:** `APIRouter(prefix="/voice-to-profile", tags=["voice"])` — keep prefix; `main.py` adds `/api/v1` (see `app/main.py` includes).
- **Imports:** `typing.Annotated`, `fastapi` (`APIRouter`, `Depends`, `HTTPException`, `status`, and for WS: `WebSocket`, `Query` as needed).
- **Elder-only:** same as elder routes — `require_role(current_user, "elder")` from `app/services/persona_queries.py` after resolving the authenticated `User` (see `elder.py` `CurrentUserDep` + `require_role`).

**Type-alias deps (HTTP routes):** copy from `elder.py`:

```30:31:backend/app/routers/elder.py
DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]
```

Use `DbDep` / `CurrentUserDep` (or the same `Annotated[...]` inline) on `POST`/`GET` batch and presign routes.

### 2.2 WebSocket auth (no `Depends` on bearer header)

- **Analog:** `get_current_user_ws` in `app/deps/auth.py` — takes **raw `token` string + `AsyncSession`**, reuses `_user_from_token` (same 401 behaviour as `get_current_user`).

```49:50:backend/app/deps/auth.py
async def get_current_user_ws(token: str | None, db: AsyncSession) -> User:
    return await _user_from_token(token, db)
```

- **Call pattern:** obtain `token` from query (e.g. `token: str | None = Query(None)` on the WebSocket route), open DB with `get_sessionmaker(app.state.engine)` + `async with sm() as db`, then `user = await get_current_user_ws(token, db)`, then `require_role(user, "elder")`. **Lock the query param name** (`token` vs `access_token`) in implementation and document for Phase 5 client parity (`04-RESEARCH.md` §3.1).
- There is **no** existing `WebSocket` route in the repo; this is **composition** of existing auth helpers + new WS lifecycle (see §7).

### 2.3 Pydantic schemas and camelCase (frontend parity)

- **Analog:** `app/schemas/persona.py` and `app/schemas/auth.py` use **camelCase Python field names** matching JSON (`userId`, `accessToken`, `titleMs`, `matchScore`) — not `Field(alias=...)`. Phase 4 should follow the same for `jobId`, `s3Key`, `estimatedSeconds`, `uploadUrl`, `expiresIn`, and `ListingDraft` fields aligned with `04-RESEARCH.md` / roadmap.
- **Response models:** use `response_model=...` on HTTP routes where appropriate (`auth.py` `Session`, `UserProfile`).

### 2.4 HTTP errors and status codes

- **Analog:** `auth.py` / `elder.py` use `HTTPException(status_code=status.HTTP_*, detail="...")`.
- **Envelope:** `app/core/errors.py` maps `StarletteHTTPException` to `{status, message}`; **422** adds `detail` for validation. Any `HTTPException`’s `detail` becomes `message` in the JSON body.

```31:35:backend/app/core/errors.py
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _envelope(exc.status_code, exc.detail or "Request failed")
```

- **Phase 4 specifics (per research/roadmap):** Qwen hard-fail → **502** with `detail="Listing extraction failed"` (or equivalent user-safe string); **401** for bad/missing JWT; **403** for non-elder; validation → **422** (automatic). **Do not** return raw model dumps or stack traces in JSON (`debug=False` in `app/main.py`).

### 2.5 DB session: request scope vs background work

- **Request scope:** `get_db` in `app/deps/db.py` — `yield` session, **commit** on success, **rollback** on exception.

```9:17:backend/app/deps/db.py
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

- **Background / fire-and-forget:** **No** local analog in repo — **required pattern** from `04-RESEARCH.md`: **never** pass this request `AsyncSession` into `BackgroundTasks` or `asyncio.create_task`. Use `get_sessionmaker(app.state.engine)` and `async with sm() as session:` **inside** the background coroutine (same factory as `get_db` uses: `app/db/session.py` `get_sessionmaker` + `build_engine`).

### 2.6 Enums and ORM

- **Analog:** `app/core/enums.py` already defines `VoiceLanguage`, `VoiceMode`, `VoiceSessionStatus` — use in Pydantic and when writing `VoiceSession` rows.
- **Model:** `app/models/voice_session.py` — JSONB `listing_draft`, text `transcript`/`error`; CHECKs match enum string sets. New columns for batch correlation need a **new migration** (research §1, §8).

### 2.7 Settings

- **Analog:** `app/core/config.py` — `Settings` with `Field` defaults; `aws_region` default `ap-southeast-1`, `s3_audio_bucket`, `dashscope_api_key` / `dashscope_base_url`. Voice code should **read region from settings** (or explicit `ap-southeast-1`) so tests can override if needed.

### 2.8 Pytest: async client, DB isolation, JSON assertions

- **Analog:** `tests/conftest.py` — session `engine`, per-test `db_session` with **SAVEPOINT rollback**, `httpx.AsyncClient` + `ASGITransport(app=app)`, **`app.dependency_overrides[get_db]`** wired to the test session; clears overrides in `finally`.
- **Markers:** `pytestmark = pytest.mark.asyncio(loop_scope="session")` in async test modules (see `test_auth_demo.py`, `test_error_envelope.py`).
- **Assertion style:** exact envelope for expected errors, e.g. `assert response.json() == {"status": 401, "message": "Invalid credentials"}` (`test_auth_demo.py`).

```23:30:backend/tests/test_auth_demo.py
async def test_invalid_demo_login_returns_api_error(client) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "demo"},
    )

    assert response.status_code == 401
    assert response.json() == {"status": 401, "message": "Invalid credentials"}
```

- **`TEST_DATABASE_URL`:** conftest **requires** Postgres (not SQLite) — same for voice tests that hit JSONB / real migrations.

### 2.9 Static guardrail / grep tests

- **Project-wide forbidden imports + boto3 streaming misuse:**

```16:27:backend/tests/test_no_forbidden_imports.py
def test_no_forbidden_imports_or_boto3_streaming_misuse() -> None:
    offenders: list[str] = []
    for root in (BACKEND / "app", BACKEND / "scripts"):
        for py_file in root.rglob("*.py"):
            src = py_file.read_text()
            for pattern in FORBIDDEN_IMPORT_PATTERNS:
                if re.search(pattern, src, re.MULTILINE):
                    offenders.append(f"{py_file}: matches /{pattern}/")

            if "boto3" in src and "start_stream_transcription" in src:
                offenders.append(
                    f"{py_file}: boto3 cannot be used for Transcribe Streaming"
                )
```

- **Per-phase runtime file content (example — auth/bcrypt):** read specific files and `assert` forbidden substrings absent (`test_auth_dependencies.py` `test_auth_phase_does_not_use_bcrypt_runtime`).
- **Dep pins:** `tests/test_dep_pins.py` enforces `amazon-transcribe>=0.6.4` in `pyproject.toml`.

Phase 4 can add a **narrow** grep test: e.g. `app/integrations/transcribe_streaming.py` must not `import boto3` (or must not call Transcribe streaming via boto3), **if** the file tree split makes the global `start_stream_transcription` check insufficient.

---

## 3. Anti-patterns to avoid (project + PITFALLS cross-ref)

| Anti-pattern | Why | Analog / rule |
|--------------|-----|----------------|
| `boto3` for Transcribe **Streaming** | Wrong SDK; project forbids the streaming API path | `test_no_forbidden_imports.py`; use `amazon-transcribe` in a dedicated integration module |
| Passing request `AsyncSession` into background batch job | Stale connection / wrong transaction scope | `04-RESEARCH.md` §1.5; use new session in task |
| Inline Transcribe batch poll in `POST /batch` | Timeouts / 504 | Roadmap SC; return `jobId` immediately |
| Leaking `detail` with Python tracebacks on 500 | Breaks D-17 / FE contract | `app/core/errors.py` + `test_error_envelope.py` |
| `Base.metadata.create_all` | Project rule: Alembic only | `tests/test_no_create_all.py` (Phase 1) |
| `passlib`, `jose`, etc. | Forbidden | `test_no_forbidden_imports.py` |
| Ad-hoc JWT decode outside `core/security.py` | Auth centralisation | All JWT through `decode_jwt` / `get_current_user` / `get_current_user_ws` |

---

## 4. Open pattern gaps (no or weak local analog)

1. **WebSocket route + tests** — No `WebSocket` handler exists yet. **Implementation:** Starlette/FastAPI `WebSocket`, `accept`, JSON/binary frames, `WebSocketDisconnect`, `finally` for upstream stream end + task cancellation (research). **Tests:** `httpx` ASGITransport is not the standard tool for WS; likely **`websockets` client** against ASGI app, or Starlette `TestClient` WebSocket, with mocks for Transcribe — **define in Phase 4 plan** and keep fixtures alongside `conftest.py` patterns.
2. **`amazon-transcribe` streaming wrapper** — Dependency pinned (`pyproject.toml` + `test_dep_pins.py`) but **no** application code yet. New module owns client lifecycle, region=`ap-southeast-1`, PCM params (`04-RESEARCH.md` §5.1).
3. **`boto3` Transcribe batch + S3** — Allowed, but no existing `integrations/` pattern in repo; mirror **one module per concern** and explicit region in client construction.
4. **Qwen / `extract_listing`** — `openai` package present; **no** `services/qwen_service.py` yet. **No** analog to Phase 3’s “forbidden live AI in runtime files” test for *persona* code (`test_persona_locale_and_authz.py` *blocks* Qwen in persona paths) — voice **should** import Qwen/OpenAI; do **not** copy that test onto voice modules.
5. **Background job + poller** — Logic must be new; only the **DB session rule** is documented (§2.5). Consider `fastapi.BackgroundTasks` or `asyncio.create_task` with explicit error handling and DB updates.
6. **S3 presigned URL helper** — Not in repo; new small integration (Alibaba OSS exists in deps, but **audio bucket** is AWS `s3_audio_bucket` in config).
7. **Throttle ≤4 partial WS messages/sec** — Spec’d in research (PITFALLS #13); **no** existing helper; implement in `voice_service` (time-based + dedupe last partial).

---

## 5. Quick checklist for implementers

- [ ] HTTP routes: `DbDep` / `CurrentUserDep` + `require_role(..., "elder")` where required.
- [ ] WS: query `token` + `get_current_user_ws` + `require_role`; **90s** watchdog + `finally` cleanup.
- [ ] Schemas: camelCase fields consistent with `persona.py` / `auth.py`.
- [ ] Failures: `HTTPException` / global handlers → `ApiError`-shaped JSON; 502 for extraction failure per roadmap.
- [ ] Tests: `client` fixture + `asyncio` session scope; optional grep extension for streaming module imports.
- [ ] After stub removal: **update** misleading “Phase 5” comment in current `voice.py` (research §8).

---

*GSD pattern map for GingerGig Phase 4 — Voice-to-Profile Pipeline*  
*Written: 2026-04-26*

## PATTERN MAPPING COMPLETE

This file maps Phase 4 work to **concrete** patterns in `auth`, `elder`, `persona` schemas, `deps` (including `get_current_user_ws`), `get_db` / session factory, `core/errors` envelopes, and **pytest** + **grep** guardrails. It also marks **new** work: first WebSocket route, `amazon-transcribe` and batch AWS integrations, Qwen service, S3 presign, background-session discipline, and WS-oriented tests without an existing in-repo example.
