# Codebase Concerns

**Analysis Date:** 2026-04-25

> Severity legend used throughout this document:
> - **BLOCKING** — Prevents the system from functioning end-to-end. Must fix before next milestone.
> - **HIGH** — Significant risk to security, correctness, or velocity. Fix soon.
> - **MEDIUM** — Real concern that will compound if ignored, but not urgent.
> - **LOW / NICE-TO-FIX** — Polish, hygiene, follow-up.

---

## Tech Debt

### **BLOCKING — Backend has been deleted from the working tree**
- Issue: `backend/` directory is now empty. Git status shows the entire scaffold staged for deletion: `backend/.env.example`, `backend/db.py`, `backend/main.py`, `backend/models.py`, `backend/pyproject.toml`, `backend/uv.lock`, `backend/routes/.placeholder`, `backend/services/.placeholder`. The previous scaffold (commit `3de5f53`) had a minimal FastAPI app with `/health` endpoint, async SQLAlchemy session, and stub routers.
- Files: `backend/` (empty), git ref `HEAD:backend/main.py`, `HEAD:backend/db.py`
- Impact: The frontend has nothing to talk to. Every typed endpoint in `frontend/src/services/api/endpoints/*.ts` will hard-fail (network error / connection refused) the moment the prototype is wired up. `README.md` lines 96-105 still document a backend that does not exist on disk.
- Fix approach: Either (a) restore the deletion if it was unintentional (`git restore backend/`), or (b) commit the deletion deliberately and start a new backend implementation aligned with `MULTI-CLOUD-ARCHITECTURE.md` (FastAPI on Alibaba ECS, ApsaraDB Postgres, AWS S3/Textract/Rekognition for KYC).

### **BLOCKING — `MULTI-CLOUD-ARCHITECTURE.md` is untracked at the repo root**
- Issue: `/Users/user/repos/gingergig/MULTI-CLOUD-ARCHITECTURE.md` is the single source of truth for the AWS + Alibaba split, but `git status` reports `?? MULTI-CLOUD-ARCHITECTURE.md` — never committed.
- Files: `MULTI-CLOUD-ARCHITECTURE.md` (root, untracked), `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` (older committed copy)
- Impact: The two copies have already diverged. The committed `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` includes an entire eKYC AWS subgraph (S3 KYC bucket, Lambda orchestrator, Textract, Rekognition) that is missing from the newer untracked root copy. New contributors will read whichever they find first and build to a different design.
- Fix approach: Decide which version is authoritative, delete the other, and commit. Recommend keeping a single root-level `MULTI-CLOUD-ARCHITECTURE.md` and deleting `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md`.

### **HIGH — Prototype screens are not wired to the typed API client**
- Issue: `frontend/src/services/api/` contains a fully typed and tested-shaped HTTP client + endpoints, but no prototype screen imports from it. `grep "import.*from.*services/api"` returns zero hits across `src/prototype/`. The OnboardingFlow even has the real imports written but commented out (`OnboardingFlow.jsx:23-24`).
- Files: `frontend/src/services/api/index.ts`, `frontend/src/prototype/OnboardingFlow.jsx:22-26`, `frontend/src/prototype/PrototypeApp.jsx:71-97`
- Impact: The "fully typed API client ready to connect" claim in `README.md:12` is aspirational — the screens are running 100% on inline mock data and `MOCK_DELAY` (`OnboardingFlow.jsx:26`). Migrating one screen at a time is fine, but the gap is currently 100%.
- Fix approach: Follow `frontend/docs/API_READY_MIGRATION.md`. Start with `auth.login` in `PrototypeApp.jsx` (the demo-account check at `PrototypeApp.jsx:119-126`) since auth must be live for any other endpoint to work.

### **HIGH — Prototype `.jsx` files are excluded from TypeScript and ESLint**
- Issue: `eslint.config.js:18` ignores `**/*.jsx`, and `tsconfig.app.json:7` uses `"jsx": "react-jsx"` but the prototype is plain JSX with `// @ts-nocheck`-equivalent freedom. `jsx-modules.d.ts` declares all `.jsx` modules as `ComponentType` with no props, defeating type-checking on import boundaries.
- Files: `frontend/eslint.config.js:18`, `frontend/src/jsx-modules.d.ts:1-5`, all of `frontend/src/prototype/*.jsx` (~10,000 lines)
- Impact: ~95% of frontend source code (10,368 total lines, 9,683 in prototype `.jsx`) gets zero static analysis. Refactoring is dangerous — typos and prop mismatches won't surface until runtime.
- Fix approach: Plan a phased rename `.jsx → .tsx` as the prototype is migrated to live API calls. At minimum, run ESLint on `.jsx` with `@typescript-eslint/parser` even before full TS conversion.

