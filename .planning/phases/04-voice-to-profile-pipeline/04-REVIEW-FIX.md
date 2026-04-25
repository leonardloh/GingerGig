---
phase: 04-voice-to-profile-pipeline
status: all_fixed
findings_in_scope: 8
fixed: 8
skipped: 0
iteration: 2
completed_at: 2026-04-25T18:04:59Z
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

## Iteration 2

- WR-001: Fixed in `4df823eb07370c557947bf1725f0a57f53ee3524`.
  - Streaming infrastructure failures after `VoiceSession` creation now log server-side, mark the persisted session `failed` with `Voice streaming failed`, send safe WebSocket error JSON, and close with `STREAMING_CLOSE_ERROR`.
  - Added regression coverage for a failing streaming session factory.

- WR-002: Fixed in `ed6de673378c9f01b7f357af7013cdef419c8fc8`.
  - Qwen extraction now uses one guarded retry loop so retry-time transport/client exceptions, empty-content errors, and exhausted validation all convert to `ListingExtractionError("Listing extraction failed")`.
  - Added regression coverage for validation failure followed by retry transport failure.

- WR-003: Fixed in `ce19d3c0ec96b3779e4ce81dac63e4b2650d95c6`.
  - Batch submit now validates S3 object metadata with `HeadObject` before DB/job scheduling and rejects missing or unsupported content types safely.
  - Added regression coverage for allowed-extension keys with unsupported and missing S3 `ContentType`.

## Iteration 2 Verification

- `uv run pytest -q`: 83 passed, 2 existing warnings.
- `uv run pytest tests/test_voice_qwen.py tests/test_voice_streaming.py tests/test_voice_batch.py tests/test_voice_contract.py -q`: 30 passed.
- `uv run ruff check .`: all checks passed.
- `uv run mypy app`: success, no issues found in 47 source files.
