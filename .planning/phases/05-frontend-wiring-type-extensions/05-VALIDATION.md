---
phase: 05
slug: frontend-wiring-type-extensions
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-26
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript project references, ESLint, Vite build, manual browser smoke |
| **Config file** | `frontend/package.json`, `frontend/tsconfig.json`, `frontend/eslint.config.js` |
| **Quick run command** | `npm run typecheck` |
| **Full suite command** | `npm run typecheck && npm run lint && npm run build` |
| **Estimated runtime** | ~30-90 seconds locally |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck` from `frontend/`.
- **After every plan wave:** Run `npm run typecheck && npm run lint && npm run build` from `frontend/`.
- **Before `/gsd-verify-work`:** Full frontend suite plus mock-import guard and manual no-visual-change smoke must pass.
- **Max feedback latency:** 120 seconds for frontend static checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | FE-01, FE-02, FE-03, FE-09 | T-05-01 | API helpers keep `/api/v1` prefix centralized and do not expose tokens in HTTP logs | static/type | `npm run typecheck` | no | pending |
| 05-02-01 | 02 | 1 | FE-04, FE-06 | T-05-02 | Login/register use real auth endpoints and store bearer tokens only through the existing API client | static/build | `npm run typecheck && npm run build` | no | pending |
| 05-03-01 | 03 | 2 | FE-05 | T-05-03 | Elder owner routes are called only with the authenticated elder user id | static/manual | `npm run typecheck && npm run build` | no | pending |
| 05-04-01 | 04 | 2 | FE-05 | T-05-04 | Requestor detail/search uses listing ids and does not double-prefix API paths | static/manual | `npm run typecheck && npm run build` | no | pending |
| 05-05-01 | 05 | 2 | FE-05 | T-05-05 | Companion screens use companion endpoints and never call elder-only endpoints with companion tokens | static/manual | `npm run typecheck && npm run build` | no | pending |
| 05-06-01 | 06 | 3 | FE-02, FE-07 | T-05-06 | Voice WebSocket sends token only in the required `?token=` handshake and retains SpeechRecognition fallback | static/manual | `npm run typecheck && npm run build` | no | pending |
| 05-07-01 | 07 | 4 | FE-08, FE-09 | T-05-07 | Environment configuration remains Vite-only and no secrets are committed | static/manual | `npm run typecheck && npm run lint && npm run build` | no | pending |

---

## Wave 0 Requirements

- [ ] `frontend/src/services/api/types.ts` includes all additive DTO fields before screen wiring starts.
- [ ] `frontend/src/services/api/endpoints/voice.ts` exists and is exported by `frontend/src/services/api/index.ts`.
- [ ] `frontend/src/services/api/endpoints/requestor.ts` exports `getListingById`.
- [ ] `frontend/src/services/api/endpoints/companion.ts` exports `getCompanionTimeline`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No UI/layout/copy/styling change | FE-04, FE-05, FE-06, FE-07 | The prototype uses inline JSX styles and visual equivalence is not fully covered by static checks | Compare login, onboarding, elder dashboard/listings/voice/profile, requestor home/search/detail/profile, and companion dashboard/alerts/profile before/after. Inspect diff for `prototype.css`, className, product copy, spacing, and style changes. |
| Quick-login end-to-end smoke | FE-06 | Requires backend server, seeded database, and browser session | Run backend and frontend, click Siti/Amir/Faiz chips, verify each persona shell loads from API without console CORS or unhandled promise errors. |
| ElderVoice streaming and batch | FE-07 | Requires Phase 4 backend voice routes, microphone permissions, and real or mocked cloud credentials | en/zh should use WebSocket streaming and final `ListingDraft`; ms/ta should upload, submit batch, poll status, and preserve SpeechRecognition fallback when AudioWorklet is unavailable. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual smoke steps.
- [ ] Sampling continuity: no 3 consecutive implementation tasks without `npm run typecheck`.
- [ ] Wave 0 creates the typed contract before screen edits.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 120 seconds for static checks.
- [ ] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