### **MEDIUM — Prototype "RequestorBookings" is a placeholder screen**
- Issue: `PrototypeApp.jsx:11-69` defines `RequestorBookings` as a hardcoded "COMING SOON" screen, despite typed `getRequestorBookings()` already existing in `frontend/src/services/api/endpoints/requestor.ts:71`.
- Files: `frontend/src/prototype/PrototypeApp.jsx:11-69`, `frontend/src/services/api/endpoints/requestor.ts:71`
- Impact: One of three core requestor flows (search, book, view bookings) is a static stub.
- Fix approach: Build the booking list view using the existing `Booking` type and `getRequestorBookings()` once auth is wired.

### **MEDIUM — Type drift between API DTOs and prototype UI fields**
- Issue: `frontend/docs/API_READY_MIGRATION.md:449-460` enumerates fields the prototype renders that are not in `frontend/src/services/api/types.ts` — `Listing` is missing `category`, `priceUnit`, `priceMax`, `rating`, `reviewCount`, `halal`, multilingual title fields, `days[]`, `menu[]`, `matchScore`, `matchReason`, `distance`. Same for `Booking` (`requestorInitials`, `qty`, `item`) and `UserProfile` (`kycStatus`, `avatarUrl`, `area`, `age`, `phone`).
- Files: `frontend/src/services/api/types.ts:89-127`
- Impact: First wiring pass will produce blank UI fields or runtime undefined errors. The backend contract documented in `API_READY_MIGRATION.md` is incomplete relative to what the screens actually need.
- Fix approach: Expand the DTOs in `types.ts` to cover prototype fields before the backend implementation begins, or split into `Listing` (canonical) and `ListingView` (UI projection).

### **LOW — `parseTimeout` accepts non-integer floats**
- Issue: `frontend/src/config/env.ts:9-12` returns `Number(raw)` directly. `VITE_API_TIMEOUT_MS=15.7` passes the `> 0` and `Number.isFinite` checks and gets handed to `setTimeout`, which silently truncates.
- Files: `frontend/src/config/env.ts:9-12`
- Impact: Negligible; non-integer timeouts are unusual and `setTimeout` truncation is well-defined.
- Fix approach: Use `Math.trunc(value)` on return or `Number.isInteger`.

---

## Known Bugs

### **HIGH — Bare-object throw in `apiRequest` defeats `instanceof Error` callers**
- Symptoms: `frontend/src/services/api/http.ts:80` and `:90-94` throw plain objects (`ApiError`) rather than `Error` subclasses. UI code that does `catch (e) { if (e instanceof Error) ... }` will skip these errors entirely; React Error Boundaries also rely on Error semantics (stack traces, `.name`).
- Files: `frontend/src/services/api/http.ts:80`, `frontend/src/services/api/http.ts:90-94`
- Trigger: Any non-2xx response or a request timeout.
- Workaround: Callers must duck-type the error (`if (e && typeof e === 'object' && 'status' in e)`).
- Fix approach: Define `class ApiError extends Error { status; detail; }` and throw class instances. Keeps the `status`/`detail`/`message` fields while restoring stack traces and `instanceof Error` compatibility.

### **MEDIUM — Access token is held only in the `http.ts` module-scope variable**
- Symptoms: `frontend/src/services/api/http.ts:6` (`let accessToken: string | null = null`) is the only place the token lives. A page refresh wipes it. The user is silently logged out and the next call returns 401, even though the token may not be expired.
- Files: `frontend/src/services/api/http.ts:6-14`
- Trigger: Any browser refresh, hard navigation, or new tab.
- Workaround: User logs in again.
- Fix approach: Persist to `sessionStorage` (lower XSS surface than `localStorage` for short-lived tokens) or use HTTP-only cookies set by the backend. Read on module init.

