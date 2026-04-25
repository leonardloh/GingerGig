---
phase: 04-voice-to-profile-pipeline
plan: 01
subsystem: database
tags: [alembic, postgres, voice, pytest, guardrails, aws-transcribe]

requires:
  - phase: 02-auth-bearer-middleware
    provides: bearer JWT dependencies and `get_current_user_ws`
provides:
  - Voice session batch correlation columns for S3 audio keys and Transcribe job names
  - Wave 0 voice route contract tests and AWS region pin
  - Static guardrail blocking boto3 imports in the streaming integration module
affects: [04-voice-to-profile-pipeline, 05-frontend-wiring-type-extensions]

tech-stack:
  added: []
  patterns:
    - Alembic-only schema evolution for voice batch fields
    - Route contract tests with planned skips until downstream implementation plans land

key-files:
  created:
    - backend/alembic/versions/0003_voice_session_batch_correlation.py
    - backend/tests/test_voice_contract.py
  modified:
    - backend/app/models/voice_session.py
    - backend/tests/test_no_forbidden_imports.py
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Store voice batch correlation directly on voice_sessions via nullable text columns."
  - "Keep Wave 0 route contract checks skipped until 04-03/04-04 register the real routes."
  - "Keep Alembic revision ids within 32 characters because the existing alembic_version column is varchar(32)."

patterns-established:
  - "Streaming guardrail: app/integrations/transcribe_streaming.py may not import boto3 directly."
  - "Voice contract tests pin ap-southeast-1 before live AWS integrations are introduced."

requirements-completed:
  - VOICE-01
  - VOICE-02
  - VOICE-03
  - VOICE-04
  - VOICE-05
  - VOICE-06
  - VOICE-07

duration: 3 min
completed: 2026-04-25
---

# Phase 04 Plan 01: Voice Batch DB Migration, Contract Harness, and Guardrails Summary

**Voice session batch correlation columns, route contract placeholders, and streaming SDK guardrails are in place for the downstream voice implementation plans.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-25T17:13:15Z
- **Completed:** 2026-04-25T17:16:42Z
- **Tasks:** 5 completed
- **Files modified:** 7 tracked files in this plan metadata scope

## Accomplishments

- Added Alembic revision `0003_voice_batch_correlation` and matching `VoiceSession` ORM fields for `audio_s3_key` and `transcribe_job_name`.
- Applied the migration to the configured database used by local pytest fallback and verified both columns are nullable `text`.
- Added Wave 0 voice contract tests for expected paths, AWS Singapore region pinning, and future streaming-module boto3 checks.
- Extended the existing forbidden-import guardrail so `app/integrations/transcribe_streaming.py` cannot import boto3.

## Task Commits

Each task was committed atomically:

1. **Task 04-01-01: Alembic migration 0003 voice_sessions batch correlation columns** - `05321be` (feat)
2. **Task 04-01-02: Update VoiceSession ORM model for new columns** - `e444ea0` (feat)
3. **Task 04-01-03: [BLOCKING] Apply migration to test and dev databases** - `9d39d06` (fix)
4. **Task 04-01-04: Add test_voice_contract.py for routes, region pin, and batch response shape placeholders** - `365e318` (test)
5. **Task 04-01-05: Extend no_forbidden_imports for streaming integration module** - `903c627` (test)

**Plan metadata:** included in the final `docs(04-01)` commit.

## Files Created/Modified

- `backend/alembic/versions/0003_voice_session_batch_correlation.py` - Adds nullable `audio_s3_key` and `transcribe_job_name` columns to `voice_sessions`.
- `backend/app/models/voice_session.py` - Maps the new nullable text columns on `VoiceSession`.
- `backend/tests/test_voice_contract.py` - Adds Wave 0 route contract placeholders, AWS region pin, and streaming-module guard placeholder.
- `backend/tests/test_no_forbidden_imports.py` - Adds a targeted boto3 import guard for the future streaming integration module.
- `.planning/STATE.md` - Advances project state to Phase 04 plan 02 readiness.
- `.planning/ROADMAP.md` - Marks `04-01-PLAN.md` complete and Phase 04 in progress.
- `.planning/REQUIREMENTS.md` - Marks the plan frontmatter VOICE IDs complete per GSD tracking protocol and repairs SDK-produced markdown wrapping.

## Decisions Made

- Batch correlation stays on `voice_sessions` as nullable text fields rather than introducing a separate job table in Wave 0.
- `TEST_DATABASE_URL` is not set locally; the existing test harness falls back to the normalized `DATABASE_URL`, so the blocking migration apply was verified against that configured database.
- Route contract tests remain skipped until 04-03/04-04 replace the voice stub with real WebSocket and HTTP endpoints.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Alembic revision id exceeded `alembic_version.version_num` length**
- **Found during:** Task 04-01-03 ([BLOCKING] Apply migration to test and dev databases)
- **Issue:** Revision id `0003_voice_session_batch_correlation` was longer than the database's `varchar(32)` Alembic version column, so the migration DDL rolled back while stamping the version.
- **Fix:** Shortened the revision id to `0003_voice_batch_correlation` while preserving the file name and migration operations.
- **Files modified:** `backend/alembic/versions/0003_voice_session_batch_correlation.py`
- **Verification:** `alembic upgrade head`, `alembic current`, column inspection, and `alembic check` all passed after the fix.
- **Committed in:** `9d39d06`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the blocking migration apply to complete; no scope expansion beyond making the planned migration valid.

## Issues Encountered

- `uv run alembic check` without a process-local DSN override initially attempted the `psycopg2` dialect from local configuration. Verification used the established normalized `postgresql+asyncpg` and `DATABASE_SSL_MODE=disable` override without printing secrets.
- `gsd-sdk query state.advance-plan` could not parse the current STATE format, so STATE was updated manually.
- `gsd-sdk query roadmap.update-plan-progress 04` did not find the roadmap checkbox shape, so ROADMAP was updated manually.
- `gsd-sdk query requirements.mark-complete ...` succeeded but wrapped VOICE IDs across lines; the malformed markdown was repaired manually before commit.

## User Setup Required

None - no external service configuration required.

## Verification

- `DATABASE_URL="$(...normalized asyncpg DSN...)" DATABASE_SSL_MODE=disable uv run alembic upgrade head` - PASS
- `DATABASE_URL="$(...normalized asyncpg DSN...)" DATABASE_SSL_MODE=disable uv run alembic current` - PASS, `0003_voice_batch_correlation (head)`
- SQLAlchemy information_schema inspection for `audio_s3_key` and `transcribe_job_name` - PASS, both nullable `text`
- `DATABASE_URL="$(...normalized asyncpg DSN...)" DATABASE_SSL_MODE=disable uv run alembic check` - PASS, no new upgrade operations detected
- `uv run mypy app/models/voice_session.py` - PASS
- `uv run pytest tests/test_voice_contract.py -q` - PASS, `1 passed, 2 skipped`
- `uv run pytest tests/test_no_forbidden_imports.py -q` - PASS
- `uv run pytest tests/test_voice_contract.py tests/test_no_forbidden_imports.py -q` - PASS, `2 passed, 2 skipped`
- `uv run ruff check .` - PASS
- `git diff --name-only HEAD -- frontend` - PASS, no frontend changes

## Next Phase Readiness

Ready for `04-02-PLAN.md` (schemas, Qwen `extract_listing`, and unit tests). The only expected skips are route/module placeholders that 04-03 and 04-04 are planned to implement before 04-05 full verification.

## Self-Check: PASSED

---
*Phase: 04-voice-to-profile-pipeline*
*Completed: 2026-04-25*
