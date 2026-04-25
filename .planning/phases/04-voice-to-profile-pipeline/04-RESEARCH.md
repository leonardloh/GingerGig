# Phase 4 — Voice-to-Profile Pipeline: Research (planning input)

**Objective:** What you need to know to **plan** Phase 4 well — implementation strategy, contracts, tests, validation hooks, and risks.

**Scope source:** `.planning/ROADMAP.md` (Phase 4), `VOICE-01`–`VOICE-07` in `.planning/REQUIREMENTS.md`.

**Dependencies:** Phase 2 auth (`get_current_user`, `get_current_user_ws` with JWT from query string on WebSocket). Phase 3 persona routers are **not** a hard dependency for the voice API surface; only elder role + `users.id` are required to own `voice_sessions` rows.

**Out of scope for this phase (per project):** Frontend UI changes and `ElderVoice` wiring — that is **Phase 5 (Frontend Wiring)**. This phase delivers backend endpoints, services, and tests so the typed client can be swapped later without contract drift.

---

## 1. Summary of implementation strategy

1. **Language split (locked in architecture):**
   - **Streaming path:** `en-US` and `zh-CN` only — AWS Transcribe **Streaming** (real-time partials + final transcript). Latency target **2–3s** from end-of-utterance to `ListingDraft` in the client (Transcribe final + Qwen + persist dominate).
   - **Batch path:** `ms-MY` and `ta-IN` — Transcribe Streaming does **not** support these languages; browser uploads audio to S3, backend runs **Transcribe Batch** (boto3), then the same Qwen extraction. Job must return **immediately** with `jobId`; work runs in a **background task** (8–12s end-to-end target, not inline in the HTTP request).

