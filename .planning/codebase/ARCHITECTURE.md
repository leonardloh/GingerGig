# Architecture

**Analysis Date:** 2026-04-25

GingerGig is a hyperlocal gig platform connecting Malaysian elders (service providers) with requestors (customers) and family companions (carers). The repository is a monorepo with a working React frontend and an empty backend folder. A multi-cloud (AWS + Alibaba) backend is fully designed but not yet implemented.

This document describes both the **implemented** frontend architecture and the **planned** backend / multi-cloud architecture. Each section is clearly tagged.

---

## Pattern Overview

**Overall (implemented):** Single-page React 19 prototype with a typed-but-disconnected API service layer.

**Overall (planned):** Multi-cloud distributed system — AWS (Singapore) hosts the user-facing edge (frontend CDN + ASR), Alibaba Cloud (Malaysia) hosts the data plane (FastAPI backend, PostgreSQL, Redis, OSS, Qwen LLM).

**Key Characteristics (implemented):**
- Two-tier internal split inside `frontend/src/`: a fully-styled prototype (`src/prototype/`, JSX, mock data) and a production-shaped API client (`src/services/api/`, TypeScript, typed DTOs).
- `App.tsx` is a thin re-export that mounts `PrototypeApp.jsx`. The prototype owns all UI state and routing.
- Persona-driven UI: three top-level user roles (elder / requestor / companion) each get their own tab set and screen tree.
- All API endpoints are typed and documented but not wired — screens still call inline mock helpers (e.g. `apiRegister` inside `OnboardingFlow.jsx`).
- Multilingual by design: every visible string flows through `i18n.js` for `ms` / `en` / `zh` / `ta`.
- Strict TypeScript on `.ts/.tsx`; ESLint deliberately ignores `**/*.jsx` (the prototype is treated as a sketch, the service layer as production).

**Key Characteristics (planned):**
- Polyglot per-cloud responsibilities: AWS owns frontend hosting + speech-to-text; Alibaba owns persistence, caching, photo storage, and generative AI.
- Two-path voice-to-profile pipeline routed by language code: streaming WebSocket for `en-US`/`zh-CN`, batch S3-presigned-upload for `ms-MY`/`ta-IN`.
- Backend acts as the WebSocket proxy to AWS Transcribe (avoids shipping AWS credentials to browser).
- Qwen / DashScope is the only entity-extraction layer (AWS Comprehend was rejected for poor domain fit).
- Redis (Tair) is a read-through cache for listings and sessions, not a job queue.

---

## Layers

### Implemented frontend layers

**Entry / Bootstrap layer (implemented):**
- Purpose: Mount React into the DOM, apply global styles
- Location: `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
- Contains: HTML shell, `createRoot` call, `StrictMode`, global CSS import (`src/index.css`)
- Depends on: React 19, React DOM
- Used by: Vite build pipeline (`vite.config.ts`)

**Prototype / UI layer (implemented):**
- Purpose: All user-facing screens, state management, navigation, mock data
- Location: `frontend/src/prototype/`
- Contains:
  - `PrototypeApp.jsx` — app shell (login, onboarding gate, persona-based tabs, sign-out)
  - `elder-screens.jsx`, `requestor-screens.jsx`, `companion-screens.jsx` — per-persona screen trees
  - `OnboardingFlow.jsx` — sign-up + KYC stepper
  - `components.jsx` — shared UI atoms (Icon, Avatar, Button, Card, Badge, AILabel, Stars, GingerLogo, BottomNav, PhoneShell) and React contexts (`T_CTX`, `LANG_CTX`)
  - `i18n.js` — translation strings + `makeT(lang)` factory
  - `mock-data.js` — providers, bookings, alerts, reviews
  - `prototype.css` — prototype-scoped styles
- Depends on: React 19 hooks (`useState`, `useEffect`, `useMemo`, `useRef`, `useContext`), inline styles + CSS custom properties
- Used by: `frontend/src/App.tsx`

**API service layer (implemented, not wired):**
- Purpose: Fully typed client for the (planned) FastAPI backend
- Location: `frontend/src/services/api/`
- Contains:
  - `http.ts` — `apiRequest<T>()` core fetch wrapper (token injection, timeout via `AbortController`, JSON parsing, `ApiError` shape, 204 handling)
  - `types.ts` — DTOs for `KycStatus`, `RegisterPayload`, `Session`, `UserProfile`, `Listing`, `Booking`, `EarningsSummary`, `CompanionAlert`, `CompanionDashboard`, `ApiError`
  - `endpoints/auth.ts` — `register`, `login`, `logout`, `getMe`
  - `endpoints/elder.ts` — `getElderListings`, `updateListing`, `getElderBookings`, `respondToBooking`, `getElderEarnings`
  - `endpoints/requestor.ts` — `searchListings`, `createBooking`, `getRequestorBookings`
  - `endpoints/companion.ts` — `getCompanionDashboard`, `getCompanionAlerts`, `updateCompanionAlertPreferences`
  - `endpoints/kyc.ts` — `initiateSession`, `uploadDocument`, `startVerification`, `pollStatus`, `waitForVerification`, `retryKyc`
  - `index.ts` — barrel re-export
- Depends on: `src/config/env.ts` (base URL, timeout), browser `fetch`, `AbortController`
- Used by: nothing yet — prototype screens call local mock helpers (e.g. `apiRegister` defined inline in `OnboardingFlow.jsx`)

**Configuration layer (implemented):**
- Purpose: Resolve runtime config from Vite env vars
- Location: `frontend/src/config/env.ts`
- Contains: `env` object with `apiBaseUrl` and `apiTimeoutMs` (defaults: `http://localhost:8000`, `15000`ms)
- Depends on: `import.meta.env.VITE_API_BASE_URL`, `import.meta.env.VITE_API_TIMEOUT_MS`
- Used by: `src/services/api/http.ts`

