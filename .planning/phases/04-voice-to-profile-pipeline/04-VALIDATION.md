---
phase: 04
slug: voice-to-profile-pipeline
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-26
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest with pytest-asyncio and httpx ASGITransport |
| **Config file** | `backend/pyproject.toml` |
| **Quick run command** | `uv run pytest tests/test_voice_qwen.py tests/test_voice_contract.py -q` |
| **Full suite command** | `uv run pytest tests/test_voice_qwen.py tests/test_voice_streaming.py tests/test_voice_batch.py tests/test_voice_contract.py -q` |
| **Estimated runtime** | ~30-60 seconds with mocked AWS/Qwen |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest tests/test_voice_qwen.py tests/test_voice_contract.py -q`
- **After every plan wave:** Run `uv run pytest tests/test_voice_qwen.py tests/test_voice_streaming.py tests/test_voice_batch.py tests/test_voice_contract.py -q`
- **Before `/gsd-verify-work`:** Full voice suite plus `uv run ruff check .` and `uv run mypy app` must be green
- **Max feedback latency:** 90 seconds for mocked tests

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | VOICE-06, VOICE-07 | T-04-01 | Qwen output is validated before persistence or response | unit | `uv run pytest tests/test_voice_qwen.py -q` | no | passed |
| 04-02-01 | 02 | 1 | VOICE-01, VOICE-02, VOICE-03 | T-04-02 | WS requires JWT, elder user, streaming language, and closes upstream Transcribe | unit/contract | `uv run pytest tests/test_voice_streaming.py tests/test_voice_contract.py -q` | no | passed |
| 04-03-01 | 03 | 1 | VOICE-04, VOICE-05 | T-04-03 | Batch job ownership is enforced and background work opens its own DB session | unit/contract | `uv run pytest tests/test_voice_batch.py tests/test_voice_contract.py -q` | no | passed |
| 04-04-01 | 04 | 2 | VOICE-07 | T-04-04 | Terminal Qwen extraction failure on batch status returns HTTP 502 with `Listing extraction failed` | unit/contract | `uv run pytest tests/test_voice_batch.py tests/test_voice_contract.py -q` | no | passed |
| 04-05-01 | 05 | 3 | VOICE-01 through VOICE-07 | T-04-05 | Integration guardrails prevent forbidden SDK use and wrong AWS region | static/unit | `uv run pytest tests/test_voice_contract.py -q` | no | passed |

---

## Wave 0 Requirements

- [x] `backend/tests/test_voice_qwen.py` - fixtures for fence stripping, validation retry, price coercion, and persistent extraction failure.
- [x] `backend/tests/test_voice_contract.py` - static/contract guardrails for route paths, SDK split, region pinning, and batch immediate-response shape.
- [x] `backend/tests/test_voice_streaming.py` - mocked Transcribe Streaming lifecycle, partial throttling, auth/language rejection, disconnect cleanup.
- [x] `backend/tests/test_voice_batch.py` - mocked S3/Transcribe Batch/Qwen background status transitions and job ownership.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser tab close tears down upstream Transcribe stream within 5 seconds | VOICE-03 | Requires live AWS Transcribe Streaming and CloudWatch/log observation | Open streaming session with real AWS credentials, send PCM audio, close tab mid-recording, verify `input_stream.end_stream()` log and AWS stream closure within 5 seconds. |
| End-to-end latency target of 2-3 seconds for streaming | VOICE-01 | Requires real network, AWS Transcribe, and DashScope latency | Record a short en-US clip through the future frontend client and measure pause-to-final-message duration. |
| Batch 8-12 second target for ms-MY/ta-IN | VOICE-04, VOICE-05 | Requires real S3, Transcribe Batch, and DashScope | Upload a short WAV to the audio bucket, submit batch, poll status every 2 seconds, and measure ready-state latency. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 90 seconds for mocked checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed in 04-05 final validation; manual-only CloudWatch/latency checks remain N/A for CI.
