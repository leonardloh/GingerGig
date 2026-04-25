# Pitfalls Research

**Domain:** Multi-cloud (AWS + Alibaba) FastAPI backend with real-time ASR, eKYC, and LLM JSON extraction, fronted by a typed React SPA
**Researched:** 2026-04-25
**Confidence:** HIGH (most pitfalls verified against official docs, AWS service limits, and reproduced community reports)

> Severity legend:
> - **Critical** — Causes demo-day failure, security incident, or PII leak. Must be designed against from Phase 1.
> - **Important** — Causes hours of debugging, intermittent failures, or rework. Mitigate before integration phase.
> - **Nice-to-fix** — Quality / polish issues that don't block the demo.

---

## Critical Pitfalls

### Pitfall 1: AWS Textract `AnalyzeID` does not support MyKad — only US driver's licenses and US passports

**What goes wrong:**
The architecture doc and the existing `frontend/src/services/api/endpoints/kyc.ts` JSDoc both promise "Textract `AnalyzeID` extracts name, IC number, DOB, address from MyKad front + back". This is **factually wrong**. `AnalyzeID` is hard-coded to US documents only. Calling it with a Malaysian IC will return a low-confidence response with mostly empty fields or a `DocumentTypeNotSupported` style error. The eKYC happy path will never produce a green tick on real Malaysian data.

**Why it happens:**
The phrase "Textract for ID OCR" is generic enough that nobody on the team verified the regional document support. The AWS marketing page lists "identity documents" without making the US-only restriction prominent.

**How to avoid:**
- For `IdentityDocumentField` extraction on MyKad, use `AnalyzeDocument` with `FeatureTypes=["FORMS","TABLES"]` (general OCR) and write a small parser that locates IC number patterns (`YYMMDD-PB-####`) and the printed name. This is what every Malaysian fintech does.
- Or use `DetectDocumentText` (cheaper) and regex-extract the IC number + name from the raw text blocks.
- Keep `Rekognition CompareFaces` as-is — it is region-agnostic and works fine on MyKad photos.
- Update `frontend/src/services/api/endpoints/kyc.ts` JSDoc and `MULTI-CLOUD-ARCHITECTURE.md` to remove the `AnalyzeID` claim. Both currently mislead future contributors.

**Warning signs:**
- Smoke test on a real MyKad image returns `IdentityDocumentFields: []` or every field has confidence < 50%.
- AWS bill shows `AnalyzeID` charges with no successful extractions in CloudWatch logs.

**Phase to address:**
KYC pipeline phase. The choice between `AnalyzeDocument` + regex vs. a third-party MyKad OCR (e.g. KYC-Chain, Onfido) must be decided **before** the eKYC phase begins, otherwise the entire flow is rework.

**Severity:** Critical

---

### Pitfall 2: `boto3` does not support Transcribe Streaming — wrong SDK on the requirements list

**What goes wrong:**
The PROJECT.md says "wired to AWS Transcribe Streaming via boto3". `boto3.client("transcribe")` only exposes the **batch** Transcribe API (`StartTranscriptionJob`, `GetTranscriptionJob`). The streaming endpoint is bidirectional HTTP/2 with event-stream framing that boto3 has never supported. Backend developers who try to `client.start_stream_transcription(...)` will get `AttributeError: 'TranscribeService' object has no attribute 'start_stream_transcription'`.

**Why it happens:**
Mental conflation: "boto3 = AWS Python SDK = covers everything AWS." Transcribe Streaming is the long-standing exception. The correct SDK is `amazon-transcribe` (PyPI), which is async-native and built on `awscrt`. Note: it's an awslabs project marked "no longer actively developed" but still works and is the only sanctioned Python option short of hand-rolling SigV4 over WebSockets.

**How to avoid:**
- Add `amazon-transcribe>=0.6.2` to `pyproject.toml` (separate from `boto3`).
- Use `boto3` for: S3 presigned URLs, Transcribe **batch** jobs, Textract, Rekognition.
- Use `amazon-transcribe` for: streaming sessions only.
- Document the SDK split in the backend README so the next contributor doesn't add a redundant dep.

**Warning signs:**
- Phase planning lists `boto3` only — no `amazon-transcribe` in the dependency list.
- First WebSocket implementation attempt fails on import.

**Phase to address:**
Voice-to-profile streaming phase, but pin the dep during Phase 1 (backend scaffolding) so it's already in `uv.lock` when streaming work begins.

**Severity:** Critical

---

### Pitfall 3: Algorithm-confusion vulnerability if JWT decode is called without explicit `algorithms=`

**What goes wrong:**
Calling `jwt.decode(token, secret)` (PyJWT) or `jose.jwt.decode(token, key)` (python-jose) without an explicit `algorithms=["HS256"]` arg lets an attacker forge tokens by setting `alg: none` or by tricking RS256 verification with the public key as an HMAC secret (CVE-2022-29217 for PyJWT, CVE-2024-33663 for python-jose). For a hackathon backend issuing real bearer tokens to demo accounts, this is a one-line auth bypass.

**Why it happens:**
Default-permissive APIs. Both libraries historically accepted any algorithm in the header if the caller didn't restrict — recent versions tightened defaults but old patterns still circulate in tutorials and Stack Overflow answers.

**How to avoid:**
- Standardize on **PyJWT** (more active, better security track record than python-jose). Add `pyjwt[crypto]>=2.10.1` to deps.
- Wrap encode/decode in a single `auth/jwt.py` helper that hard-codes `algorithms=["HS256"]` on every decode — never expose raw `jwt.decode` to route handlers.
- Sample correct call: `jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"], options={"require": ["exp", "sub"]})`.
- Keep secret length ≥ 32 random bytes from `secrets.token_urlsafe(32)`. Never reuse the secret across environments.
- Set `exp` claim on every token; reject without it via `options={"require": ["exp"]}`.

**Warning signs:**
- Code review shows `jwt.decode(token, secret)` with two args.
- A grep for `algorithms=` returns zero hits in `auth/`.
- `JWT_SECRET` env var is shorter than 32 chars or matches a string in the README.

**Phase to address:**
Auth phase (Phase 2-ish, right after DB + scaffolding). Lock the helper before any protected route is written.

**Severity:** Critical

---

### Pitfall 4: WebSocket session leaks Transcribe streams when the browser closes mid-recording

**What goes wrong:**
The streaming flow opens a Transcribe session per WebSocket. If the browser closes the tab, hits airplane mode, or the elder's iPad sleeps, FastAPI's `WebSocket` handler does NOT automatically tear down the upstream Transcribe stream. The stream stays open consuming AWS quota (and billing) until the 4-hour Transcribe session timeout fires. With 20-30 demo attempts during judging, you can hit the per-account streaming session quota and brick the demo.