### Planned backend layers (from MULTI-CLOUD-ARCHITECTURE.md)

**API layer (planned):**
- Purpose: REST + WebSocket endpoints under `/api/v1/*`
- Hosted on: Alibaba ECS (`ap-southeast-3`)
- Tech: FastAPI + SQLAlchemy (async)
- Endpoints: `/auth/*`, `/users`, `/listings`, `/bookings`, `/earnings`, `/matching`, `/voice-to-profile/*`, `/kyc/*`, `/companions/*`

**Persistence layer (planned):**
- Purpose: Primary relational store
- Hosted on: ApsaraDB PostgreSQL (Alibaba)
- Used by: FastAPI backend

**Cache layer (planned):**
- Purpose: Read-through cache for listings + session data
- Hosted on: Alibaba Tair (Redis)

**Object storage (planned):**
- Two buckets:
  - AWS S3 (`ap-southeast-1`) — KYC IC images, audio for batch ASR (BM/Tamil)
  - Alibaba OSS — provider photos

**ASR layer (planned):**
- AWS Transcribe Streaming — `en-US`, `zh-CN` (live partials, ~2-3s end-to-end)
- AWS Transcribe Batch — `ms-MY`, `ta-IN` (~8-12s for a 20-second clip)
- Routing decision: language code at `/voice-to-profile/*` API boundary

**Generative AI layer (planned):**
- Qwen / DashScope (Alibaba) — JSON extraction from transcripts, listing copy generation, matching ranking, earnings nudges
- Single prompt with `response_format={"type": "json_object"}` for both streaming and batch transcripts

**KYC pipeline (planned):**
- AWS S3 stores IC images and selfie (presigned PUT from browser, never via app server)
- AWS Textract `AnalyzeID` extracts MyKad fields (name, IC number, DOB, address)
- AWS Rekognition `CompareFaces` + Face Liveness verifies selfie matches IC photo
- Async: backend writes results to PostgreSQL, frontend polls `/kyc/status/:jobId`

**Frontend hosting (planned):**
- AWS S3 + CloudFront (`ap-southeast-1`, with KL/Cyberjaya edge POP)

---

## Data Flow

### Implemented: prototype runtime flow

**Page load → app shell → screen render:**

1. Browser loads `frontend/index.html` → `<script type="module" src="/src/main.tsx">`
2. `src/main.tsx` calls `createRoot(...).render(<StrictMode><App /></StrictMode>)`
3. `src/App.tsx` re-exports the default from `src/prototype/PrototypeApp.jsx`
4. `PrototypeApp` (the inner `App` function) holds top-level state: `user`, `showSignUp`, `lang`, `tab` (per-persona), `providerId`, `searchQuery`
5. If `!user && showSignUp` → render `<OnboardingFlow>`
6. Else if `!user` → render `<LoginScreen>` (matches against `DEMO_ACCOUNTS` in `PrototypeApp.jsx`)
7. Else → render persona-specific tab set (`ELDER_TABS` / `REQUESTOR_TABS` / `COMPANION_TABS`) and the screen for the active tab
8. `T_CTX.Provider` and `LANG_CTX.Provider` wrap the shell so any descendant can call `useT()` / `useLang()`

