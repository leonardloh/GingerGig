---
status: resolved
trigger: "i run npm run preview, but i couldn't login using the demo account"
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: npm-run-preview-login-demo

## Symptoms

- expected_behavior: "User can select demo account to bypass login"
- actual_behavior: "\"Email or password is incorrect. Use one of the demo accounts below.\""
- error_messages: "not sure"
- timeline: "yes. when testing before backend integration it works"
- reproduction: "After i change the .env.production true to false value then it happens"

## Current Focus

- hypothesis: "Demo-account cards are hitting real auth after VITE_USE_MOCK_API=false because runtime demo mode is not enabled before api.auth.login."
- test: "Run production build and preview smoke test for all three demo cards."
- expecting: "Each demo card reaches the signed-in app shell with no login error."
- next_action: "complete"
- reasoning_checkpoint: "api.ts already exposes setDemoMode() for quick-login cards, but PrototypeApp.jsx only imported api. Mock getMe also always returned Siti, so non-Siti demo cards needed current-account tracking."
- tdd_checkpoint: "frontend build and Playwright preview smoke passed"

## Evidence

- timestamp: 2026-04-26T05:17:00+08:00
  observation: "frontend/.env.production has VITE_USE_MOCK_API=false, so preview uses real endpoints unless runtime demo mode is set."
- timestamp: 2026-04-26T05:17:00+08:00
  observation: "frontend/src/services/api/api.ts exposes setDemoMode() and documents that demo-account quick-login cards should call it."
- timestamp: 2026-04-26T05:17:00+08:00
  observation: "frontend/src/prototype/PrototypeApp.jsx quick-login called doLogin() without setDemoMode(), so api.auth.login resolved to the real backend."
- timestamp: 2026-04-26T05:21:00+08:00
  observation: "frontend/src/services/api/mock/auth.mock.ts getMe() always returned DEMO_ACCOUNTS[0], which would make Amir/Faiz cards sign in as Siti after enabling runtime demo mode."

## Eliminated

- hypothesis: "The production bundle fails to compile."
  reason: "npm run build passed."
- hypothesis: "The quick-login cards themselves are missing credentials."
  reason: "Cards still pass the correct demo email/password to doLogin()."

## Resolution

- root_cause: "Preview was switched to real API mode, but demo quick-login did not enable the existing runtime demo-mode override before calling api.auth.login. The mock auth profile lookup also did not track which demo account logged in."
- fix: "Import and call setDemoMode(true) for demo-card login, reset it on sign-out/failure, and track the current mock account in auth.mock.ts so getMe() returns the selected demo profile."
- verification: "npm run build; Playwright smoke via npm run preview on port 4173 passed for Makcik Siti, Amir Razak, and Faiz Hassan."
- files_changed: "frontend/src/prototype/PrototypeApp.jsx; frontend/src/services/api/mock/auth.mock.ts"