### **MEDIUM — `waitForVerification` polling timeout is 60 seconds, but `estimatedSeconds` is unbounded**
- Symptoms: `frontend/src/services/api/endpoints/kyc.ts:120` hardcodes `MAX_POLLS = 24` × 2.5s = 60s. AWS Textract `AnalyzeID` typical latency is 3-5s, but Rekognition CompareFaces under load can exceed 60s. The function then throws "KYC verification timed out after 60 seconds" even though the backend job is still running.
- Files: `frontend/src/services/api/endpoints/kyc.ts:118-139`
- Trigger: Slow AWS pipeline or backend backpressure.
- Workaround: User retries — but `retryKyc()` invalidates the previous session, throwing away in-progress work.
- Fix approach: Honor the `estimatedSeconds` returned by `startVerification` and cap polling at `estimatedSeconds * 3`. Distinguish "still pending" from "frontend gave up" so users aren't sent back to step 1.

---

## Security Considerations

### **BLOCKING — Backend `.env.example` (now deleted) shipped with empty AWS + DB credentials slots**
- Risk: The deleted `backend/.env.example` (visible at `git show HEAD:backend/.env.example`) listed `DASHSCOPE_API_KEY=`, `OSS_ENDPOINT=`, `OSS_BUCKET=`, `AWS_ACCESS_KEY_ID=`, `AWS_SECRET_ACCESS_KEY=`, `AWS_REGION=`, `DATABASE_URL=`. The values are all empty strings, which is correct for an example file, but there is no template, no `# replace with...` guidance, and no warning that the AWS credentials must be IAM-scoped (Textract + Rekognition only, never `*`).
- Files: `git show HEAD:backend/.env.example` (deleted)
- Current mitigation: `.gitignore:9` ignores `.env`. Nothing leaks in the current tree.
- Recommendations: When reinstating the backend, ship a `.env.example` with explicit placeholder values like `AWS_ACCESS_KEY_ID=AKIA_REPLACE_ME` and a comment block documenting the minimum IAM policy (`textract:AnalyzeID`, `rekognition:CompareFaces`, `s3:PutObject` on the KYC bucket only).

### **HIGH — `.gitignore` is too permissive; `.env*` patterns are not all covered**
- Risk: `.gitignore:9` ignores only `.env`. It does NOT ignore `.env.local`, `.env.development`, `.env.production`, `.env.*.local`, which Vite and many Node tools use by convention. A developer running `cp .env.example .env.local` per `README.md:81` produces a file that IS gitignored only by accident (because `.env.local` is in Vite's gitignore template, not this repo's).
- Files: `/Users/user/repos/gingergig/.gitignore`
- Current mitigation: None at the repo level — relies on Vite's default ignore.
- Recommendations: Replace line 9 with `.env*` and add an explicit allow for `.env.example`: `!.env.example`. Same for any future `.env.*.example`.

### **HIGH — `apiRequest` blindly trusts `errorBody.detail` shape**
- Risk: `frontend/src/services/api/http.ts:25-38` parses the error body as JSON and stores it in `ApiError.detail` as `unknown`. UI code may render it directly. If the backend ever leaks a stack trace (FastAPI in `debug=True`) or DB error containing PII, that string lands in the DOM.
- Files: `frontend/src/services/api/http.ts:25-38`, `frontend/src/services/api/types.ts:69-73`
- Current mitigation: `detail` is typed `unknown`, forcing callers to narrow before use.
- Recommendations: Backend must guarantee `debug=False` in production and a structured error contract. Frontend should never render `.detail` as a raw string — only render `.message`.

### **HIGH — CORS on the previous backend was wide-open (`allow_origins=["*"]`)**
- Risk: Deleted `backend/main.py` (visible at `git show HEAD:backend/main.py`) used `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`. With JWT bearer auth, `Authorization` headers are not auto-sent cross-origin so the risk is reduced, but cookie-based auth (if added later) would be exposed.
- Files: `git show HEAD:backend/main.py:6-11` (deleted)
- Current mitigation: Backend deleted; no live exposure.
- Recommendations: When re-creating the backend, restrict origins to a known list (`http://localhost:5173`, `https://app.gingergig.my`, etc.) read from env. Never `*` in production.