**Why it happens:**
FastAPI propagates `WebSocketDisconnect` only on the next read/write attempt — your `await transcribe_stream.send_audio_event(chunk)` loop must be wrapped in `try/finally` that calls the Transcribe handler's `end_stream()` and cancels the partial-transcript reader task.

**How to avoid:**
```python
async def voice_stream(ws: WebSocket):
    await ws.accept()
    transcribe_session = await start_transcribe_stream(...)
    reader_task = asyncio.create_task(forward_partials(transcribe_session, ws))
    try:
        async for msg in ws.iter_bytes():
            await transcribe_session.input_stream.send_audio_event(audio_chunk=msg)
    except WebSocketDisconnect:
        pass
    finally:
        await transcribe_session.input_stream.end_stream()
        reader_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await reader_task
```
- Add a max-session timer (e.g. 90s) so even a hung handler tears down.
- Log every session open + close with a session ID; in CloudWatch / app logs, opens-without-closes is the smoking gun.

**Warning signs:**
- AWS Console shows `ConcurrentStreams` metric climbing during dev with no manual recovery.
- FastAPI logs show `WebSocket connected` lines without matching `WebSocket disconnected`.
- Test: `await ws.close()` from the client and watch backend logs — you should see `end_stream` within ~1s.

**Phase to address:**
Voice-to-profile streaming phase. Build the cleanup pattern in the very first WebSocket handler — retrofitting it later is painful.

**Severity:** Critical

---

### Pitfall 5: Cross-cloud presigned URL CORS — the AWS S3 bucket must allow the Alibaba-hosted backend AND the CloudFront-hosted frontend, with the right preflight headers

**What goes wrong:**
The browser is served from CloudFront (`https://app.gingergig.my` or `*.cloudfront.net`). It calls the backend on Alibaba (`https://api.gingergig.my`) which returns a presigned PUT URL pointing at AWS S3 (`https://gingergig-kyc-prod.s3.ap-southeast-1.amazonaws.com/...`). The browser then PUTs to S3 directly. This crosses **two** origin boundaries:
1. `app.gingergig.my` → `api.gingergig.my` (your own backend CORS)
2. `app.gingergig.my` → `*.s3.ap-southeast-1.amazonaws.com` (S3 bucket CORS)

If the S3 bucket CORS is missing, the PUT fails with no actionable error in the browser console (just "CORS error"). If the `Content-Type` header used in the PUT does not match the one the backend specified when generating the URL, S3 returns 403 SignatureDoesNotMatch. If the presigned URL expiry is shorter than the round-trip + user upload time, you get a 403.

**Why it happens:**
Three independent CORS configs (CloudFront, S3 bucket, Alibaba backend), three different teams' worth of mental models. Easy to forget S3 needs its own CORS policy distinct from CloudFront's behavior settings.

**How to avoid:**
- S3 bucket CORS for KYC + audio buckets:
  ```json
  [{
    "AllowedOrigins": ["https://app.gingergig.my", "http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type", "x-amz-*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
  ```
- When generating the URL, include `ContentType` in the params and require the browser to send the **exact same** `Content-Type`:
  ```python
  url = s3_client.generate_presigned_url(
      "put_object",
      Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
      ExpiresIn=900,  # 15 min
  )
  ```
- The frontend already does `headers: { "Content-Type": file.type }` (verified in `frontend/src/services/api/endpoints/kyc.ts:58`) — preserve this.
- Set expiry ≥ 15 minutes for KYC (large IC images on slow mobile data) and ≥ 5 minutes for audio.
- Don't include the `Authorization` header on the PUT (verified in the existing frontend — it does not). Adding it makes the signature path mismatch.

**Warning signs:**
- Browser console: `Access to fetch at 'https://...s3...' from origin 'https://app...' has been blocked by CORS policy: Response to preflight request doesn't pass access control check`.
- S3 CloudTrail shows no PUT events but the frontend says it tried.
- 403 SignatureDoesNotMatch in the response body — almost always Content-Type or query-string-signed-vs-actually-sent header drift.

**Phase to address:**
KYC phase + voice-batch phase. Test with a real CloudFront distribution from day one — `localhost` development hides this category of bug entirely.

**Severity:** Critical

---

### Pitfall 6: Cross-cloud egress costs (AWS ↔ Alibaba) and unexpected demo-day bill

**What goes wrong:**
Every audio chunk forwarded backend → Transcribe Streaming, every Textract image fetched from S3 by the backend, every Qwen API response — these all cross AWS Singapore ↔ Alibaba KL public internet. AWS internet egress is ~$0.09/GB up to 10 TB. A 20-second voice clip at 16kHz mono PCM is ~640 KB, and a single MyKad image is 1-3 MB; multiply by 30-50 demo attempts and you're still under $1. The real risk is loops: if the backend accidentally re-fetches the same S3 KYC image on every poll (e.g. polling fetches the image instead of the result), or if a streaming session retries audio chunks, costs explode.

Cross-region within AWS (e.g. Transcribe in `us-east-1` accidentally instead of `ap-southeast-1`) is $0.02/GB on top.

**Why it happens:**
Latency optimization is invisible until you read the bill. Easy to forget that "the backend reads the IC image" means an Alibaba ECS instance pulls bytes from an AWS S3 bucket every time.

**How to avoid:**
- Pin every AWS service to `ap-southeast-1` (Singapore) — same region as the S3 buckets. Verify with `boto3.session.Session().region_name` log line on startup.
- Pin Transcribe **streaming endpoint** explicitly: `TranscribeStreamingClient(region="ap-southeast-1")`. The streaming SDK does not use the standard boto3 region resolution chain.
- Have the backend pass S3 URIs to Textract / Rekognition (the `S3Object={"Bucket": ..., "Name": ...}` parameter), not raw bytes. AWS reads from S3 internally — no egress to your backend.
- Cache Qwen responses in Tair where it makes sense (e.g. listing copy generation by transcript hash) to avoid duplicate calls during demos.
- Set an AWS budget alert at $20 for the hackathon week — better to know early.

**Warning signs:**
- AWS Cost Explorer shows DataTransfer-Out-Bytes > $0.10/day during dev.
- Backend code does `s3.get_object().Body.read()` and then passes bytes to Textract.
- Region appears as `us-east-1` in any boto3 log line.

**Phase to address:**
Phase 1 (scaffolding / deploy). Lock region in env config and `aws_config.py`. Add the budget alert before any AWS work begins.