**State management (implemented):**
- React local state via `useState` inside `PrototypeApp`'s `App` function
- React Context for translation function `t` and current `lang` code (`T_CTX`, `LANG_CTX` in `components.jsx`)
- No Redux, Zustand, or React Query
- API access token state lives module-scoped inside `src/services/api/http.ts` (`let accessToken: string | null = null`) — set via `setApiAccessToken`

**Mock data flow (implemented):**
- Screens import constants directly from `src/prototype/mock-data.js` (e.g. `PROVIDERS`, `ELDER_BOOKINGS`, `COMPANION_ALERTS`, `HERO_ELDER`, `REVIEWS`, `TIMELINE`)
- `OnboardingFlow.jsx` defines local async helpers (`apiRegister`, `apiInitiateKycSession`, `apiStartVerification`, `apiWaitForResult`) that simulate latency with `MOCK_DELAY` and return hardcoded payloads

### Implemented: API client request flow (when wired)

1. Caller invokes a typed endpoint, e.g. `login({ email, password })` from `src/services/api/endpoints/auth.ts`
2. Endpoint calls `apiRequest<Session>("/auth/login", { method: "POST", body: JSON.stringify(...) })`
3. `apiRequest` in `src/services/api/http.ts`:
   - Creates `AbortController`, schedules `setTimeout(controller.abort, env.apiTimeoutMs)`
   - Builds headers — adds `Content-Type: application/json` if a body is present, adds `Authorization: Bearer ${accessToken}` if a token is set
   - Calls `fetch(\`${env.apiBaseUrl}/api/v1${path}\`, ...)`
   - On non-2xx: parses JSON error body (best-effort), throws `ApiError` `{status, message, detail}`
   - On 204: returns `undefined as T`
   - On 2xx with body: returns `await response.json() as T`
   - On `AbortError`: throws `ApiError` with `status: 408`
4. `auth.login` then calls `setApiAccessToken(session.accessToken)` — subsequent calls auto-attach the Bearer header

### Planned: voice-to-profile streaming flow (en-US, zh-CN)

1. Browser opens WebSocket to `wss://<backend>/voice-to-profile/stream` with `{language}`
2. Backend (FastAPI on Alibaba ECS) opens `amazon-transcribe-streaming` session via `boto3` to AWS
3. Browser streams 16 kHz PCM audio chunks over the WebSocket
4. Backend forwards chunks to AWS Transcribe; partial transcripts flow back live for caption UX
5. On user pause, Transcribe emits final transcript
6. Backend sends final transcript to Qwen with the JSON-extraction prompt (returns strict JSON: `{name, service_offer, category, price_amount, price_unit, capacity, dietary_tags, location_hint, language}`)
7. Backend persists listing draft to PostgreSQL, returns structured JSON to browser
- Target end-to-end: **2-3 seconds after user stops speaking**

### Planned: voice-to-profile batch flow (ms-MY, ta-IN)

1. Browser records audio, requests presigned S3 PUT URL from backend
2. Browser PUTs audio directly to S3 (`ap-southeast-1`) — no proxy
3. Browser calls `POST /voice-to-profile/batch` with `{s3_key, language}`
4. Backend submits AWS Transcribe batch job pointing at S3 URI, polls inline (~1.5s interval)
5. On completion, backend sends transcript to Qwen with same JSON-extraction prompt
6. Backend persists listing draft, returns structured JSON to browser
- Target end-to-end: **8-12 seconds for a 20-second clip**

### Planned: KYC pipeline flow

1. `POST /api/v1/kyc/session` → backend creates session, returns 3 presigned S3 PUT URLs (front IC, back IC, selfie), valid 15 min
2. Browser PUTs files directly to S3 (no `Authorization` header — presigned URL carries auth)
3. `POST /api/v1/kyc/verify` with `{sessionId}` → backend triggers pipeline:
   - Textract `AnalyzeID` on IC front + back → extracts name, IC number, DOB, address, nationality, gender, confidence score
   - Rekognition `CompareFaces` (IC face vs selfie) → similarity score
   - Optional Rekognition Face Liveness on selfie
   - Writes result to PostgreSQL, updates user record
4. Browser polls `GET /api/v1/kyc/status/:jobId` every 2.5s (`POLL_INTERVAL_MS` in `kyc.ts`) until terminal state: `approved` | `failed` | `manual_review` (max 24 polls = 60s timeout)
5. On `failed`, user can call `POST /api/v1/kyc/retry` to start a fresh session

