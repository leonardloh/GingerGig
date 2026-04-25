---
phase: 04-voice-to-profile-pipeline
plan: 02
subsystem: ai
tags: [qwen, dashscope, pydantic, voice, pytest]

requires:
  - phase: 04-01-PLAN.md
    provides: voice session batch correlation columns and voice contract guardrails
provides:
  - Canonical `ListingDraft` schema for Qwen voice extraction
  - DashScope/OpenAI-compatible `extract_listing` service with JSON mode, fence stripping, Pydantic validation, and one retry
  - Mocked Qwen unit tests covering success, retry, persistent failure, and price coercion
affects: [04-voice-to-profile-pipeline, 05-frontend-wiring-type-extensions]

tech-stack:
  added: []
  patterns:
    - Pydantic-first validation boundary for model output
    - Typed service exception for later router 502 mapping

key-files:
  created:
    - backend/app/schemas/voice.py
    - backend/app/services/qwen_service.py
    - backend/tests/test_voice_qwen.py
  modified:
    - backend/app/core/config.py
    - backend/.env.example
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Keep `ListingDraft` aligned to the architecture/Qwen snake_case JSON shape instead of frontend camelCase."
  - "Default DashScope chat extraction to `qwen-max` through `DASHSCOPE_CHAT_MODEL`."
  - "Raise `ListingExtractionError` from the service; router-level 502 mapping lands in a later plan."

patterns-established:
  - "Qwen JSON extraction: `response_format={\"type\": \"json_object\"}` plus markdown-fence stripping before Pydantic validation."
  - "Validation retry: exactly one retry after `ValidationError`, with the validation text appended to the prompt."

requirements-completed:
  - VOICE-06
  - VOICE-07

duration: 4 min
completed: 2026-04-25
---

# Phase 04 Plan 02: Schemas, Qwen extract_listing, and Unit Tests Summary

**Qwen listing extraction now has canonical voice DTOs, a validated DashScope service boundary, and mocked unit coverage for retry/failure behavior.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T17:19:00Z
- **Completed:** 2026-04-25T17:23:22Z
- **Tasks:** 4 completed
- **Files modified:** 8 tracked files in this plan metadata scope

## Accomplishments

- Added `ListingDraft` with the required Qwen/architecture snake_case fields and schema-level `price_amount` coercion for strings such as `RM 40`.
- Added batch and streaming voice DTOs for the later WebSocket and HTTP route plans.
- Implemented `extract_listing` using `AsyncOpenAI`, DashScope compatible-mode settings, `json_object` response format, fence stripping, Pydantic validation, one retry on `ValidationError`, and typed `ListingExtractionError`.
- Added mocked Qwen unit tests with no live DashScope calls.

## Task Commits

Each task was committed atomically:

1. **Task 04-02-01: Add schemas/voice.py ListingDraft and related DTOs** - `37ff24f` (feat)
2. **Task 04-02-02: Implement qwen_service.extract_listing with json_object, fences, retry, coercion** - `a06e308` (feat)
3. **Task 04-02-03: Wire config and .env.example for optional dashscope model name** - `123baa7` (chore)
4. **Task 04-02-04: Add tests/test_voice_qwen.py with httpx or AsyncOpenAI mocking** - `ce7e9b3` (test)

**Verification fix:** `bdcf091` (fix) addressed ruff/mypy issues found during the plan-level gate.
**Plan metadata:** included in the final `docs(04-02)` commit.

## Files Created/Modified

- `backend/app/schemas/voice.py` - Adds `ListingDraft`, batch DTOs, status response DTO, and stream message DTOs.
- `backend/app/services/qwen_service.py` - Adds DashScope/OpenAI-compatible listing extraction with validation and typed failure.
- `backend/app/core/config.py` - Adds `dashscope_chat_model` with `qwen-max` default.
- `backend/.env.example` - Documents `DASHSCOPE_CHAT_MODEL` beside the existing Qwen settings.
- `backend/tests/test_voice_qwen.py` - Adds mocked unit tests for fence stripping, retry, persistent failure, and price coercion.
- `.planning/STATE.md` - Advances execution state to Phase 04 plan 03 readiness.
- `.planning/ROADMAP.md` - Marks `04-02-PLAN.md` complete and updates Phase 04 plan progress to 2/5.

## Decisions Made

- Preserve the architecture/Qwen `ListingDraft` field names (`service_offer`, `price_amount`, `price_unit`, etc.) at the backend/service boundary.
- Keep HTTP mapping out of `qwen_service.py`; routers in 04-03/04-04/04-05 will catch `ListingExtractionError` and return the required `502 {message: "Listing extraction failed"}` envelope.
- Use a minimal cast around the OpenAI completion call because DashScope-compatible model names and dict response formats are runtime-valid but narrower than the OpenAI package type stubs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan-level ruff/mypy verification failed after task commits**
- **Found during:** Plan-level verification after Task 04-02-04
- **Issue:** `ruff` flagged formatting in `voice.py`/`qwen_service.py`; `mypy` rejected the OpenAI-compatible completion call because the OpenAI type stubs are stricter than DashScope compatible-mode usage.
- **Fix:** Ran the targeted ruff import fix, wrapped the completion method with `cast(Any, ...)`, and switched from the temporary `getattr` fallback to the typed `settings.dashscope_chat_model` added in Task 04-02-03.
- **Files modified:** `backend/app/schemas/voice.py`, `backend/app/services/qwen_service.py`
- **Verification:** Re-ran tests, ruff, and mypy successfully.
- **Committed in:** `bdcf091`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Verification-only cleanup. No behavior or scope change beyond making the planned implementation pass the required gates.

## Issues Encountered

- The canonical executor agent file referenced by `execute-plan.md` was not present under `$HOME/.cursor/get-shit-done/agents/`; execution followed the loaded workflow plus `git-integration.md` commit protocol.
- GSD SDK state/roadmap mutation was not used because the previous plan documented parser/shape incompatibilities for this repository's current markdown. Tracking artifacts were updated manually without changing unrelated planning files.
- `VOICE-06` and `VOICE-07` were already marked complete in `.planning/REQUIREMENTS.md` by 04-01 tracking, so requirements were left unchanged to avoid unnecessary churn.

## User Setup Required

None - no external service configuration required beyond the already documented DashScope environment variables.

## Verification

- `uv run python -c "from app.schemas.voice import ListingDraft"` - PASS
- `uv run python -c 'from app.services.qwen_service import ListingExtractionError, extract_listing, strip_json_fences; ...'` - PASS
- `uv run pytest tests/test_voice_qwen.py -q` - PASS, `4 passed`
- `uv run pytest tests/test_voice_qwen.py tests/test_voice_contract.py -q` - PASS, `5 passed, 2 skipped`
- `uv run ruff check app/schemas/voice.py app/services/qwen_service.py` - PASS
- `uv run mypy app/services/qwen_service.py app/schemas/voice.py` - PASS
- `git diff --name-only HEAD -- frontend` - PASS, no frontend changes

## Next Phase Readiness

Ready for `04-03-PLAN.md` (Transcribe streaming integration, WebSocket handler, and voice service). The route contract skips from 04-01 remain expected until 04-03/04-04 register the real voice routes.

## Self-Check: PASSED

---
*Phase: 04-voice-to-profile-pipeline*
*Completed: 2026-04-25*