**Severity:** Critical (cost) / Important (latency)

---

### Pitfall 7: Storing Qwen JSON output without a strict Pydantic validator at the boundary

**What goes wrong:**
Even with `response_format={"type": "json_object"}`, Qwen's JSON mode is **not** schema-enforced — it returns syntactically valid JSON, but field names, types, and enum values can drift. Common observed failures:
- Returns `{"json": {...the actual object...}}` (extra wrapping key).
- Returns `\`\`\`json\n{...}\n\`\`\`` (markdown fence around JSON despite json_object mode — a known issue).
- Returns enum value `home cooking` when the schema says `home_cooking`.
- Returns `price_amount: "RM 35"` instead of `35` (string vs number) on Bahasa input.
- Drops the `language` field on shorter Tamil clips.

If the backend writes this directly to Postgres, the listing draft is broken; if it returns it to the frontend, the typed DTO contract is violated and the prototype renders blank.

**Why it happens:**
LLM JSON modes guarantee well-formed JSON, not schema-conforming JSON. DashScope's structured-output **schema** mode is stricter (and supported by Qwen) — but it's a different API call.

**How to avoid:**
- Use DashScope's strict JSON-schema mode (`response_format={"type": "json_schema", "json_schema": {...}}`) when available — Qwen3 / Qwen-Max supports this and validates server-side.
- Define a Pydantic model `ListingDraft` that mirrors the schema in `MULTI-CLOUD-ARCHITECTURE.md`. Validate every Qwen response: `ListingDraft.model_validate_json(raw)`.
- Wrap Qwen call in a 1-shot retry loop: on `ValidationError`, re-prompt with the validation error appended to the user message. Hard cap at 2 retries.
- Strip code fences before validating: `raw.strip().removeprefix("\`\`\`json").removesuffix("\`\`\`").strip()`.
- Coerce price strings: `price_amount` field should be `int | None` with a validator that strips currency prefixes and parses.
- Default missing `language` to the `language` arg passed to the endpoint.

**Warning signs:**
- A Qwen response with no Pydantic validation in the path.
- Tests pass on English transcripts but fail on Tamil/Bahasa.
- Production logs show `JSONDecodeError` once a day.

**Phase to address:**
Voice-to-profile phase (both streaming and batch share the same Qwen call). Build the validator + retry once, use it from both flows.

**Severity:** Critical (demo correctness)

---

### Pitfall 8: SQLAlchemy async session shared across concurrent tasks → silent connection corruption

**What goes wrong:**
A common mistake when wiring async SQLAlchemy is to keep a single `AsyncSession` at module scope or in `app.state` and let every request use it. With concurrent requests, two coroutines issue queries on the same connection simultaneously; asyncpg raises `InterfaceError: cannot perform operation: another operation is in progress`. Worse, if errors aren't fatal, the connection pool drifts into an inconsistent state and subsequent queries timeout.

**Why it happens:**
Sync SQLAlchemy tutorials use `scoped_session` which is thread-local. Naive port to async retains the global pattern. SQLAlchemy 2.0 docs explicitly warn against this for asyncio.

**How to avoid:**
- Strict pattern: `AsyncSession` is created **per request** via FastAPI dependency.
  ```python
  async_session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

  async def get_db() -> AsyncIterator[AsyncSession]:
      async with async_session_maker() as session:
          try:
              yield session
              await session.commit()
          except Exception:
              await session.rollback()
              raise

  @router.get("/listings")
  async def list_listings(db: AsyncSession = Depends(get_db)): ...
  ```
- Engine is process-global (`create_async_engine(...)`); the **session** is per-request.
- For background tasks (e.g. KYC verification job), open a new session in the task body — never pass a request-scoped session to `BackgroundTasks` or `asyncio.create_task`.
- `expire_on_commit=False` is required for FastAPI (otherwise lazy attributes raise after commit).

**Warning signs:**
- `cannot perform operation: another operation is in progress` in logs.
- A grep for `AsyncSession(` outside `db.py` / `dependencies.py`.
- A module-level `session = AsyncSession(...)` anywhere.
- Background job code does `await session.execute(...)` where `session` came from a request context.

**Phase to address:**
Phase 1 (backend scaffold). The dependency pattern is foundational — every route written before this is fixed becomes rework.

**Severity:** Critical

---

## Important Pitfalls

### Pitfall 9: Connection pool size mismatch between SQLAlchemy and Postgres limits

**What goes wrong:**
Default SQLAlchemy pool is `pool_size=5, max_overflow=10` per process. If you run uvicorn with `--workers 4`, you have up to 60 connections. ApsaraDB Postgres free / small tiers cap at 100 connections; once monitoring connections + pgAdmin + a second deploy hit it, new requests block on `TimeoutError: QueuePool limit exceeded`.