---

## Key Abstractions

### Implemented

**`apiRequest<T>` — generic HTTP client:**
- Purpose: Single point for all backend HTTP calls
- Location: `frontend/src/services/api/http.ts`
- Pattern: Generic-typed thin wrapper around `fetch`, opinionated about prefixes, auth, timeout, and error shape

**`ApiError` — typed error envelope:**
- Purpose: Uniform error shape across all endpoints
- Location: `frontend/src/services/api/types.ts`
- Pattern: `{status: number, message: string, detail?: unknown}`. Special status `408` for client-side timeouts.

**`env` — runtime config singleton:**
- Purpose: Centralised access to Vite env vars with defaults and parsing
- Location: `frontend/src/config/env.ts`
- Pattern: Frozen object literal exported from a module; consumers `import { env }`

**`T_CTX` / `LANG_CTX` — i18n React contexts:**
- Purpose: Make `t(key)` and current language code available anywhere in the prototype tree without prop drilling
- Location: `frontend/src/prototype/components.jsx`
- Pattern: `createContext` + `useT()` / `useLang()` hooks; provider wraps app shell in `PrototypeApp.jsx`
- Usage: `const t = useT(); return <h1>{t('welcome')}</h1>`

**Persona — top-level UI mode:**
- Purpose: One of `'elder'`, `'requestor'`, `'companion'`. Drives tab set, gradient theme, and which screen tree renders
- Location: `frontend/src/prototype/PrototypeApp.jsx` (state), screen files split by persona
- Pattern: Stored on `user.persona`, switched via demo login or onboarding role selection
- Examples: `ELDER_TABS`, `REQUESTOR_TABS`, `COMPANION_TABS` constants in `PrototypeApp.jsx`

**Mock account / mock pipeline:**
- Purpose: Let the prototype run end-to-end with no backend
- Location: `DEMO_ACCOUNTS` in `frontend/src/prototype/PrototypeApp.jsx`; `apiRegister`, `apiInitiateKycSession`, `apiStartVerification`, `apiWaitForResult` inside `frontend/src/prototype/OnboardingFlow.jsx`
- Pattern: Inline async functions that `await MOCK_DELAY(ms)` then return hardcoded payloads. Designed to be replaced one-for-one with imports from `src/services/api/endpoints/`.

### Planned

**Voice-to-profile language router:**
- Purpose: Pick streaming vs batch ASR based on language code
- Location: planned FastAPI endpoint at `/api/v1/voice-to-profile/*`
- Pattern: API-boundary switch — `en-US`/`zh-CN` → WebSocket + Transcribe Streaming; `ms-MY`/`ta-IN` → presigned S3 + Transcribe Batch

**Qwen JSON-extraction prompt:**
- Purpose: Single prompt that converts free-text transcripts in any of the 4 languages to a strict JSON listing draft
- Output schema: `{name, service_offer, category, price_amount, price_unit, capacity, dietary_tags[], location_hint, language}`
- Constraint: free-text fields preserve original language; enum fields are normalised to canonical English

---

## Entry Points

### Implemented

**HTML entry:**
- Location: `frontend/index.html`
- Triggers: Vite dev server / build
- Responsibilities: Provide `<div id="root">`, load `/src/main.tsx`, set page title

**JS entry:**
- Location: `frontend/src/main.tsx`
- Triggers: Module-loaded by `index.html`
- Responsibilities: `createRoot` on `#root`, render `<App />` inside `<StrictMode>`, import global CSS

**App component:**
- Location: `frontend/src/App.tsx`
- Triggers: Rendered by `main.tsx`
- Responsibilities: Re-export `PrototypeApp` (single line: `export default PrototypeApp`). All real logic lives in the prototype.

**Prototype shell:**
- Location: `frontend/src/prototype/PrototypeApp.jsx`
- Triggers: Imported by `App.tsx`
- Responsibilities: Login gating, sign-up / onboarding gating, persona resolution, tab routing, top-nav and mobile-bottom-nav rendering, language picker, sign-out

### Planned

**FastAPI entry:**
- Location: `backend/main.py` (placeholder mentioned in README — file does not currently exist)
- Triggers: `uv run uvicorn main:app --reload --port 8000`
- Responsibilities: Mount routers under `/api/v1/*`, expose `/health`

---

## Error Handling

### Implemented

**Strategy:** Throw structured `ApiError` from the HTTP layer; let callers `try/catch` and surface user-friendly messages.

