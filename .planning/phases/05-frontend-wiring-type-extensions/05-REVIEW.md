---
phase: 05
status: issues_found
files_reviewed: 12
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
---

# Phase 05 Code Review

## Summary

Reviewed the Phase 05 frontend API contract, auth/session wiring, requestor/companion/elder screen adapters, voice transport, and environment/gitignore changes at standard depth.

The normal HTTP paths are correctly routed through `apiRequest()` with the `/api/v1` prefix owned by `http.ts`; the only direct `fetch()` in reviewed Phase 05 code is the presigned S3 audio PUT. Token handling remains in memory, there is no token persistence or token logging in reviewed files, companion screens call companion-safe routes, and the WebSocket helper uses the backend-required token query parameter.

One warning-level lifecycle issue was found in the ElderVoice streaming path.

## Findings

### WR-001

**Severity:** Warning  
**File:** `frontend/src/prototype/elder-screens.jsx`  
**Area:** ElderVoice WebSocket/media cleanup

`ElderVoice` does not consistently tear down WebSocket and media resources on streaming error or early stop. `startStreamingCapture()` installs a WebSocket `error` handler that calls `runProcessing("voice")` but does not stop the active `MediaStream`, close the `AudioContext`, clear the recording interval, or close/null the socket. Separately, `stopRecord()` only sends the `{ "type": "end" }` frame when the socket is already `OPEN`; if the user stops while the socket is still `CONNECTING`, `cleanupVoiceResources()` is called without `closeWebSocket: true`, leaving the socket to open later with no active audio/end frame and the UI in the non-auto-generating processing path.

**Why it matters:** A transient WebSocket failure can leave the microphone active while the UI has moved on, and a quick tap-stop before the WebSocket opens can strand the user in processing with an orphaned socket/server session.

**Suggested fix:** Centralize stream failure/stop cleanup so error paths clear `tickRef`, stop `SpeechRecognition`, stop media tracks, close the `AudioContext`, close/null the WebSocket when no final response is expected, and either fall back to SpeechRecognition/generated fallback or surface a recoverable error state. For the early-stop case, close a `CONNECTING` socket or queue the end signal until `open`.

## Residual Risk

Manual browser smoke with real microphone permissions, live WebSocket streaming, and presigned S3 batch upload was not performed as part of this review. Static review and phase summaries indicate prior typecheck/build/backend contract/browser smoke passed, but the exact mic/WebSocket/cloud failure paths in WR-001 still need hands-on verification after the fix.