**How to avoid:**
- Single uvicorn worker for hackathon (FastAPI is async — workers aren't bought as much as people think).
- Set `pool_size=10, max_overflow=5, pool_pre_ping=True, pool_recycle=1800` explicitly. `pool_pre_ping` catches Alibaba load-balancer connection drops.
- If using PgBouncer/RDS Proxy / ApsaraDB connection pool: set `poolclass=NullPool` AND `connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0}` for asyncpg — pgbouncer in transaction mode cannot share prepared statements across connections.

**Warning signs:**
- `QueuePool limit of size 5 overflow 10 reached` in logs.
- `cached statement plan is invalid due to a database schema or configuration change` from asyncpg → almost always a pgbouncer interaction.

**Phase to address:** Phase 1 scaffold. **Severity:** Important.

---

### Pitfall 10: `Base.metadata.create_all` in production trap

**What goes wrong:**
The convenience pattern `Base.metadata.create_all(bind=engine)` on app startup creates tables but **never modifies them**. Adding a column to a model has no effect — the column silently doesn't exist in the DB. First field-rendering bug ("why is `Listing.category` always null?") leads to an hour of debugging before someone realizes there's no migration tooling.

**How to avoid:**
- Adopt **alembic** from Phase 1, even for the seed scaffold. The 30 minutes setup pays back the first time someone adds a column.
- `alembic init -t async migrations` (uses async template).
- Generate initial migration from the SQLAlchemy models (`alembic revision --autogenerate -m "initial"`), review it, commit it.
- Run `alembic upgrade head` at container startup, not `create_all`.
- Seed script is a separate alembic revision OR a python script that runs after `upgrade head`. Use upserts: `INSERT ... ON CONFLICT (email) DO UPDATE SET ...` so re-running doesn't duplicate.

**Warning signs:**
- `Base.metadata.create_all` in `main.py` or `db.py`.
- No `alembic.ini` in repo.
- Seed script that fails on second run with unique-constraint violations.

**Phase to address:** Phase 1 scaffold. **Severity:** Important.

---

### Pitfall 11: Seed script foreign-key insertion order

**What goes wrong:**
The prototype mock data has `BOOKINGS` referencing `PROVIDERS` referencing `USERS`. Inserting bookings first throws `ForeignKeyViolationError`. Naive fixes (e.g. wrap each in try/except) leave partial data; rollback-on-error nukes successful inserts.

**How to avoid:**
- Order: `users → user_profiles → listings → bookings → reviews → companion_alerts → timeline_events`.
- Use deterministic UUIDs for seeded entities so the seed is re-runnable AND foreign keys are stable across re-seeds:
  ```python
  import uuid
  SITI_USER_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "siti@gingergig.my")
  ```
  This means rerunning the seed produces the same IDs — clean upserts.
- Use `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` for every seed row. Skip-existing won't update changed mock data; upsert keeps the demo data fresh after edits.
- Wrap entire seed in a single transaction so partial failure leaves nothing behind.

**Warning signs:**
- Seed script has `try: insert except IntegrityError: pass` patterns.
- Re-running `seed.py` produces different IDs each time.
- CI fails seed step intermittently.

**Phase to address:** Phase 1 (DB + seed). **Severity:** Important.

---

### Pitfall 12: Audio chunk format mismatch — browser sends WebM/Opus, Transcribe expects 16kHz PCM

**What goes wrong:**
`MediaRecorder` in browsers defaults to `audio/webm;codecs=opus` or `audio/mp4`. AWS Transcribe Streaming requires raw 16kHz mono PCM (signed 16-bit little-endian). Forwarding browser output verbatim produces "InvalidArgumentException: Audio sample rate is not supported" or silently empty transcripts.

**How to avoid:**
- Frontend: use `AudioContext` + `AudioWorklet` (or `ScriptProcessorNode` as fallback) to capture raw `Float32Array` samples at 16kHz, downsample if needed, convert to Int16, send as binary WebSocket frames. This is significantly more code than `MediaRecorder.start()`.
- Each chunk should be 100-200ms (`16000 * 0.1 * 2 = 3200 bytes` to `6400 bytes`) — matches Transcribe's documented sweet spot of 50-200ms chunks.
- Document the chunk size and sample rate in the WebSocket protocol spec; both frontend and backend must agree.
- Reuse `frontend/src/prototype/ElderVoice.jsx`'s existing `SpeechRecognition` fallback path: keep it functional for browsers without `AudioWorklet` support (older Safari).

**Warning signs:**
- Backend Transcribe receives audio but emits no partials.
- Backend logs show audio bytes but content-type sniff says WebM.
- Frontend code uses `MediaRecorder` instead of `AudioContext`.

**Phase to address:** Voice-to-profile streaming phase. **Severity:** Important.

---

### Pitfall 13: Partial-transcript flooding overwhelms WebSocket / browser

**What goes wrong:**
Transcribe Streaming emits partial results several times per second. Forwarding every partial verbatim sends 5-10 messages/second to the browser; the React caption UI thrashes (re-renders on every message); slow networks back-pressure the WebSocket and audio chunks queue up, breaking real-time transcription.

**How to avoid:**
- Coalesce partials: only forward to client when transcript text changes (cache last forwarded `IsPartial=true` result; skip if same). Always forward `IsPartial=false` final results.
- Throttle to ≤4 messages/second per session: `if now - last_send < 250ms: skip`.
- Frontend uses `useDeferredValue` or a debounce on the caption render so UI doesn't block scrolling.

**Warning signs:**
- Browser DevTools Network tab shows >10 WS messages/sec.
- Caption text "stutters" or lags behind audio by >500ms.

**Phase to address:** Voice-to-profile streaming phase. **Severity:** Important.

---

### Pitfall 14: Inline polling for Transcribe Batch blocks the event loop or returns 504

**What goes wrong:**
The architecture says "submits a Transcribe batch job pointing at the S3 URI and polls inline (~1.5s interval)". A 20-second BM clip can take 8-12s; a 60s clip can take 30s+; cold-start jobs occasionally take 60s. Inline-polling keeps a single FastAPI request open the whole time. ALB / Alibaba SLB defaults to 60s idle timeout; the request gets killed, the user sees an error, but the Transcribe job keeps running and Qwen is never called.

**How to avoid:**
- Make the endpoint return immediately with a `jobId`. Backend writes the job state to Postgres / Tair.
- Frontend polls `GET /voice-to-profile/batch/{jobId}` every 2s like KYC does. The existing `kyc.ts waitForVerification` pattern is reusable.
- Backend's poll endpoint reads job state from a small `voice_jobs` table. A worker (or a `BackgroundTasks` task spawned at submit time) does the actual Transcribe polling + Qwen call + DB write.
- Cap server-side polling at 60s with `asyncio.wait_for`; on timeout, mark the job `failed` and let the frontend surface a retry.

**Warning signs:**
- 504 Gateway Timeout on `/voice-to-profile/batch` endpoint during demo.
- A `while not done: await asyncio.sleep(1.5); await transcribe.get_transcription_job(...)` loop inside a request handler.

**Phase to address:** Voice-to-profile batch phase. **Severity:** Important.

---

### Pitfall 15: Rekognition CompareFaces low-confidence handling — the state machine has 3 outcomes, not 2

**What goes wrong:**
`CompareFaces` returns `FaceMatches: [...]` with similarity 0-100 and `UnmatchedFaces: [...]`. Treating "no match >80%" as failure misses the middle: similarity 70-80% is "probably the same person but lighting/angle borderline" — human review territory. The KYC type already includes `manual_review` status, but if the backend collapses to binary pass/fail, the type is unused and good-faith users with poor IC photos get hard-rejected.

**How to avoid:**
- Three-tier thresholds (tune on real test data):
  - `similarity >= 90`: `approved`
  - `similarity >= 70`: `manual_review`
  - else / no faces detected: `failed` with `failure_reason_code`
- Define an enum `KycFailureCode = "face_mismatch" | "no_face_detected" | "ic_unreadable" | "liveness_failed" | "expired"` and surface it in the API response. The frontend currently has free-text `failureReason` (per CONCERNS.md) — fix the type before wiring.
- Always log the raw similarity score for offline tuning.

**Warning signs:**
- KYC code has `if similarity > X: approved else: failed` with no middle branch.
- `manual_review` is never returned in tests.
- All KYC failures show identical user-facing message.

**Phase to address:** KYC phase. **Severity:** Important.

---

### Pitfall 16: Multi-locale alert/listing fetch on every read instead of selecting one column

**What goes wrong:**
Companion alerts store `text_en`, `text_ms`, `text_zh`, `text_ta` (4 columns per alert). Naive ORM access loads all 4 then code picks one based on `user.locale`. Over the wire to the frontend, this is 4x the payload; in Python it's also a denial-of-service if the listing browse endpoint returns 50 listings × 4 locales × ~3 multilingual fields each (`titleMs/En/Zh/Ta`).

**How to avoid:**
- At the SQLAlchemy query level, project only the locale-specific column:
  ```python
  locale_col = {"en": Listing.title_en, "ms": Listing.title_ms,
                "zh": Listing.title_zh, "ta": Listing.title_ta}[user.locale]
  stmt = select(Listing.id, locale_col.label("title"), Listing.price, ...)
  ```
- Build a small helper `localized_columns(model, fields, locale)` to keep route code clean.
- Same pattern for `CompanionAlert.text_*`.
- Fall back to English if the requested locale's column is NULL — use `coalesce(locale_col, Listing.title_en)`.
- Cache the resulting per-locale projection in Tair keyed on `listing:{id}:{locale}`.

**Warning signs:**
- ORM `Listing.objects.all()` followed by Python `getattr(l, f"title_{locale}")`.
- Network response contains all 4 locale strings per item.

**Phase to address:** Listings + companion alerts phase. **Severity:** Important.

---

### Pitfall 17: Idle ALB/uvicorn killing long-lived WebSockets

**What goes wrong:**
Voice recording can be 30-60 seconds with multi-second pauses. AWS ALB defaults to 60s idle timeout (Alibaba SLB defaults vary, sometimes 900s but not assumed). With no traffic during a pause, the WebSocket gets cut. uvicorn's default `--ws-ping-interval=20s --ws-ping-timeout=20s` helps but only if both sides send pings.

**How to avoid:**
- Raise the load balancer idle timeout to 300s for the WebSocket route (or use a dedicated WS path with its own timeout).
- Keep uvicorn ping defaults — they fire every 20s of idle, beating the LB timeout.
- Frontend: don't pause sending — even silent audio is better than no audio for keepalive (or send a JSON `{"type":"ping"}` every 10s during silence).
- Set `--timeout 0` on uvicorn's own request timeout, OR `--timeout-keep-alive` to ≥ 65s.

**Warning signs:**
- WebSocket disconnects ~60s into a recording.
- Backend logs `WebSocketDisconnect` after the silence.

**Phase to address:** Voice-to-profile streaming phase + deploy phase. **Severity:** Important.

---

### Pitfall 18: bcrypt hashing on the FastAPI event loop blocks every request for 200-500ms

**What goes wrong:**
`bcrypt` is CPU-bound. With cost factor 12, each `verify` takes ~250ms; the FastAPI event loop blocks for that duration; concurrent requests serialize. A single login during voice streaming will stutter the audio capture for half a second.

**How to avoid:**
- Run bcrypt in a thread pool: `await asyncio.to_thread(bcrypt.checkpw, password, hashed)`.
- Or use FastAPI's `await run_in_threadpool(...)` — same thing.
- Cost factor 12 for hackathon (default in `passlib`) is fine; never higher than 12 in dev (slow tests = developer pain). Production-real apps tune to 13-14.
- Don't reach for argon2 / scrypt for v1 — adds C extension build complexity, no demo-day value.

**Warning signs:**
- Login route does `bcrypt.checkpw(...)` directly (no `to_thread`).
- Audio stutters during simultaneous logins in dev.

**Phase to address:** Auth phase. **Severity:** Important.

---

### Pitfall 19: Demo account passwords seeded as `demo` while CORS is `*` and JWT secret is `dev-secret`

**What goes wrong:**
The prototype hard-codes `password: 'demo'` for `siti@`, `amir@`, `faiz@gingergig.my` (per CONCERNS.md). If the seed mirrors this verbatim AND CORS is wide open AND the JWT secret is the example value, anyone who finds the public CloudFront URL during the hackathon can log in as Siti and pollute the demo data.

**How to avoid:**
- Keep the **password** as `demo` for the 3 demo accounts so the prototype's quick-login chips work — that's a UX requirement.
- But: lock CORS to `https://app.gingergig.my` + `http://localhost:5173` only. Never `*` even on a hackathon.
- Generate `JWT_SECRET` per environment (`secrets.token_urlsafe(64)`); never commit; never reuse.
- Rate-limit `/auth/login` (e.g. via slowapi or a Tair counter) to 10/min/IP.
- After judging, rotate the demo passwords.

**Warning signs:**
- `allow_origins=["*"]` anywhere in the codebase.
- `JWT_SECRET=dev-secret` in production env.

**Phase to address:** Auth + deploy phase. **Severity:** Important.

---

### Pitfall 20: PII leak via FastAPI exception traces with `debug=True`

**What goes wrong:**
FastAPI in debug mode returns full Python tracebacks in error responses. The frontend's `apiRequest` puts `errorBody.detail` into `ApiError.detail` (per CONCERNS.md). If a route handler dies while the IC number is in scope (e.g. KYC processing error), the IC number can land in the browser response and DOM.

**How to avoid:**
- `FastAPI(debug=False)` in production env.
- Add a global exception handler that returns a structured `{"error_code": ..., "message": "..."}` shape — never the raw exception:
  ```python
  @app.exception_handler(Exception)
  async def all_exceptions(req, exc):
      logger.exception("unhandled", extra={"path": req.url.path})
      return JSONResponse(500, {"error_code": "internal_error", "message": "Something went wrong"})
  ```
- Filter PII from logs: a log filter that redacts patterns matching IC numbers (`\d{6}-\d{2}-\d{4}`).
- Frontend should render `.message` only, never `.detail` (per CONCERNS.md security note).

**Warning signs:**
- `FastAPI(debug=True)` in production.
- Browser shows `KeyError: 'ic_number'` style errors.
- App logs contain raw IC numbers / face image bytes.

**Phase to address:** Phase 1 scaffold (exception handler) + every phase (logging hygiene). **Severity:** Important.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `Base.metadata.create_all` instead of alembic | -30 min setup | First column add silently fails; full DB drop+rebuild needed | **Never** — alembic costs 30 min, recovery costs hours |
| Single AsyncSession at module scope | "Simpler" | Concurrent-request data corruption | Never |
| `boto3` for everything (including streaming) | Single SDK in deps | AttributeError, wasted Phase 3 day | Never |
| Inline polling Transcribe batch in request handler | "Returns the result directly" | 504s, orphaned jobs | Demo only, never if poll could exceed 30s |
| Storing all 4 locales in API response | Simplifies single payload shape | 4x bandwidth, leaks unused content | Acceptable only for `< 10 items` admin views |
| Hard-coded JWT algorithm in `decode` calls | Skips refactor of helper | One missed call site = full auth bypass | Never — always use central helper |
| `password='demo'` for seed accounts | Demo UX preserved | Public account on public URL | OK iff CORS is locked + rate-limited + rotated post-demo |
| `allow_origins=["*"]` | "Just works" cross-origin | Token theft risk if cookies added later | Never |
| Returning Qwen JSON without Pydantic validation | -1 hour wiring | Random demo failures on Tamil/Bahasa | Never |
| `MediaRecorder` for audio capture | -2 hours coding | Transcribe rejects audio | Never (use AudioContext) |
| Frontend's bare-object `throw` (existing) | Keeps the typed `ApiError` shape | `instanceof Error` callers break, no stack | Already debt — fix in Phase 0 |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Textract `AnalyzeID` | Assuming it works on MyKad | Use `AnalyzeDocument` with `FORMS` + regex IC parser |
| Transcribe Streaming via `boto3` | Importing `boto3.client("transcribe")` | Use `amazon-transcribe` PyPI package; async-native |
| Transcribe Batch | Polling inline in request handler | Submit + return jobId; client polls; `BackgroundTasks` worker handles |
| Rekognition CompareFaces | Hard binary threshold | Three-tier (approved / manual_review / failed) + reason code |
| Rekognition / Textract image input | Reading bytes via backend then passing | Pass `S3Object` ref; AWS reads from S3 internally (no egress) |
| S3 presigned PUT | Backend signs without `ContentType`, browser sends with one | Sign WITH `ContentType`; browser sends matching `Content-Type` |
| S3 presigned PUT | Forgetting CORS on the bucket | S3 bucket CORS config required even for presigned URLs |
| CloudFront in front of S3 | Not forwarding `Origin` header | CloudFront cache policy must forward `Origin`, `Access-Control-Request-Method`, `Access-Control-Request-Headers` |
| DashScope/Qwen JSON mode | Trusting `response_format` is schema-enforcing | Pydantic-validate every response; retry once on `ValidationError` |
| DashScope rate limits | No retry on 429 | Exponential backoff (0.5s, 1s, 2s); fall back to `Qwen-Turbo` if `Qwen-Max` rate-limited |
| asyncpg + pgbouncer (transaction mode) | Default prepared-statement caching | `statement_cache_size=0`; use SQLAlchemy `NullPool` |
| FastAPI WebSocket | No `try/finally` cleanup | Always end_stream + cancel reader task in `finally` |
| Alibaba OSS uploads | Using AWS S3 SDK by mistake | OSS has its own SDK (`oss2`) — different signature, different bucket-name rules |
| boto3 region resolution | Implicit default (`us-east-1`) | Set `AWS_DEFAULT_REGION=ap-southeast-1` in env AND pass `region_name=` explicitly |
| Tair (Redis) | Treating as job queue | Tair is read-through cache only per architecture; jobs go in Postgres |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Single uvicorn worker for everything | One slow request blocks others | Multiple workers behind sticky-session LB; OR split WS service | ~30 concurrent users (acceptable for demo) |
| Loading all 4 locales for 50 listings | Slow listing page | Project only the requested locale at SQL level | ~50 concurrent users hitting search |
| bcrypt on event loop | Login latency spikes | `await asyncio.to_thread(bcrypt.checkpw, ...)` | First concurrent login during streaming |
| Partial-transcript flood (5+/s) | Caption UI stutters | Coalesce partials; throttle to 4/s | Immediately on real audio |
| No Tair cache on listings | Hot SQL queries on every browse | Cache `listings:search:{filters_hash}` for 60s | ~5 simultaneous browse users |
| Streaming session lingering after disconnect | AWS quota exhaustion | `try/finally` + max-session timer | Demo day after 20-30 sessions |
| Synchronous Qwen call inside WS handler | Audio captures stop when LLM is slow | After final transcript, send "processing" event, kick async task, await | Every Tamil/Bahasa demo |

---

## Security Mistakes

Domain-specific security issues beyond OWASP basics.

| Mistake | Risk | Prevention |
|---------|------|------------|
| `algorithms=` omitted on `jwt.decode` | Auth bypass via algorithm confusion | Central JWT helper; explicit `algorithms=["HS256"]` |
| Wide-open CORS (`*`) on backend | Token theft if cookies added later; CSRF surface | Allowlist exact origins; one for prod, one for localhost dev |
| KYC images / audio passing through backend | PII in app logs, larger blast radius | Browser → presigned S3 PUT directly (already in design — preserve this) |
| 24-hour KYC bucket retention not configured | IC images linger forever | S3 lifecycle rule: delete after 1 day |
| AWS IAM role too broad (`s3:*`) | Compromise = full bucket dump | IAM scoped to `s3:PutObject`/`s3:GetObject` on the specific bucket prefix |
| Demo account password in source code | Public-account hijack | OK if (a) CORS locked, (b) rate-limited, (c) rotated post-demo |
| JWT secret committed or default | Token forgery | `secrets.token_urlsafe(64)` per env; never in git |
| Transcribe streaming credentials in browser | Direct AWS access from client | Backend proxies WebSocket (already in design) |
| FastAPI `debug=True` in prod | Tracebacks leak PII | `debug=False`; global exception handler returning sanitized error |
| Logging raw transcripts / IC images | PII in CloudWatch | Log only IDs + status codes; redact patterns matching IC numbers |
| Presigned URL with 24h expiry "for safety" | Long-lived upload window | 15 min for KYC, 5 min for audio — re-issue if needed |
| No rate-limit on `/auth/login` | Credential stuffing on demo accounts | slowapi or Tair counter: 10/min/IP |

---

## UX Pitfalls

Common user experience mistakes for elder users.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Hard-rejecting borderline KYC matches | Elder with valid IC + poor lighting can't onboard | `manual_review` tier + clear "we'll review within 24h" message |
| Free-text `failureReason` | Can't localize; elder reads English error in Bahasa UI | Enum failure code + locale-specific user-facing message map |
| 60-second polling timeout for KYC | Users sent back to step 1 mid-job | Honor `estimatedSeconds × 3`; distinguish "slow" from "failed" (per CONCERNS.md) |
| Token-in-module-memory only (existing debt) | Refresh logs the user out | sessionStorage OR HTTP-only cookie (out of scope per PROJECT.md, but flag it) |
| Caption UI flickering during partials | Disorienting | Throttle + `useDeferredValue` |
| Silent failure on Qwen schema mismatch | Elder records voice, sees blank form | Pydantic validation + 1-shot retry + visible "couldn't extract" message |
| Multi-locale error messages from generic 500 | Sees English "Internal server error" in Tamil UI | Frontend renders ONLY the i18n key from a known error_code; never raw `.detail` |
| Voice recording with no time indicator | Users keep talking past Transcribe's session limit | UI countdown; auto-stop at 55s with "tap to extend" |
| Booking flow with stale Tair cache | Just-created listing not visible | Cache invalidation on write OR short TTL (60s) for listings cache |
| Onboarding KYC failure → `retryKyc` invalidates session | Mid-job retries throw away progress (per CONCERNS.md) | Allow retry only after terminal `failed`; don't invalidate while pending |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **eKYC pipeline:** Often missing — works on US driver's license sample image but fails on real MyKad. **Verify:** smoke test with a redacted real MyKad image, not the AWS sample assets.
- [ ] **Transcribe Streaming:** Often missing — works in `localhost` because no proxy timeout. **Verify:** test on the deployed Alibaba ECS through the actual SLB with a 30s pause mid-recording.
- [ ] **Multi-locale rendering:** Often missing — backend returns `text_en` but frontend has `locale=ta` user. **Verify:** log in as `siti@` (locale=ms), check companion alert text is Bahasa, not English.
- [ ] **CORS on S3 buckets:** Often missing — works in dev because backend proxies. **Verify:** open Network tab during KYC upload from CloudFront URL; PUT should be 200 not CORS-blocked.
- [ ] **JWT decode hardening:** Often missing — works because nobody crafts malicious tokens locally. **Verify:** unit test sends `{"alg":"none"}` token; decode must raise.
- [ ] **WebSocket cleanup:** Often missing — works because dev sessions are tiny. **Verify:** kill browser tab during recording; AWS Transcribe console should show session ending within 5s.
- [ ] **Presigned URL Content-Type:** Often missing — generated without ContentType, works for one Content-Type by luck. **Verify:** unit test that passes `image/png` to backend, browser PUTs `image/jpeg`, expect 403.
- [ ] **Seed re-runnability:** Often missing — works on first run, blows up on second. **Verify:** run `seed.py` twice; second run must exit 0 with the same DB state.
- [ ] **Region pinning:** Often missing — works because dev account default is fine. **Verify:** log boto3 region on startup; assert `ap-southeast-1` in tests.
- [ ] **`debug=False` in prod:** Often missing — staging mirrors dev config. **Verify:** trigger a 500 in staging; response body must NOT contain `Traceback` text.
- [ ] **Qwen JSON schema validator:** Often missing — works on the 3 hand-tested transcripts. **Verify:** integration test with a deliberately ambiguous Tamil clip.
- [ ] **Tair cache invalidation on write:** Often missing — listings created in the last minute don't appear in search. **Verify:** create listing, immediately search; expect new listing in results.
- [ ] **bcrypt off-loop:** Often missing — works in dev with one user. **Verify:** load test 5 concurrent logins; p95 should be <500ms not 2.5s.
- [ ] **JWT secret ≠ default:** Often missing — example value committed and used. **Verify:** `JWT_SECRET=dev-secret` must NOT pass startup validation.
- [ ] **S3 lifecycle rule:** Often missing — buckets accumulate IC images forever. **Verify:** AWS CLI `aws s3api get-bucket-lifecycle-configuration --bucket gingergig-kyc`; expect 1-day expiration rule.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AnalyzeID doesn't work on MyKad | HIGH | Swap to `AnalyzeDocument` + regex parser; rewrite KYC service module; ~half day |
| boto3 used for streaming | LOW | Add `amazon-transcribe`; rewrite ~80 lines of streaming handler; ~2 hours |
| Algorithm-confusion JWT bypass | CRITICAL | Rotate `JWT_SECRET`, force re-login all sessions, ship hardened helper, audit other decode call sites |
| WebSocket session leak | MEDIUM | Add `try/finally` cleanup, ship; old sessions die at AWS 4h limit naturally |
| S3 CORS error in prod | LOW | Update bucket CORS policy via console / CLI; takes effect in seconds |
| Qwen returns markdown-fenced JSON | LOW | Add `.strip().removeprefix("\`\`\`json")` strip + retry loop |
| asyncpg "another operation in progress" | MEDIUM | Audit codebase for shared sessions; refactor to per-request dep; restart |
| Connection pool exhausted | LOW | Lower pool_size + add `pool_pre_ping`; restart; monitor for 5 min |
| 504 on batch voice endpoint | MEDIUM | Convert to async job pattern; frontend polling helper from KYC is reusable |
| KYC bucket has 1000 stale IC images | LOW | Apply lifecycle rule retroactively + manual cleanup of existing keys |
| ALB killing WebSockets at 60s | LOW | Bump idle timeout in ALB / SLB config; redeploy not required |
| `create_all` left columns missing | MEDIUM | Adopt alembic; generate baseline migration from current state; test on staging |
| Wrong region (`us-east-1`) | LOW | Set `AWS_REGION` env; redeploy; cost recovery via AWS support if substantial |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. AnalyzeID on MyKad | KYC pipeline phase (decision before phase starts) | Smoke test on real MyKad image returns ≥3 fields with confidence ≥80% |
| 2. boto3 for streaming | Phase 1 (deps) | `amazon-transcribe` in `pyproject.toml` |
| 3. JWT algorithm confusion | Auth phase | Unit test: token with `{"alg":"none"}` raises; central helper has zero `decode` callsites with 2 args |
| 4. WebSocket session leak | Voice streaming phase | Manual test: close tab during stream, watch AWS console close session within 5s |
| 5. Cross-cloud CORS | KYC + voice batch phases | Browser console clean during upload from deployed CloudFront URL |
| 6. Cross-cloud egress costs | Phase 1 (deploy) | Region log line on startup; AWS budget alert configured |
| 7. Qwen JSON validation | Voice-to-profile phase | Integration test with 3 ambiguous transcripts (one per non-English locale) |
| 8. Async session sharing | Phase 1 (DB scaffold) | Code review: `AsyncSession(` only in `db.py`; all routes use `Depends(get_db)` |
| 9. Connection pool sizing | Phase 1 (DB) | Load test 50 req/s for 60s; no `QueuePool` errors |
| 10. `create_all` vs alembic | Phase 1 (DB) | `alembic.ini` exists; CI runs `alembic upgrade head` |
| 11. Seed FK ordering | Phase 1 (seed) | `python -m seed && python -m seed` both exit 0; identical DB state |
| 12. Audio chunk format | Voice streaming phase | Backend logs show 16kHz/PCM in audio metadata; transcripts non-empty |
| 13. Partial-transcript flood | Voice streaming phase | DevTools Network: ≤4 WS messages/sec during speech |
| 14. Inline batch polling | Voice batch phase | Endpoint returns in <2s; jobId-based polling working |
| 15. Rekognition 3-tier states | KYC phase | Unit test: 75% similarity → `manual_review`; 95% → `approved`; no face → `failed` |
| 16. Multi-locale fetch | Listings + alerts phase | Network response contains only one locale's text per item |
| 17. ALB WebSocket idle timeout | Deploy phase | 60s silence mid-recording does not disconnect WS |
| 18. bcrypt blocking event loop | Auth phase | `grep -r "bcrypt" backend/` shows only `to_thread` callsites |
| 19. Demo password + open CORS combo | Auth + deploy phase | `allow_origins` is a non-`*` allowlist; `JWT_SECRET` length ≥ 64; rate-limit on login |
| 20. PII via debug tracebacks | Phase 1 (scaffold) + every phase | `debug=False` asserted in startup; global exception handler returns sanitized JSON |

---

## Sources

**Official documentation (HIGH confidence):**
- [AWS Textract Analyzing Identity Documents](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html) — confirms `AnalyzeID` is US-only
- [AWS Textract AnalyzeID AI Service Card](https://docs.aws.amazon.com/ai/responsible-ai/textract-analyzeid/overview.html) — confirms US driver's licenses + US passports only
- [Amazon Transcribe Streaming SDK (awslabs)](https://github.com/awslabs/amazon-transcribe-streaming-sdk) — async Python SDK, not boto3
- [Amazon Transcribe Streaming SDK docs](https://amazon-transcribe-streaming-sdk.readthedocs.io/en/stable/index.html) — chunk size 50-200ms, 16kHz PCM
- [Amazon Rekognition CompareFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_CompareFaces.html) — similarity 0-100, image PNG/JPEG, 5MB limit
- [AWS Rekognition image specifications](https://docs.aws.amazon.com/rekognition/latest/dg/images-information.html) — image format constraints
- [DashScope structured output](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output) — JSON Schema mode strict; JSON Object mode is not
- [DashScope JSON mode](https://www.alibabacloud.com/help/en/model-studio/json-mode) — `response_format` usage and edge cases
- [Alembic autogenerate caveat](https://alembic.sqlalchemy.org/en/latest/autogenerate.html) — autogenerate is not perfect, manual review required
- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/) — disconnect handling
- [SQLAlchemy + asyncpg pgbouncer issue](https://github.com/sqlalchemy/sqlalchemy/issues/6467) — `statement_cache_size=0` for transaction-pool pgbouncer
- [boto3 Issue #2296 — Transcribe Streaming not supported](https://github.com/boto/boto3/issues/2296) — confirms boto3 ≠ streaming
- [S3 CORS deep dive (AWS Media blog)](https://aws.amazon.com/blogs/media/deep-dive-into-cors-configs-on-aws-s3-how-to/) — preflight + CloudFront forwarding
- [S3 CORS troubleshooting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors-troubleshooting.html) — signature mismatch + preflight failures

**Security advisories (HIGH confidence):**
- [PortSwigger Web Security: JWT algorithm confusion](https://portswigger.net/web-security/jwt/algorithm-confusion) — attack mechanism
- [CVE-2022-29217 PyJWT algorithm confusion](https://www.vicarius.io/vsociety/posts/risky-algorithms-algorithm-confusion-in-pyjwt-cve-2022-29217)
- [CVE-2024-33663 python-jose](https://www.sentinelone.com/vulnerability-database/cve-2024-33663/)
- [CVE-2025-45768 PyJWT weak encryption](https://zeropath.com/blog/cve-2025-45768-pyjwt-weak-encryption-summary)

**Community / tutorials (MEDIUM confidence — patterns):**
- [Async DB sessions in FastAPI (DEV)](https://dev.to/akarshan/asynchronous-database-sessions-in-fastapi-with-sqlalchemy-1o7e) — per-request session pattern
- [FastAPI + Async SQLAlchemy + Alembic (TestDriven.io)](https://testdriven.io/blog/fastapi-sqlmodel/) — alembic in production
- [Real-time streaming with AWS Transcribe and Python (Lejdi Prifti)](https://lejdiprifti.com/2024/02/08/real-time-streaming-with-aws-transcribe-and-python/) — chunk format details
- [Building streaming STT with FastAPI + Transcribe (Atul Kumar)](https://medium.com/@atulkumar_68871/building-a-streaming-speech-to-text-application-with-fastapi-and-amazon-transcribe-6203d857375a) — backend-as-WS-proxy pattern
- [Handling WebSocket disconnections gracefully (Hex Shift)](https://hexshift.medium.com/handling-websocket-disconnections-gracefully-in-fastapi-9f0a1de365da) — try/finally pattern
- [Deploying WS apps with uvicorn + nginx (Hex Shift)](https://hexshift.medium.com/deploying-websocket-applications-built-with-fastapi-using-uvicorn-gunicorn-and-nginx-04249b1cb87d) — proxy timeouts
- [bcrypt cost factor 2025 (DEV)](https://dev.to/nesniv/understanding-bcrypts-work-factor-and-choosing-the-right-value-103m) — current rounds recommendations
- [Postgres idempotent upsert (Jon Meyers)](https://jonmeyers.io/blog/use-on-conflict-to-upsert-in-postgresql/) — `ON CONFLICT` seed pattern

**Internal source (HIGH confidence):**
- `/Users/user/repos/GingerGig/.planning/codebase/CONCERNS.md` — surfaces existing debt and known KYC polling timeout issue
- `/Users/user/repos/GingerGig/MULTI-CLOUD-ARCHITECTURE.md` — defines the cross-cloud topology these pitfalls map to
- `/Users/user/repos/GingerGig/frontend/src/services/api/endpoints/kyc.ts` — current frontend contract that the backend must honor

---
*Pitfalls research for: GingerGig multi-cloud backend (FastAPI + asyncpg + AWS ASR/eKYC + Alibaba ECS/OSS/Qwen)*
*Researched: 2026-04-25*