2. **SDK split (non-negotiable):**
   - **Streaming:** `amazon-transcribe>=0.6.4` only — **do not** use boto3 for streaming (no API support; see `PITFALLS.md` #2).
   - **Batch:** `boto3` `transcribe` client for `StartTranscriptionJob` / `GetTranscriptionJob` (and S3 read URIs for transcript files).
   - **Region:** Explicit **`ap-southeast-1`** for both streaming client construction and boto3 client/session (avoid implicit `us-east-1`).

3. **Qwen (DashScope) extraction — single function used by both paths:**
   - Implement `services/qwen_service.py::extract_listing(transcript, language)` calling the **OpenAI-compatible** base URL from settings (`dashscope_base_url` + `openai` client or `httpx`).
   - Use `response_format={"type":"json_object"}`.
   - **Strip markdown fences** from raw text before `json.loads` / Pydantic.
   - On **`ValidationError`:** retry **once** with the same prompt + appended validation error text.
   - On persistent failure: respond with **`502`** and body matching frontend `ApiError` shape, e.g. `{ "status": 502, "message": "Listing extraction failed" }` (and **no** raw stack or model dump in the body).

4. **WebSocket lifecycle (quotas + demo repeatability):**
   - **`try` / `finally`:** always end the upstream stream (`input_stream.end_stream()` or equivalent) and **cancel** the partial-transcript reader task on every exit path (normal completion, `WebSocketDisconnect`, errors).
   - **90s max-session** watchdog: cancel the whole handler if exceeded (defence against hung loops during 30+ demo attempts).
   - **Partial fan-out:** coalesce and **throttle** partial transcripts to the browser to **≤4 messages/sec** (see `PITFALLS.md` #13). Skip duplicate consecutive partial text.

5. **Async jobs and DB (critical):**
   - **Never** pass request-scoped `AsyncSession` into `BackgroundTasks` / `asyncio.create_task` for batch processing. **Open a new session** inside the task (new session from `async_session_maker`, same pattern as other background work — `PITFALLS.md` #8).

6. **Persistence:**
   - Use existing **`voice_sessions`** table (`elder_id`, `language`, `mode` `stream`/`batch`, `status`, `transcript`, `listing_draft` JSONB, `error`). **Schema gap to resolve in plan:** `VOICE-04`/`VOICE-05` need **batch job correlation** (S3 key, Transcribe job name/id, optional `job_id` for polling). Current migration (`0001_initial_schema.py`) has **no** `audio_s3_key` or `transcribe_job_id` — expect **a small Alembic migration** (or a dedicated `voice_batch_jobs` table) so `GET` status can be authoritative and idempotent.

---

## 2. Concrete backend files likely created or modified

| Area | Action | Notes |
|------|--------|--------|
| `app/routers/voice.py` | **Replace** stub with WS route + batch POST + batch GET (+ optional presign route) | Remove `501` `__stub`; mount WebSocket with `get_current_user_ws` |
| `app/main.py` | **Modify** | Register voice router; ensure CORS does not break WS (unchanged for same-origin dev patterns) |
| `app/core/config.py` | **Possibly extend** | Already has `aws_region`, `s3_audio_bucket`, DashScope — validate all voice envs in `.env.example` |
| `app/deps/auth.py` | **Minor** | `get_current_user_ws(token, db)` exists — caller must pass `token` from WS query string; document param name (`token` vs `access_token` — **pick one in plan and match Phase 5 client**) |
| `app/schemas/voice.py` (or `listing.py`) | **Create** | `ListingDraft`, batch request/response, WS message DTOs, presign request/response |
| `app/services/voice_service.py` | **Create** | Orchestration: start stream session, drain partials, finalize, call Qwen, persist `VoiceSession` |
| `app/services/qwen_service.py` | **Create** | `extract_listing`, fence-stripping, Pydantic validate + one retry |
| `app/integrations/transcribe_streaming.py` | **Create** | `amazon_transcribe` client, stream lifecycle helpers |
| `app/integrations/transcribe_batch.py` | **Create** | Start job, poll until terminal, fetch transcript from S3/URI |
| `app/integrations/s3_presign.py` (or `integrations/s3.py`) | **Create or extend** | Presigned `PUT` for audio bucket with **fixed** `ContentType` in signature |
| `app/models/voice_session.py` | **Possibly extend** + migration | Columns for S3 key / AWS job name if not stored in JSONB |
| `app/core/enums.py` | **Use** | `VoiceLanguage`, `VoiceMode`, `VoiceSessionStatus` already defined |
| `tests/test_voice_*.py` | **Create** | WS protocol tests with mocks; batch job state machine; Qwen validation unit tests |
| `pyproject.toml` | **Unchanged** unless adding dev-only fakes | `amazon-transcribe`, `boto3`, `openai` already listed |

**Router stub today:** `backend/app/routers/voice.py` is a placeholder `GET /__stub` returning 501; Phase 4 replaces it entirely.

---

## 3. API protocol details

All routes live under the existing prefix **`/api/v1`** (router prefix `voice-to-profile` → full paths as below).

### 3.1 WebSocket — streaming (`VOICE-01`, `VOICE-02`, `VOICE-03`)

- **URL:** `wss://<host>/api/v1/voice-to-profile/stream?token=<JWT>`  
  Browsers cannot set `Authorization` on WS handshake; **token in query** matches `AUTH-06` / `get_current_user_ws` pattern.

- **After connect:** first client message should be **JSON** (text frame):  
  `{"language": "en-US" | "zh-CN"}`  
  Reject any other language with close code in **4xxx** range + short reason (streaming not available for `ms-MY`/`ta-IN` here).

- **Subsequent client messages:** **binary** frames = **raw 16kHz mono PCM**, signed 16-bit little-endian (see `PITFALLS.md` #12). Chunk size 50–200ms (e.g. 3200–6400 bytes) recommended to match Transcribe guidance.

- **Server → client (JSON text frames):**
  - During speech: `{"type": "partial", "text": "<string>"}` — **throttled** to ≤4/s; omit duplicate text.
  - On end of utterance + successful extraction: `{"type": "final", "listing": <ListingDraft>}` (shape must match Pydantic model and future `FE-01` `ListingDraft`).
  - Optional: `{"type": "error", "message": "..."}` for non-fatal issues; or close with error after fatal failures.

- **End-of-stream signal:** Plan should specify whether the client sends a **JSON** control message (e.g. `{"type":"end"}`) after last audio, or the server infers from silence / Transcribe `IsPartial=false` segments only. **Decide one** and test both disconnect-mid-stream and clean end.

- **Elder-only:** `Depends`-style check after `get_current_user_ws`: `user` role must be `elder` (or document exception — default is 403 for non-elders).

### 3.2 Batch — submit (`VOICE-04`, `VOICE-05`)

- **POST** `/api/v1/voice-to-profile/batch`  
  **Body (JSON):** `{ "s3Key": "<key>", "language": "ms-MY" | "ta-IN" }` (use Pydantic `Field(alias="s3Key")` if the API is camelCase for FE parity).

- **Response (immediate, &lt;2s):**  
  `{ "jobId": "<uuid or nanoid>", "status": "pending", "estimatedSeconds": 10 }`  
  **Do not** block until Transcribe finishes (`PITFALLS.md` #14 / LB timeouts).

- **Server behaviour:** create DB row (session/job), enqueue/schedule background task, return.

### 3.3 Batch — status (polling) (`VOICE-04`)

- **GET** `/api/v1/voice-to-profile/batch/{job_id}` (exact path to match Phase 5 `FE-02` / `getBatchStatus`).

- **Response shapes (illustrative — lock in plan):**
  - **Pending / transcribing / extracting:** `{ "status": "pending" | "transcribing" | "extracting", "jobId": "..." }` — optionally include `estimatedSeconds` or progress percent.
  - **Ready:** `{ "status": "ready", "jobId": "...", "listing": <ListingDraft> }`  
  - **Failed, non-Qwen:** `{ "status": "failed", "jobId": "...", "message": "..." }` — for safe Transcribe/S3 failures that are not listing extraction validation failures.
  - **Failed, Qwen extraction:** HTTP `502` with the standard envelope `{ "status": 502, "message": "Listing extraction failed" }` when the stored terminal state came from persistent `ListingDraft` validation/parsing failure after the one retry required by VOICE-07.

- **Idempotency:** repeat GETs for a terminal state return the same payload (read from `voice_sessions` or job table).

### 3.4 Optional — presigned upload URL (`REQUIREMENTS` / `MULTI-CLOUD-ARCHITECTURE`)

- **POST** `/api/v1/voice-to-profile/audio-upload-url` (or `upload-url` — **align naming with Phase 5** in one line of the plan).

- **Request:** e.g. `{ "language": "ms-MY" | "ta-IN", "contentType": "audio/wav" | "audio/webm" }` — **the signed `ContentType` must match the browser `PUT`**.

- **Response:** `{ "uploadUrl", "s3Key", "expiresIn" }` — browser **PUTs** body to S3; then calls **POST batch** with `s3Key`.

- **CORS:** S3 bucket in `ap-southeast-1` must allow **CloudFront + localhost** origins for `PUT` — `PITFALLS.md` #5. Phase 4 plan should list this as a deploy/config checklist even if local dev uses a mock bucket.

---

## 4. `ListingDraft` schema and validation strategy

### 4.1 Canonical JSON (from `MULTI-CLOUD-ARCHITECTURE.md` + `VOICE-06`)

The extracted object should be expressible as:

| Field | Type / notes |
|------|----------------|
| `name` | `string \| null` |
| `service_offer` | `string` |
| `category` | Enum aligned with product: `home_cooking`, `traditional_crafts`, `pet_sitting`, `household_help`, `other` — **map to** frontend listing categories (`cat_cooking` etc.) in a single place in the service layer if the schema uses short names. |
| `price_amount` | `number \| null` — add **field validator** to coerce strings like `"RM 35"` → `35` if Qwen drifts |
| `price_unit` | `per_meal \| per_hour \| per_day \| per_month \| null` |
| `capacity` | `number \| null` |
| `dietary_tags` | `list[str]` (e.g. halal, vegetarian) |
| `location_hint` | `string \| null` |
| `language` | `ms-MY \| en-US \| zh-CN \| ta-IN` — **default** to the session/request language if missing after first parse attempt |

`VOICE-06` also lists this shape; any drift between `MULTI-CLOUD-ARCHITECTURE.md` and `REQUIREMENTS.md` should be **resolved in the plan** to a **single** Pydantic v2 model.

### 4.2 Validation pipeline

1. Parse model response with **strict** Pydantic v2 (optional: `model_config = ConfigDict(extra="forbid")` to catch spurious keys).
2. If `json_object` still returns **markdown fences** — strip (regex or line-trim) **before** parse.
3. On `ValidationError` → **one** retry with error text appended to the user/model message.
4. Log **structured** fields only (e.g. `user_id`, `job_id`, `error_code`); do not log full transcripts in production if policy requires minimisation (demo may relax — document in plan).

### 4.3 Mapping to DB / future listing

`VoiceSession.listing_draft` JSONB stores the **validated** dict. Converting to a full `listings` row is **Elder** PATCH/POST work — likely Phase 3/5; Phase 4 only guarantees a consistent **draft** for the client.

---

## 5. Transcribe streaming & batch: operational notes

### 5.1 Streaming (`amazon-transcribe`)

- Construct **`TranscribeStreamingClient(region="ap-southeast-1")`** (or global config object with explicit region).
- Use `media_sample_rate_hz=16000`, `media_encoding="pcm"`.
- **Two async tasks** pattern: one pushes audio from WS → `input_stream`; one reads from handler/queue and applies throttle/coalesce before `send_json` to client (`VOICE-02`).
- **Credentials:** SDK uses awscrt; ensure ECS task role or env keys work **without** defaulting to wrong region. Log region once at startup in non-secret form.

### 5.2 Batch (boto3)

- `StartTranscriptionJob` with **S3 URI** in **same region** as bucket and Transcribe.
- **Media format:** align `MediaFormat` and file extension with what the browser uploads (WAV/FLAC/MP3 supported — **WebM/Opus is not**; plan must require **WAV/PCM** upload for batch or transcoding — note in risks).
- Poll with **bounded** interval (e.g. 1.5–2s) and **max wait** in the **background** task; on timeout, mark job `failed` and stop polling.

### 5.3 Cleanup rules (`VOICE-03`)

- On **any** WebSocket close: `finally` **must** run `end_stream` + reader cancellation.
- **30+ demo attempts:** 90s cap prevents long-lived ghost streams; add structured logging: `voice_ws_open` / `voice_ws_close` with `session_id` and duration.

### 5.4 Throttling & coalescing (`PITFALLS` #13)

- **Coalesce:** if new partial text equals last sent partial, skip.
- **Throttle:** minimum **250ms** between partial WS sends (4/s cap).
- Always forward **non-partial** (final segment) for a result **without** dropping.

---

## 6. Testing strategy (no live AWS / Qwen in unit tests)

| Layer | What to test | How |
|-------|----------------|-----|
| **Qwen service** | Fence stripping, `ValidationError` → retry path, 502 on double failure, coercion of `price_amount` | `httpx.MockTransport` or `respx` / `pytest-httpx`; inject fake OpenAI-compatible responses |
| **Pydantic** | Edge JSON from fixtures (empty strings, wrong enums, wrapped `{"json":{}}`) | Golden-file JSON in `tests/fixtures/voice/` |
| **Transcribe streaming integration** | Handler forwards throttled partials, `finally` calls mocked `end_stream` | Mock `TranscribeStreamingClient` at integration boundary; assert call counts after simulated disconnect |
| **Batch** | POST returns `jobId` immediately; background task updates row; GET returns `ready` with listing | `TestClient` + `asyncio.create_task` with dependency overrides; **use real `async_session` to testbed DB** or in-memory sqlite **not** used — project is Postgres-specific (JSONB) — prefer test Postgres / `TEST_DATABASE_URL` from existing harness |
| **Auth** | WS rejects missing/invalid token | Connect without `?token`, expect close / 401 per FastAPI pattern |
| **E2E optional** | Mark `@pytest.mark.integration` for real AWS/DashScope in CI off by default | Manual smoke in `ap-southeast-1` with budget alarm |

**Guardrail test (optional):** import-linter or `grep` test that `boto3` is **not** imported in `transcribe_streaming.py` (only `amazon_transcribe`).

---

## 7. Validation architecture (Nyquist / phase verification)

Use this as the **acceptance test checklist** for the phase’s Nyquist pass.

1. **Contract**
   - [ ] WebSocket path `/api/v1/voice-to-profile/stream` accepts `?token=<JWT>`, first JSON `language` in `en-US` | `zh-CN`, then binary PCM; responds with `partial` then `final` + `listing`.
   - [ ] `POST /api/v1/voice-to-profile/batch` returns `jobId`, `status: pending`, `estimatedSeconds` without waiting for Transcribe.
   - [ ] `GET /api/v1/voice-to-profile/batch/{jobId}` returns terminal `listing` on success, clear `failed` on error.

2. **SDK & region**
   - [ ] Streaming code imports **`amazon_transcribe`** (or package submodule), **not** `boto3` for the streaming client.
   - [ ] Boto3 Transcribe batch client and S3 use **`ap-southeast-1`** (assert in one startup log or unit test).

3. **Resilience**
   - [ ] WebSocket handler has **`finally`** with upstream stream end + reader cancel; 90s max session enforced.
   - [ ] Partial messages to client are **≤4 per second** under simulated rapid partials.

4. **Qwen**
   - [ ] `extract_listing` uses `json_object` mode; strips fences; Pydantic-validates; **one** retry on `ValidationError`; **502** + `"Listing extraction failed"` on persistent failure.

5. **Data & isolation**
   - [ ] Batch background work uses a **new** `AsyncSession`, not the request’s session.
   - [ ] `VoiceSession` rows link to authenticated elder; draft stored in `listing_draft` when successful.

6. **Smoke (manual or integration, post-deploy)**
   - [ ] Close browser tab mid-stream → Transcribe stream ends within **5s** (per roadmap success criteria; measure in CloudWatch / logs).

---

## 8. Risks, pitfalls, and how the plan should address them

| Risk | Source | Mitigation in plan |
|------|--------|---------------------|
| **boto3 for streaming** | PITFALLS #2 | Code review + optional grep test; single integration module for streaming |
| **WS leak / quota exhaustion** | PITFALLS #4, roadmap SC #2 | `try/finally`, 90s timer, open/close logging, cancel reader task |
| **Qwen “JSON” not matching schema** | PITFALLS #7 | Pydantic boundary + single retry; coerce `price_amount`; default `language` |
| **Request-scoped session in background** | PITFALLS #8 | Document pattern: `async with session_maker() as s:` inside task only |
| **Inline batch Transcribe poll in HTTP** | PITFALLS #14 | Async job + poll endpoint only; never block POST |
| **Audio format mismatch (WebM vs PCM)** | PITFALLS #12 | Document contract: stream = raw PCM; batch = signed format (WAV) — align with **Phase 5** ElderVoice; backend rejects wrong content type at presign or batch submit |
| **S3 CORS / wrong ContentType on presign** | PITFALLS #5 | Presign includes `ContentType`; bucket CORS checklist for prod |
| **Partial transcript flood** | PITFALLS #13 | Throttle + coalesce in `voice_service` before WS send |
| **LB/WebSocket idle timeout** | PITFALLS #17 | Document separately for **Phase 6** deploy; uvicorn WS ping; backend may need ping/keepalive if SLB is aggressive (note in plan, not a Phase 4 code requirement if running locally) |
| **Schema gap for batch job fields** | Current DB | Add migration in Phase 4 plan: `s3_key`, `transcribe_job_name`, and/or `external_job_id` for GET polling — avoid stuffing everything in unstructured JSON without a migration |
| **Router stub says "Phase 5"** | `voice.py` comment | **Replace** with accurate docstrings (voice is Phase 4 in current roadmap) to avoid on-call confusion |

---

## References (internal)

- `MULTI-CLOUD-ARCHITECTURE.md` — Qwen JSON shape, two-path voice topology.
- `.planning/research/PITFALLS.md` — streaming SDK, WS cleanup, Qwen validation, S3 CORS, async session, partial flooding, batch async pattern.
- `backend/app/models/voice_session.py` + `0001_initial_schema.py` — current columns and CHECK constraints.
- `backend/app/deps/auth.py` — `get_current_user_ws`.
- `backend/app/core/config.py` — `aws_region`, `s3_audio_bucket`, DashScope URL.

---
*GSD phase research for GingerGig Phase 4 — Voice-to-Profile Pipeline*  
*Written: 2026-04-26*