### **MEDIUM — Token used as Bearer; no refresh, no rotation, no expiry handling**
- Risk: `frontend/src/services/api/http.ts:69-71` attaches the token forever. There is no detection of `expiresIn`, no refresh-token endpoint defined, no automatic re-auth on 401.
- Files: `frontend/src/services/api/http.ts`, `frontend/src/services/api/endpoints/auth.ts`
- Current mitigation: None.
- Recommendations: Add `expiresIn` tracking, define `/auth/refresh`, and a global 401 interceptor in `apiRequest` that calls `setApiAccessToken(null)` and redirects to login.

### **MEDIUM — Demo account passwords in source code**
- Risk: `frontend/src/prototype/PrototypeApp.jsx:75,83,91` hard-code `password: 'demo'` for three accounts (`siti@`, `amir@`, `faiz@gingergig.my`). Once the backend is live, these accounts will exist with the trivial password `demo` if the seed data mirrors the prototype.
- Files: `frontend/src/prototype/PrototypeApp.jsx:71-97`, `README.md:88-94`
- Current mitigation: Prototype is mock-only; nothing is actually authenticated against a real backend.
- Recommendations: Before any deploy, ensure backend seed scripts generate strong random passwords for demo accounts and surface them via a one-time secret store, not the README.

### **LOW — Frontend `.env.example` is clean**
- Risk: Verified `frontend/.env.example` only contains a `VITE_API_BASE_URL` placeholder and a `VITE_API_TIMEOUT_MS` default. No keys, no secrets. Safe.
- Files: `frontend/.env.example`
- Current mitigation: Already correct.
- Recommendations: None — this is the standard to maintain.

---

## Performance Bottlenecks

### **MEDIUM — Prototype screen files are very large (single-component-per-file inflated)**
- Problem: `frontend/src/prototype/elder-screens.jsx` is **2,777 lines**, `requestor-screens.jsx` is **2,135 lines**, `companion-screens.jsx` is **1,546 lines**. Each file exports multiple top-level screens. Vite hot-reload re-evaluates the whole file on any edit; the bundle has no route-level code-splitting because everything imports from a few mega-modules.
- Files: `frontend/src/prototype/elder-screens.jsx`, `frontend/src/prototype/requestor-screens.jsx`, `frontend/src/prototype/companion-screens.jsx`, `frontend/src/prototype/OnboardingFlow.jsx` (902 lines)
- Cause: Prototype phase prioritized speed of iteration over modularity.
- Improvement path: Split each screen into its own file under `src/prototype/elder/`, `src/prototype/requestor/`, etc. Use `React.lazy()` per persona route in `PrototypeApp.jsx`.

### **LOW — KYC polling uses fixed `setTimeout` not `setInterval` aware of drift**
- Problem: `frontend/src/services/api/endpoints/kyc.ts:130-137` uses `await new Promise(setTimeout(2500))` between polls. If the network call itself takes 1.5s, the effective poll interval is 4s, not 2.5s — total wall time can exceed the 60s budget.
- Files: `frontend/src/services/api/endpoints/kyc.ts:118-139`
- Cause: Naive sleep-between-polls.
- Improvement path: Track wall-clock start time and break when `Date.now() - start > maxMs`, not after a fixed poll count.

---

## Fragile Areas

### **HIGH — `App.tsx` re-exports a `.jsx` module without typing**
- Files: `frontend/src/App.tsx:1-3`, `frontend/src/jsx-modules.d.ts:1-5`
- Why fragile: `App.tsx` does `import PrototypeApp from './prototype/PrototypeApp.jsx'` which resolves through the wildcard declaration in `jsx-modules.d.ts` typing it as `ComponentType` (no props). If `PrototypeApp.jsx` ever takes required props, TypeScript will silently accept zero-arg usage.
- Safe modification: Convert `PrototypeApp.jsx` to `.tsx` first, then remove the wildcard `.jsx` declaration to force per-module typing.
- Test coverage: None.

### **HIGH — KYC happy path is well-typed; unhappy path is not**
- Files: `frontend/src/services/api/endpoints/kyc.ts:90-114`
- Why fragile: `KycVerificationResult.failureReason` is an optional free-text string. There is no enum of failure codes (e.g. `face_mismatch`, `unreadable_ic`, `liveness_failed`). UI cannot localize or branch on the cause.
- Safe modification: Expand the type to `failureReason?: { code: KycFailureCode; message?: string }` before frontend code starts rendering it.
- Test coverage: None.

