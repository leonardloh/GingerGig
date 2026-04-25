---
phase: 04-voice-to-profile-pipeline
status: issues_found
files_reviewed: 17
findings:
  critical: 1
  warning: 4
  info: 0
  total: 5
reviewed_at: 2026-04-25T17:53:25Z
---

# Phase 04 Code Review

### CR-001: Streaming Qwen transport failures bypass safe handling and leave sessions stuck
- Severity: critical
- File: `backend/app/services/voice_service.py`
- Issue: `run_streaming_session` only catches `ListingExtractionError` around `listing_extractor(...)`. Real DashScope/OpenAI-compatible failures such as timeouts, rate limits, authentication failures, and network errors will propagate out of the WebSocket handler after the session has already been marked `extracting`.
- Impact: The client can see an abrupt WebSocket close instead of the safe `{type: "error", message: "Listing extraction failed"}` payload, and `voice_sessions.status` can remain permanently `extracting`. This also bypasses the intended safe error surface.
- Recommendation: Convert Qwen transport/client errors to `ListingExtractionError` in `qwen_service.py`, or catch broad extractor exceptions in `voice_service.py`, log the original exception server-side, mark the session `failed`, send the shared safe message, and close with `STREAMING_CLOSE_ERROR`.

### WR-001: Batch failures can leak raw infrastructure errors through the status endpoint
- Severity: warning
- File: `backend/app/routers/voice.py`
- Issue: `_safe_batch_error` returns `str(exc)` for non-timeout failures, and `get_voice_batch_status` returns that value as `message` for failed jobs.
- Impact: AWS, S3, Transcribe, database, or SDK exception messages can expose bucket names, object keys, account/region details, SQL fragments, or other implementation details to any authenticated elder who can trigger a failed batch job.
- Recommendation: Persist and return a generic public message such as `Voice batch processing failed` for unexpected exceptions, while logging the full exception with job/session metadata for operators.

### WR-002: Batch content-type restrictions are bypassable at submit time
- Severity: warning
- File: `backend/app/routers/voice.py`
- Issue: `/audio-upload-url` only presigns `wav`, `mp3`, and `flac`, but `/batch` accepts any elder-scoped key whose extension passes `_media_format_from_key`, including `mp4`, `ogg`, and `amr`. The submit route also does not verify that the key came from a prior presign response or that the S3 object content type matches the allowed set.
- Impact: A caller can bypass the upload route's content-type policy and start paid Transcribe jobs against arbitrary objects under their elder prefix. This increases cost and failure risk, and weakens the intended browser-direct upload contract.
- Recommendation: Reuse the same allowed extension/content-type policy at submit time. Preferably HEAD the object before starting Transcribe to validate ownership prefix, expected content type, and object existence; for stronger control, persist issued upload keys and only accept those.

### WR-003: Qwen result language is not validated against the requested language
- Severity: warning
- File: `backend/app/services/qwen_service.py`
- Issue: `ListingDraft` accepts all four voice language codes, but `extract_listing(transcript, language)` does not verify that the validated draft's `language` equals the requested input language.
- Impact: A model response can return a structurally valid listing with the wrong language metadata, which can confuse Phase 5 frontend routing/rendering and make batch/streaming results inconsistent across locales.
- Recommendation: After validation, enforce `listing.language == language` or override the field from the trusted request parameter before returning. Add a retry or failure test for mismatched language output.

### WR-004: Mocked tests miss the most likely production failure modes
- Severity: warning
- File: `backend/tests/test_voice_batch.py`
- Issue: The current suite covers happy paths, IDOR, cleanup, and Pydantic validation failure, but it does not exercise Qwen transport errors, AWS `ClientError`/credential failures, delayed streaming final transcripts, S3 object metadata mismatches, or raw exception sanitization.
- Impact: The critical and warning failure paths above can pass the existing Phase 04 test suite because the external services are mocked only at successful or validation-failure boundaries.
- Recommendation: Add focused tests that simulate `extract_listing` raising a non-`ListingExtractionError`, Transcribe/S3 client failures with sensitive-looking messages, and submit keys whose extensions/content types disagree with the presign contract.
