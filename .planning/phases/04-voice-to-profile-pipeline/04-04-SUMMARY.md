---
phase: 04-voice-to-profile-pipeline
plan: 04
subsystem: voice
tags: [s3, transcribe-batch, boto3, fastapi, qwen, pytest]

requires:
  - phase: 04-01-PLAN.md
    provides: voice session batch correlation fields
  - phase: 04-02-PLAN.md
    provides: ListingDraft schema and Qwen extraction service
  - phase: 04-03-PLAN.md
    provides: existing streaming WebSocket route to preserve
provides:
  - Elder-scoped presigned S3 audio upload URLs in ap-southeast-1
  - Boto3 Transcribe Batch wrapper with bounded polling and transcript fetch
  - Async batch submit/status HTTP routes with IDOR protection and Qwen failure mapping
affects: [04-voice-to-profile-pipeline, 05-frontend-wiring-type-extensions, 06-multi-cloud-live-deployment]

tech-stack:
  added: []
  patterns:
    - Browser-direct S3 audio upload with signed ContentType
    - Batch worker scheduled outside request flow and opening get_sessionmaker(app.state.engine)
    - Status polling hides cross-user jobs with 404 and maps extraction failure to 502

key-files:
  created:
    - backend/app/integrations/s3_audio.py
    - backend/app/integrations/transcribe_batch.py
    - backend/tests/test_voice_batch.py
  modified:
    - backend/app/routers/voice.py
    - backend/app/schemas/voice.py
    - backend/app/core/config.py
    - backend/.env.example
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Reuse S3_AUDIO_BUCKET for Transcribe output and isolate transcript JSON under S3_TRANSCRIBE_OUTPUT_PREFIX."
  - "Schedule batch processing with asyncio.create_task so POST /batch returns pending without waiting for polling."
  - "Keep DB status 'recording' as the stored initial state and expose it as API status 'pending' for batch jobs."

patterns-established:
  - "Batch AWS SDK boundary: boto3 lives in s3_audio.py and transcribe_batch.py only; streaming remains amazon-transcribe only."
  - "Batch background work obtains a new AsyncSession from get_sessionmaker(app.state.engine), never the request db dependency."
  - "Persistent ListingExtractionError is stored as 'Listing extraction failed' and mapped to HTTP 502 on status polling."

requirements-completed:
  - VOICE-04
  - VOICE-05

duration: 8 min
completed: 2026-04-25
---

# Phase 04 Plan 04: S3 Presign, Transcribe Batch, Async Job and Status HTTP Routes Summary

**Malay/Tamil batch voice now uploads directly to S3, runs Transcribe Batch in the background, and returns pollable listing drafts with mocked AWS/Qwen coverage.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-25T17:35:47Z
- **Completed:** 2026-04-25T17:43:32Z
- **Tasks:** 5 completed
- **Files modified:** 8 tracked files in this plan metadata scope

## Accomplishments

- Added elder-scoped S3 presigned PUT helper with explicit `ap-southeast-1` and signed `ContentType`.
- Added boto3 Transcribe Batch integration for `StartTranscriptionJob`, bounded `GetTranscriptionJob` polling, and transcript JSON extraction.
- Added `POST /voice-to-profile/audio-upload-url`, `POST /voice-to-profile/batch`, and `GET /voice-to-profile/batch/{job_id}` while preserving the existing WebSocket route.
- Added mocked batch tests for S3 presign, pending submit, ready status, IDOR protection, invalid S3 keys, fresh-session worker path, and extraction-failure 502 mapping.

## Task Commits

Each task was committed atomically:

1. **Task 04-04-01: Add s3_audio.py for presigned PUT in ap-southeast-1** - `35f003e` (feat)
2. **Task 04-04-02: Add transcribe_batch.py StartTranscriptionJob and transcript fetch** - `75e72d4` (feat)
3. **Task 04-04-03: POST batch, GET status, POST audio-upload-url routes with Pydantic models** - `4310796` (feat)
4. **Task 04-04-04: Config: optional Transcribe output bucket or prefix; .env.example** - `43e2d68` (chore)
5. **Task 04-04-05: Add test_voice_batch.py with mocked boto3 and extract_listing** - `66c44c6` (test)

**Verification fix:** `b9cf7ae` (fix) switched the batch worker scheduler to `asyncio.create_task` so the submit handler stays non-blocking and the async route tests can capture the scheduled coroutine.

