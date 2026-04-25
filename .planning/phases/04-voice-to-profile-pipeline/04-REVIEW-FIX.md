---
phase: 04-voice-to-profile-pipeline
status: all_fixed
findings_in_scope: 5
fixed: 5
skipped: 0
iteration: 1
completed_at: 2026-04-25T17:58:26Z
---

# Phase 04 Review Fixes

## Findings

- CR-001: Fixed in `8a938aed1542bbca563fef758a0fe5e6dbe78416`.
  - Qwen client/transport failures now convert to `ListingExtractionError`.
  - Streaming extractor crashes are caught at the WebSocket boundary, logged server-side, marked `failed`, sent as `Listing extraction failed`, and closed with the error close code.
  - Added streaming and Qwen transport regression coverage.

- WR-001: Fixed in `af43da0223aee400cbc86c5aa3ab10c69e5cb23b`.
  - Unexpected batch/AWS/DB/SDK failures now persist `Voice batch processing failed` instead of raw exception text.
  - Full exception details are logged server-side with job/session context.
  - Added batch status sanitization coverage.

- WR-002: Fixed in `af43da0223aee400cbc86c5aa3ab10c69e5cb23b`.
  - Batch submit now rejects uploaded keys outside the same `wav`, `mp3`, `flac` extension policy used by `/audio-upload-url`.
  - Added coverage proving elder-scoped `.mp4` submit keys are rejected before job scheduling.

- WR-003: Fixed in `8a938aed1542bbca563fef758a0fe5e6dbe78416`.
  - Qwen listing drafts now enforce the trusted request language by overriding mismatched model output after schema validation.
  - Added coverage for mismatched model language output.

- WR-004: Fixed in `8a938aed1542bbca563fef758a0fe5e6dbe78416` and `af43da0223aee400cbc86c5aa3ab10c69e5cb23b`.
  - Added focused regression tests for Qwen transport errors, streaming extractor crashes, raw batch exception sanitization, submit policy mismatch, and Qwen language mismatch.

## Additional Regression

- Migration head regression: Fixed in `bc58e483b42b48fc35fa49441ba495f0b6767761`.
  - Updated `backend/tests/test_migrations.py` to expect Alembic head `0003_voice_batch_correlation`.
  - Added verification for Phase 4 `voice_sessions.audio_s3_key` and `voice_sessions.transcribe_job_name` columns.

## Verification

- `uv run pytest -q`: 79 passed, 2 existing warnings.
- `uv run pytest tests/test_voice_qwen.py tests/test_voice_streaming.py tests/test_voice_batch.py tests/test_voice_contract.py -q`: 26 passed.
- `uv run ruff check .`: all checks passed.
- `uv run mypy app`: success, no issues found in 47 source files.