**Patterns:**
- `apiRequest` always throws `ApiError` `{status, message, detail}` for non-2xx responses (in `frontend/src/services/api/http.ts`).
- Timeouts are normalised to `status: 408` so callers can match on a single field.
- 204 No Content is treated as success and returns `undefined as T` (used by e.g. `updateCompanionAlertPreferences`).
- `kyc.ts` `waitForVerification` throws a plain `Error("KYC verification timed out after 60 seconds")` after `MAX_POLLS = 24` polls — a deliberate non-`ApiError` exception used to stop the polling loop.
- Direct S3 PUT in `kyc.ts` `uploadDocument` throws `Error("S3 upload failed: ${response.status}")` — bypasses `apiRequest` because S3 doesn't take the bearer token.

**UI-level handling:**
- `LoginScreen` in `PrototypeApp.jsx` sets a local `error` state string for invalid demo credentials.
- `OnboardingFlow.jsx` uses a local `phase` state machine (`"intro" | "uploading" | "processing" | "result_ok" | "result_fail"`) to render the right error UX.

### Planned

- Backend will return JSON error bodies; `apiRequest` already parses these into `ApiError.detail` (best-effort, falls back to `undefined`).
- KYC failures are first-class results, not exceptions — `KycStatus` includes `"failed"` and `"manual_review"` as terminal states alongside `"approved"`.

---

## Cross-Cutting Concerns

### Implemented

**Logging:** None. No logger imported, no `console.log` in committed code paths.

**Validation:** None on the frontend — relies on HTML form attributes (`type="email"`, `required` not currently set) and TypeScript types at compile time. No Zod, Yup, or runtime validators.

**Authentication:** Module-scoped Bearer token in `src/services/api/http.ts`. `setApiAccessToken(token)` stores it; every subsequent `apiRequest` attaches `Authorization: Bearer ${token}`. `logout()` clears it. No persistence across page reloads — token lives only in memory.

**Internationalisation:** Mandatory. Every visible string lives in `frontend/src/prototype/i18n.js` keyed by `{ms, en, zh, ta}`. `makeT(lang)` returns a `t(key)` function. Top-level state in `PrototypeApp` controls current language; `LANG_CTX` and `T_CTX` provide it to descendants.

**Styling:** Inline styles + CSS custom properties. Design tokens (`--primary`, `--bg`, `--text-1`, `--font-display`, etc.) are defined in `frontend/src/index.css` and `frontend/src/prototype/prototype.css`. No CSS-in-JS library, no Tailwind.

**Type safety:** `tsconfig.app.json` sets `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. ESLint covers `src/**/*.{ts,tsx}` only — `**/*.jsx` is explicitly ignored (`frontend/eslint.config.js`).

**JSX-from-TS interop:** `frontend/src/jsx-modules.d.ts` declares `*.jsx` as a generic `ComponentType` so `App.tsx` can default-import `PrototypeApp.jsx` without TS errors.

### Planned

- Authentication: JWT issued by FastAPI; `sub` claim identifies user. Companion endpoints (e.g. `getCompanionAlerts`) resolve the companion identity from the JWT, not a path param.
- Logging: not specified in MULTI-CLOUD-ARCHITECTURE.md.
- Caching: Tair/Redis as read-through cache for listings browse, search results, session lookups.
- PII handling: KYC IC images go browser → S3 directly via presigned URL; **never** through the application server. Same principle applies to BM/Tamil voice batch uploads.

---

## Repository Status

**Frontend:** Implemented and runnable. `cd frontend && npm install && npm run dev` starts the prototype at `http://localhost:5173` with no backend dependency.

**Backend:** Empty. `backend/` is an empty directory. Files referenced in `README.md` (`backend/main.py`, `backend/db.py`, `backend/models.py`, `backend/routes/`, `backend/services/`, `backend/.env.example`, `backend/pyproject.toml`, `backend/uv.lock`) were deleted on this branch (visible in `git status`). Implementing the backend per the README contract and `MULTI-CLOUD-ARCHITECTURE.md` is the obvious next phase.

**Architecture doc:** `MULTI-CLOUD-ARCHITECTURE.md` lives in two places — at the repo root (`/Users/user/repos/gingergig/MULTI-CLOUD-ARCHITECTURE.md`, untracked per `git status`) and inside the frontend (`frontend/docs/MULTI-CLOUD-ARCHITECTURE.md`, committed). They describe the same design.

---

*Architecture analysis: 2026-04-25*