## Files Created/Modified

- `backend/app/integrations/s3_audio.py` - Builds elder-scoped audio keys and presigns S3 PUT uploads with `ContentType`.
- `backend/app/integrations/transcribe_batch.py` - Starts and polls Transcribe Batch jobs, then reads transcript JSON from S3/HTTPS URI.
- `backend/app/routers/voice.py` - Adds batch HTTP routes and async worker while preserving `/stream`.
- `backend/app/schemas/voice.py` - Adds upload URL request/response DTOs.
- `backend/app/core/config.py` - Adds `s3_transcribe_output_prefix`.
- `backend/.env.example` - Documents S3 audio upload and Transcribe output expectations.
- `backend/tests/test_voice_batch.py` - Adds mocked AWS/Qwen coverage for the batch path.

## Decisions Made

- Reused `S3_AUDIO_BUCKET` for Transcribe output with `S3_TRANSCRIBE_OUTPUT_PREFIX=transcribe-output` instead of adding a second bucket.
- Used `asyncio.create_task` rather than FastAPI `BackgroundTasks`; both satisfy the plan, and `create_task` better preserves immediate response semantics under the async test transport.
- Mapped stored batch `recording` status to API `pending` to avoid a new migration solely for the initial batch state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Starlette BackgroundTasks did not advance the mocked batch job in async route tests**
- **Found during:** Task 04-04-05 (Add test_voice_batch.py with mocked boto3 and extract_listing)
- **Issue:** The first test implementation left status at `pending`, making it unclear whether the worker was scheduled and completed. The existing test harness also wraps request DB work in an outer rollback transaction, so a separate test connection cannot see the just-created row.
- **Fix:** Switched production scheduling to the plan-approved `asyncio.create_task` path and added a small `_schedule_batch_job` helper so tests can capture and await the scheduled worker deterministically. Tests spy on `get_sessionmaker` while yielding the fixture session to avoid cross-connection transaction invisibility.
- **Files modified:** `backend/app/routers/voice.py`, `backend/tests/test_voice_batch.py`
- **Verification:** `uv run pytest tests/test_voice_batch.py -q` passes with all AWS/Qwen calls mocked.
- **Committed in:** `b9cf7ae` and `66c44c6`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope expansion. The change strengthens the required non-blocking submit behavior and keeps the worker session boundary explicit in production code.

## Issues Encountered

- The local shell did not export `TEST_DATABASE_URL`/`DATABASE_URL`; DB-backed pytest commands were run by sourcing `backend/.env` without printing secrets.
- `VOICE-04` and `VOICE-05` were already marked complete in `.planning/REQUIREMENTS.md`, so requirements were left unchanged to avoid unnecessary churn.
- The generated codebase map remains stale from the initial mapper run and says the backend is missing; no manual codebase-map refresh was done because this plan summary now carries the batch contracts for the next plan.

## User Setup Required

None - no new external service beyond the already planned AWS S3/Transcribe bucket. Operators must set `S3_AUDIO_BUCKET` and may override `S3_TRANSCRIBE_OUTPUT_PREFIX`.

## Verification

- `set -a; source .env; set +a; uv run pytest tests/test_voice_batch.py -q` - PASS, `5 passed`
- `set -a; source .env; set +a; uv run pytest tests/test_voice_batch.py tests/test_voice_qwen.py tests/test_voice_contract.py -q` - PASS, `12 passed`
- `uv run ruff check app/integrations/s3_audio.py app/integrations/transcribe_batch.py app/routers/voice.py` - PASS
- `set -a; source .env; set +a; uv run pytest tests/test_voice_streaming.py tests/test_no_forbidden_imports.py -q` - PASS, `7 passed`
- `uv run ruff check app/integrations/s3_audio.py app/integrations/transcribe_batch.py app/routers/voice.py app/schemas/voice.py app/core/config.py tests/test_voice_batch.py` - PASS
- `git diff --name-only HEAD -- frontend` - PASS, no frontend changes

## Next Phase Readiness

Ready for `04-05-PLAN.md` (502 unification, contract completion, and full phase verification). The streaming WebSocket is preserved, batch HTTP routes are registered, and the remaining work is final contract hardening/phase-level verification.

## Self-Check: PASSED

---
*Phase: 04-voice-to-profile-pipeline*
*Completed: 2026-04-25*
