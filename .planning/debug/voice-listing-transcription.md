---
status: resolved
trigger: "when i'm trying to chat in the listing, it doesn't really transcribe my voice and insert into the listing form"
created: 2026-04-26T03:51:00+08:00
updated: 2026-04-26T04:05:00+08:00
---

# Debug Session: voice-listing-transcription

## Symptoms

- expected_behavior: "Voice input on the listing creation screen should transcribe the elder's speech and use Qwen to populate the generated listing form/card fields."
- actual_behavior: "Voice input does not reliably transcribe and does not insert generated content into the listing form."
- error_messages: "Unknown; not yet checked."
- timeline: "Unknown; user reported during current listing chat flow."
- reproduction: "Open the elder listing voice/chat flow, speak naturally, expect the AI-generated listing card/form to update."

## Current Focus

- hypothesis: "SpeechRecognition and typed fallback paths animate into the generated card without sending transcript text to Qwen."
- test: "Trace ElderVoice state transitions and add a backend text-to-listing endpoint using the existing Qwen extractor."
- expecting: "Browser-transcribed or typed text should produce a ListingDraft and populate the generated listing card."
- next_action: "done"
- reasoning_checkpoint: ""
- tdd_checkpoint: ""

## Evidence

- timestamp: 2026-04-26T03:58:00+08:00
  observation: "ElderVoice WebSocket and batch paths can receive ListingDraft responses, but SpeechRecognition fallback and typed input only called runProcessing(), which generated the static fallback card."
- timestamp: 2026-04-26T04:02:00+08:00
  observation: "Added POST /api/v1/voice-to-profile/text to call extract_listing() with an authenticated elder transcript."
- timestamp: 2026-04-26T04:04:00+08:00
  observation: "Frontend build passed; backend non-DB voice contract and Qwen tests passed. DB-backed batch tests could not run without TEST_DATABASE_URL or DATABASE_URL."
- timestamp: 2026-04-26T04:12:00+08:00
  observation: "User reproduced with 'I can do coding' and still saw the static nasi lemak card. Root cause was fallback rendering whenever draft was null after empty transcript/API failure."

## Eliminated

- hypothesis: "Qwen extractor itself is missing."
  reason: "Existing qwen_service.extract_listing() and voice stream/batch routes already use it."

## Resolution

- root_cause: "Fallback voice transcription and typed listing generation never called Qwen; after the first fix, empty transcripts or API failures still set draft=null and rendered the static demo listing."
- fix: "Added an authenticated text transcript endpoint backed by Qwen, wired ElderVoice SpeechRecognition/typed fallbacks to request a real ListingDraft, stopped draft=null from rendering the canned card, and made category/halal badges data-driven."
- verification: "npm run build; uv run pytest tests/test_voice_contract.py tests/test_voice_qwen.py; uv run ruff check changed backend files. Full DB-backed voice batch tests blocked by missing TEST_DATABASE_URL/DATABASE_URL."
- files_changed: "backend/app/routers/voice.py, backend/app/schemas/voice.py, backend/tests/test_voice_batch.py, backend/tests/test_voice_contract.py, frontend/src/prototype/elder-screens.jsx, frontend/src/services/api/endpoints/voice.ts, frontend/src/services/api/types.ts"
