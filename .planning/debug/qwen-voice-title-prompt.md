---
status: resolved
trigger: "I would like to revise the prompt for qwen. After the voice transcription, It literrally fill up the service with the prompt. For example, when some one say \"I can cook fried rice for 10 people\". It literally put \"I can cook fried rice for 10 people\" as the title, in fact I want to prompt it to recognize the main service / skill offered, for instance here would be Fried Rice."
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: qwen-voice-title-prompt

## Symptoms

- expected_behavior: Voice listing generation should distill the transcript into the main service or skill offered, e.g. `Fried Rice`.
- actual_behavior: Qwen returns the full spoken sentence as the service/title, e.g. `I can cook fried rice for 10 people`.
- error_messages: No runtime error; this is incorrect extraction quality.
- timeline: Observed after voice transcription feeds into Qwen listing generation.
- reproduction: Use the voice-to-profile flow and say `I can cook fried rice for 10 people`.

## Current Focus

- hypothesis: The Qwen extraction prompt does not explicitly forbid copying the transcript into the service title, so the model treats the full utterance as the offer.
- test: Inspect `qwen_service` prompt, schema, and tests for `service_offer` extraction.
- expecting: The extraction prompt can be tightened so `service_offer` is a concise noun phrase naming the service, while capacity and details move to other fields.
- next_action: done
- reasoning_checkpoint: Confirmed prompt underspecified `service_offer`; `/text` fallback also echoed the full transcript on extraction failure.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-26
  observation: `backend/app/services/qwen_service.py` asked for `service_offer` but did not define it as a concise title or warn against copying the transcript.
- timestamp: 2026-04-26
  observation: The prompt told Qwen to preserve free-text fields, which could encourage quoting the speaker's sentence.
- timestamp: 2026-04-26
  observation: `backend/app/routers/voice.py` fallback used `service_offer=text`, deterministically echoing the transcript if Qwen extraction failed.

## Eliminated

- hypothesis: Frontend title rendering is the source of the full-sentence title.
  reason: Backend `ListingDraft.service_offer` is the field returned by voice extraction and already allowed/produced the full transcript.

## Resolution

- root_cause: `service_offer` was underspecified in the Qwen prompt, and the `/text` fallback echoed the full transcript when Qwen extraction failed.
- fix: Tightened Qwen field rules so `service_offer` is a concise noun-phrase display title, added a fried-rice/capacity example, and made fallback extraction strip common first-person/detail phrasing.
- verification: `uv run pytest tests/test_voice_qwen.py` passed; `uv run ruff check app/services/qwen_service.py app/routers/voice.py tests/test_voice_qwen.py` passed. `uv run pytest tests/test_voice_qwen.py tests/test_voice_batch.py` could not run the DB-backed batch tests because `TEST_DATABASE_URL`/`DATABASE_URL` is unset.
- files_changed: `backend/app/services/qwen_service.py`, `backend/app/routers/voice.py`, `backend/tests/test_voice_qwen.py`
