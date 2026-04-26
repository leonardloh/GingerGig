---
status: resolved
trigger: "we just deploy the solution to cloudfront (front end) and ecs (backend). After I record the voice, we got the error \"Listing generation failed\" and I got this from the console \"47.250.13.227.sslip.io/api/v1/voice-to-profile/text:1 Failed to load resource: the server responded with a status of 401 ()\""
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: listing-generation-failed

## Symptoms

- expected_behavior: Recording voice should generate the profile/listing content successfully in the deployed app.
- actual_behavior: The UI shows "Listing generation failed" after recording voice.
- error_messages: Browser console reports `47.250.13.227.sslip.io/api/v1/voice-to-profile/text:1 Failed to load resource: the server responded with a status of 401 ()`.
- timeline: Started after deploying frontend to CloudFront and backend to ECS.
- reproduction: Use the deployed frontend, record voice, then submit/generated listing flow calls `/api/v1/voice-to-profile/text`.

## Current Focus

- hypothesis: Demo quick-login enables mock auth while voice endpoints always call the real backend, so `/voice-to-profile/text` is sent without a real JWT in deployed real-backend mode.
- test: Trace frontend API selection, auth token storage, and backend `/text` auth dependency.
- expecting: Demo mode is ignored when `VITE_USE_MOCK_API=false`; quick-login uses real auth and `apiRequest()` attaches `Authorization: Bearer <jwt>`.
- next_action: redeploy frontend bundle to CloudFront
- reasoning_checkpoint: Confirmed by code inspection and isolated debug pass.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-26
  observation: `PrototypeApp.jsx` calls `setDemoMode(true)` for demo quick-login before `api.auth.login()`.
- timestamp: 2026-04-26
  observation: `api.ts` previously returned mock APIs when demo mode was set, regardless of `VITE_USE_MOCK_API=false`.
- timestamp: 2026-04-26
  observation: `api.voice` always uses the real voice endpoints, and `http.ts` only attaches `Authorization` when real auth has called `setApiAccessToken()`.
- timestamp: 2026-04-26
  observation: Backend `/voice-to-profile/text` requires `get_current_user` and elder role, so missing or mock bearer credentials correctly return 401.

## Eliminated

- hypothesis: CORS/preflight failure.
  reason: Browser reports a concrete 401 from the API endpoint, not a CORS-blocked request.
- hypothesis: Wrong persona.
  reason: Wrong role would pass authentication and fail authorization with 403, not 401.

## Resolution

- root_cause: Demo quick-login used mock auth in a real-backend deployment, leaving the HTTP client without a valid backend JWT while voice generation called ECS.
- fix: Gate runtime demo mode behind `VITE_USE_MOCK_API`; real-backend deployments now clear/ignore demo mode and use real auth.
- verification: `npm run typecheck` passed; `npm run build` passed.
- files_changed: `frontend/src/services/api/api.ts`
