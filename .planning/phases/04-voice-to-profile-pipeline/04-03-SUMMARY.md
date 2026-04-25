---
phase: 04-voice-to-profile-pipeline
plan: 03
subsystem: voice
tags: [websocket, amazon-transcribe, fastapi, qwen, pytest]

requires:
  - phase: 04-01-PLAN.md
    provides: voice session DB fields and streaming guardrails
  - phase: 04-02-PLAN.md
    provides: ListingDraft schema and Qwen extract_listing service
provides:
  - Amazon Transcribe Streaming wrapper pinned to ap-southeast-1
  - Elder-only WebSocket route at /api/v1/voice-to-profile/stream?token=<JWT>
  - Streaming voice service with PCM queue, partial throttling, Qwen finalization, and cleanup discipline
affects: [04-voice-to-profile-pipeline, 05-frontend-wiring-type-extensions]

tech-stack:
  added: []
  patterns:
    - Query-token WebSocket auth for browser clients
    - Two-task streaming loop with queue bridge and shared cleanup helper
    - Mocked AWS streaming tests with no live network calls

key-files:
  created:
    - backend/app/integrations/transcribe_streaming.py
    - backend/app/services/voice_service.py
    - backend/tests/test_voice_streaming.py
  modified:
    - backend/app/routers/voice.py
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Pin streaming Transcribe client construction to ap-southeast-1 in the integration module."
  - "Use text JSON {\"type\":\"end\"} as the client end-of-stream signal after binary PCM frames."
  - "Close unauthorized or non-elder WebSocket handshakes with 4401 after accepting the connection."

patterns-established:
  - "Partial transcript fan-out uses a pure should_send_partial helper with a 250ms minimum send interval and duplicate suppression."
  - "Streaming cleanup runs through one helper that ends the input stream, cancels reader tasks, and suppresses disconnect races."

requirements-completed:
  - VOICE-01
  - VOICE-02
  - VOICE-03

duration: 7 min
completed: 2026-04-25
---

# Phase 04 Plan 03: Transcribe Streaming Integration, WebSocket Handler, Voice Service Summary

**The real-time voice path now accepts elder WebSocket audio, proxies 16kHz PCM into Amazon Transcribe Streaming, throttles partials, and finalizes transcripts through Qwen listing extraction.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-25T17:24:00Z
- **Completed:** 2026-04-25T17:30:45Z
- **Tasks:** 5 completed
- **Files modified:** 6 tracked files in this plan metadata scope

## Accomplishments

- Added `transcribe_streaming.py` using `amazon-transcribe` only, with explicit Singapore region pinning and a typed transcript-result adapter.
- Replaced the voice stub with `GET /api/v1/voice-to-profile/stream?token=<JWT>`, authenticating via `get_current_user_ws` and enforcing elder-only access.
- Implemented streaming orchestration with handshake validation, PCM binary-frame queueing, partial throttling, 90s timeout, DB status persistence, and `extract_listing` finalization.
- Added mocked WebSocket/streaming tests covering auth failures, batch-only language rejection, throttling, disconnect cleanup, and reader-task cancellation.

## Task Commits

Each task was committed atomically:

1. **Task 04-03-01: Create transcribe_streaming.py with TranscribeStreamingClient ap-southeast-1** - `c45a4cf` (feat)
2. **Task 04-03-02: Implement voice_service streaming orchestration (queue, two tasks, throttle)** - `870fb79` (feat)
3. **Task 04-03-03: Replace voice.py with WebSocket route and elder guard** - `458cb93` (feat)
4. **Task 04-03-04: Resource cleanup: try/finally, end_stream, reader cancel, disconnect** - `88799da` (fix)
5. **Task 04-03-05: Add test_voice_streaming.py with mocks** - `671d7af` (test)

**Plan metadata:** included in the final `docs(04-03)` commit.

## Files Created/Modified