### **MEDIUM — Frontend `index.html` has no language attribute coordination**
- Files: `frontend/index.html:2`
- Why fragile: `<html lang="en">` is hardcoded but the app supports `ms`, `en`, `zh`, `ta`. Screen readers, search engines, and browser translation will misbehave for non-English users.
- Safe modification: Update `<html lang>` from inside the React app on locale change (`document.documentElement.lang = locale`) — already simple to wire from `LANG_CTX`.
- Test coverage: None.

---

## Scaling Limits

### **MEDIUM — Single FastAPI process planned for backend (per architecture doc)**
- Current capacity: Per `MULTI-CLOUD-ARCHITECTURE.md:23-24`, backend is "FastAPI on ECS — REST + WebSocket". Single-process FastAPI under uvicorn handles ~hundreds of concurrent WebSockets before event-loop pressure shows.
- Limit: WebSocket connections compete with REST traffic; voice-to-profile streaming sessions hold a connection for the duration of a recording.
- Scaling path: Deploy multiple ECS tasks behind a sticky-session ALB, OR split voice-to-profile into a dedicated WebSocket service. Decide before launch.

### **MEDIUM — `localStorage` strategy will not survive subdomain split**
- Current capacity: N/A (token is in module memory only — see "Known Bugs").
- Limit: When tokens move to `localStorage`, they are scoped to a single origin. If frontend is `app.gingergig.my` and API is `api.gingergig.my`, the token still works, but a future companion app on `companion.gingergig.my` would not share auth state.
- Scaling path: Use HTTP-only cookies on `.gingergig.my` parent domain, OR centralize auth on a dedicated subdomain (`auth.gingergig.my`).

---

## Dependencies at Risk

### **LOW — React 19 + Vite 8 are bleeding-edge majors**
- Risk: `frontend/package.json:16-17,30` pins React `^19.2.0` and Vite `^8.0.10`. Both are recent majors. Some popular libraries (testing-library, certain UI kits) lag in React 19 support.
- Impact: Adding a UI library or test runner may require workarounds.
- Migration plan: None needed if no new deps. Audit before adding any major library.

### **LOW — No state management library**
- Risk: `package.json` has no Redux, Zustand, Jotai, TanStack Query, etc. The prototype manages auth/session in `useState` on `PrototypeApp.jsx`. Once API calls land, request caching, refetch-on-focus, and optimistic updates will be needed.
- Impact: Devs will hand-roll fetch-effect-loading-error patterns in every screen.
- Migration plan: Add **TanStack Query** before wiring the second screen — the API client in `services/api/` is already shaped to fit it.

---

## Missing Critical Features

### **BLOCKING — No backend at all**
- Problem: See top of document. Empty `backend/` directory.
- Blocks: Login, KYC, voice-to-profile, listings, bookings, earnings, alerts. Everything past mock data.

### **HIGH — No voice-to-profile WebSocket client**
- Problem: `frontend/docs/API_READY_MIGRATION.md:306-336` documents a WebSocket protocol for streaming voice and a `POST /voice-to-profile/batch` endpoint, but neither is implemented in `frontend/src/services/api/`. The elder voice screen uses `window.SpeechRecognition` as a stand-in.
- Blocks: Core differentiator of the product (voice-to-listing for non-tech-savvy elders).

### **HIGH — No KYC happy-path callable from prototype OnboardingFlow**
- Problem: `OnboardingFlow.jsx:23-24` shows the real KYC imports commented out. The flow uses `MOCK_DELAY` to simulate Textract + Rekognition. Without a backend, no end-to-end test of the eKYC pipeline is possible.
- Blocks: Elder onboarding. KYC is a regulatory requirement for elder accounts (per `README.md:11`).

### **MEDIUM — No `/auth/refresh` endpoint defined anywhere**
- Problem: `RegisterResponse.expiresIn` exists (`types.ts:60-65`) but no refresh contract. Tokens will expire and the user will be silently 401'd.
- Blocks: Long sessions. Especially painful for elder users who won't understand sudden re-auth prompts.

### **MEDIUM — No logout endpoint; logout is client-only**
- Problem: `auth.ts:48-50` clears the local token but does not call the backend. If the backend ever maintains a token blocklist (e.g. for stolen-token revocation), it will not be informed.
- Blocks: Token revocation, session audit logs.

---

## Test Coverage Gaps