- `backend/app/integrations/transcribe_streaming.py` - Creates the `amazon-transcribe` streaming client, starts 16kHz PCM streams, and adapts SDK transcript events.
- `backend/app/services/voice_service.py` - Owns handshake validation, queue-based audio forwarding, partial throttling, Qwen finalization, DB persistence, timeout, and cleanup.
- `backend/app/routers/voice.py` - Replaces the stub with the elder-only WebSocket route using the `token` query parameter.
- `backend/tests/test_voice_streaming.py` - Adds mocked tests for WebSocket auth, language rejection, partial throttling, disconnect cleanup, and task cancellation.
- `.planning/STATE.md` - Advances project state to Phase 04 plan 04 readiness.
- `.planning/ROADMAP.md` - Marks `04-03-PLAN.md` complete and Phase 04 progress at 3/5.

## Decisions Made

- The streaming integration pins the voice path to `ap-southeast-1`, independent of any accidental non-Singapore AWS default.
- The WebSocket protocol requires an initial JSON language handshake, binary PCM frames, then text JSON `{"type":"end"}` to trigger final extraction.
- The router accepts before auth failures so browser clients receive a deterministic WebSocket close code instead of a handshake denial.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Disconnect cleanup race surfaced while adding mocked tests**
- **Found during:** Task 04-03-04 (Resource cleanup: try/finally, end_stream, reader cancel, disconnect)
- **Issue:** A client-reader task could finish with `WebSocketDisconnect` and then re-raise during cleanup after the upstream stream had already been ended.
- **Fix:** Shared cleanup now suppresses `WebSocketDisconnect` alongside `CancelledError` while still cancelling the task and ending the input stream.
- **Files modified:** `backend/app/services/voice_service.py`, `backend/tests/test_voice_streaming.py`
- **Verification:** `uv run pytest tests/test_voice_streaming.py -q` passes.
- **Committed in:** `88799da`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to make disconnect cleanup deterministic; no scope expansion beyond the planned cleanup discipline.

## Issues Encountered

- `TestClient(app)` as a context manager runs FastAPI lifespan and tried to build a local database engine from the developer DSN. The WebSocket auth tests avoid lifespan and patch the route sessionmaker so they remain pure unit tests with no database or network calls.
- `VOICE-01` through `VOICE-03` were already marked complete in `.planning/REQUIREMENTS.md`; requirements were left unchanged to avoid unnecessary churn.
- `tests/test_voice_contract.py` still has one expected skip for the batch HTTP routes planned in `04-04`.

## User Setup Required

None - no external service configuration required beyond the existing AWS/DashScope environment variables.

## Verification

- `rg "^import boto3|^from boto3" backend/app/integrations/transcribe_streaming.py` - PASS, no matches
- `uv run pytest tests/test_no_forbidden_imports.py -q` - PASS
- `uv run python -c "from app.services.voice_service import should_send_partial; ..."` - PASS
- `uv run python -c "from starlette.routing import WebSocketRoute; from app.main import app; ..."` - PASS, `/api/v1/voice-to-profile/stream` registered
- `uv run pytest tests/test_voice_streaming.py -q` - PASS, 6 passed
- `uv run pytest tests/test_voice_streaming.py tests/test_voice_qwen.py tests/test_no_forbidden_imports.py tests/test_voice_contract.py -q` - PASS, 13 passed, 1 skipped
- `uv run ruff check app/integrations/transcribe_streaming.py app/services/voice_service.py app/routers/voice.py` - PASS
- `git diff --name-only HEAD -- frontend` - PASS, no frontend changes

## Next Phase Readiness

Ready for `04-04-PLAN.md` (S3 presign, Transcribe batch, async job, and status HTTP routes). The streaming WebSocket route is live; the only expected voice contract gap is the batch HTTP surface.

## Self-Check: PASSED

---
*Phase: 04-voice-to-profile-pipeline*
*Completed: 2026-04-25*