### **BLOCKING — Zero tests in the entire repository**
- What's not tested: Everything. No `*.test.ts`, no `*.spec.ts`, no `vitest.config.*`, no `jest.config.*`. `package.json` has no `test` script.
- Files: confirmed by `find /Users/user/repos/gingergig/frontend/src -name "*.test.*" -o -name "*.spec.*"` (returns nothing) and absence of test runner config files.
- Risk: Every refactor is a flying-blind operation. The typed API client cannot be regression-tested. The prototype's complex onboarding state machine (`OnboardingFlow.jsx:438-533` — 8 steps with branches by role) cannot be locked in.
- Priority: **High** — set up Vitest now, before more complexity accumulates. Recommended first targets: (1) `apiRequest` happy/timeout/4xx paths, (2) `parseTimeout` env coercion, (3) `waitForVerification` polling logic.

### **HIGH — No CI pipeline**
- What's not tested: `.gitignore:19` excludes `.github/`, and there are no GitHub Actions workflows in the tree. No automated `npm run lint`, no `npm run typecheck`, no `npm run format:check` on PR.
- Files: `/Users/user/repos/gingergig/.gitignore:19`
- Risk: TypeScript errors, lint violations, and formatting drift will only surface when a developer remembers to run them locally.
- Priority: **High** — add a minimal `.github/workflows/ci.yml` running typecheck + lint + format:check on every PR. The `.gitignore` exclusion of `.github/` will need to be removed (this looks like a leftover from a personal-config dotfile pattern).

### **HIGH — No Prettier config file**
- What's not tested: `package.json:12-13` has `format` and `format:check` scripts using Prettier, but there is no `.prettierrc*` and no `prettier` key in `package.json`. Prettier defaults will be used silently.
- Files: confirmed by `ls /Users/user/repos/gingergig/frontend/.prettierrc*` (no matches).
- Risk: Different developers will get different Prettier versions over time and reformat each other's code.
- Priority: **Medium** — add an explicit `.prettierrc.json` with at least `printWidth`, `singleQuote`, `trailingComma` pinned.

### **MEDIUM — No E2E test framework planned**
- What's not tested: User flows: login → onboard → upload IC → KYC pass → create listing.
- Risk: Persona-by-persona flows (elder, requestor, companion) are the entire product. Manual smoke testing across three personas × four locales = 12 happy paths to walk through every release.
- Priority: **Medium** — Playwright once the backend exists. Not urgent pre-backend.

---

## Greenfield Risks Specific to This Repo

### **HIGH — Conventions are not documented anywhere**
- Issue: The codebase is 5 commits old. There is no `CONTRIBUTING.md`, no `AGENTS.md`, no `.editorconfig`, no skill files in `.claude/skills/` or `.agents/skills/`. Naming, file layout, error patterns are forming organically — and inconsistently (the API layer uses `kebab-case` files and `camelCase` exports; the prototype uses kebab-case files but PascalCase component names mixed with camelCase utilities in the same file).
- Files: repo-wide.
- Impact: As contributors join, every PR will renegotiate conventions.
- Fix approach: Lock conventions now while the surface area is small. A 30-line `CONVENTIONS.md` (which this `/gsd-map-codebase` run will produce) is enough.

### **HIGH — `.gitignore:19` excludes `.github/`**
- Issue: `.github/` is in `.gitignore`. This blocks GitHub Actions, Dependabot, CODEOWNERS, issue templates, and PR templates from ever being committed.
- Files: `/Users/user/repos/gingergig/.gitignore:19`
- Impact: No CI is possible without first removing this line.
- Fix approach: Remove `.github/` from `.gitignore`. If the original intent was to exclude personal `.github/` Copilot configs, scope it more narrowly (e.g. `.github/copilot-instructions.md`).

### **MEDIUM — Branch hygiene: working on `backend` branch with frontend code**
- Issue: Current branch is `backend`, but the working tree changes are deletions of the backend scaffold — not new backend work. The previous merge commits suggest a workflow where `frontend` and `backend-scaffold` branches merge to `main`.
- Files: git state.
- Impact: Easy to commit the wrong things to the wrong branch. If this branch is intended to be the new backend implementation, it should start by deleting the old scaffold deliberately and committing.
- Fix approach: Decide on the deletion's intent and commit. Document branching strategy in `CONTRIBUTING.md`.

---

*Concerns audit: 2026-04-25*
