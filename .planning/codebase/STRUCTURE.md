# Codebase Structure

**Analysis Date:** 2026-04-25

## Directory Layout

```
gingergig/
├── .gitignore                          # Python + Node + IDE ignores
├── .planning/
│   └── codebase/                       # GSD codebase mapper output (this folder)
├── MULTI-CLOUD-ARCHITECTURE.md         # Untracked root copy of the architecture doc
├── README.md                           # Project intent, tech stack, API reference, run instructions
├── backend/                            # FastAPI backend scaffold with SQLAlchemy model layer
└── frontend/                           # Implemented React 19 + TS 5.8 + Vite 8 app
    ├── .env.example                    # VITE_API_BASE_URL, VITE_API_TIMEOUT_MS template
    ├── docs/
    │   ├── API_READY_MIGRATION.md      # Step-by-step prototype → live backend wiring guide
    │   ├── DESIGN_NOTES.md             # Product design + UX rationale
    │   └── MULTI-CLOUD-ARCHITECTURE.md # Committed copy of the architecture doc
    ├── eslint.config.js                # ESLint 9 flat config; ignores **/*.jsx
    ├── index.html                      # Vite HTML entry; loads /src/main.tsx
    ├── package-lock.json
    ├── package.json                    # name: ginger-gig-frontend, type: module
    ├── src/
    │   ├── App.tsx                     # 3-line re-export of PrototypeApp.jsx
    │   ├── config/
    │   │   └── env.ts                  # apiBaseUrl + apiTimeoutMs from import.meta.env
    │   ├── index.css                   # Global resets, body font, app-shell styles
    │   ├── jsx-modules.d.ts            # `declare module '*.jsx'` for TS↔JSX interop
    │   ├── main.tsx                    # createRoot + <StrictMode><App /></StrictMode>
    │   ├── prototype/                  # All UI lives here (JSX, mock data, inline styles)
    │   │   ├── PrototypeApp.jsx        # App shell, login, onboarding gate, persona tabs
    │   │   ├── OnboardingFlow.jsx      # Sign-up + KYC stepper (uses inline mock helpers)
    │   │   ├── companion-screens.jsx   # Companion dashboard, alerts, profile
    │   │   ├── components.jsx          # Icon, Avatar, Button, Card, Badge, Stars, GingerLogo, T_CTX, LANG_CTX
    │   │   ├── elder-screens.jsx       # Elder dashboard, listings, voice, earnings, profile, language
    │   │   ├── i18n.js                 # I18N strings + makeT(lang); LANGUAGES export
    │   │   ├── mock-data.js            # PROVIDERS, ELDER_BOOKINGS, COMPANION_ALERTS, REVIEWS, TIMELINE, PORTRAITS
    │   │   ├── prototype.css           # Prototype-scoped styles (top-nav, mobile-bottom-nav, screen-wrap)
    │   │   └── requestor-screens.jsx   # Requestor home, search, provider detail, profile
    │   └── services/
    │       └── api/                    # Typed API client — written, not yet wired to UI
    │           ├── endpoints/
    │           │   ├── auth.ts         # register, login, logout, getMe
    │           │   ├── companion.ts    # getCompanionDashboard, getCompanionAlerts, updateCompanionAlertPreferences
    │           │   ├── elder.ts        # getElderListings, updateListing, getElderBookings, respondToBooking, getElderEarnings
    │           │   ├── kyc.ts          # initiateSession, uploadDocument, startVerification, pollStatus, waitForVerification, retryKyc
    │           │   └── requestor.ts    # searchListings, createBooking, getRequestorBookings
    │           ├── http.ts             # apiRequest<T>, setApiAccessToken, ApiError handling, 408 timeout
    │           ├── index.ts            # Barrel re-export of types + http + every endpoints/* file
    │           └── types.ts            # Shared DTOs (Listing, Booking, Session, KycStatus, ApiError, ...)
    ├── tsconfig.app.json               # strict TS for src/, target ES2023, jsx: react-jsx
    ├── tsconfig.json                   # Root tsconfig (project references)
    ├── tsconfig.node.json              # tsconfig for Vite/Node tooling
    └── vite.config.ts                  # defineConfig({ plugins: [react()] })
```

---

## Directory Purposes

**`/` (repo root):**
- Purpose: Monorepo root holding `frontend/`, `backend/`, top-level docs, planning artefacts
- Contains: `README.md`, `MULTI-CLOUD-ARCHITECTURE.md`, `.gitignore`
- Key files: `README.md` (single source of truth for what the project is), `MULTI-CLOUD-ARCHITECTURE.md` (intended infra)

**`backend/`:**
- Purpose: Python FastAPI service for the GingerGig API.
- Contains: `app/` package, `pyproject.toml`, `uv.lock`, `Makefile`, Dockerfile, `.env.example`, and backend docs/tooling.
- Key files:
  - `backend/app/main.py` — FastAPI app shell, lifespan, CORS, exception registration, health and stub router mounting.
  - `backend/app/core/` — settings, enums, deterministic IDs, security stubs, and error-envelope helpers.
  - `backend/app/db/` — SQLAlchemy `Base` and async engine/session helpers.
  - `backend/app/models/` — SQLAlchemy 2 declarative models for the 11-table Phase 1 schema.
  - `backend/app/routers/` — `/health` plus six `/api/v1` router stubs for later phases.

**`frontend/`:**
- Purpose: React 19 + TypeScript 5.8 + Vite 8 SPA
- Contains: source, docs, build configs
- Key files: `package.json`, `vite.config.ts`, `tsconfig.app.json`, `eslint.config.js`, `index.html`

**`frontend/docs/`:**
- Purpose: Long-form design + integration documents
- Contains: 3 markdown files
- Key files:
  - `frontend/docs/DESIGN_NOTES.md` — product/UX rationale, visual system, persona walkthroughs
  - `frontend/docs/API_READY_MIGRATION.md` — instructions for swapping `OnboardingFlow.jsx` mock helpers for real `src/services/api/endpoints/*` imports
  - `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md` — AWS + Alibaba multi-cloud design (mirrored at repo root)

**`frontend/src/`:**
- Purpose: All TypeScript and JSX source for the frontend
- Contains: entry files, prototype subtree, services subtree, config subtree, global CSS, ambient `.d.ts`
- Key files: `main.tsx` (entry), `App.tsx` (mounts prototype), `index.css` (globals)

**`frontend/src/config/`:**
- Purpose: Centralised runtime configuration
- Contains: a single `env.ts`
- Convention: any new env-driven config goes here, not scattered through call sites

**`frontend/src/prototype/`:**
- Purpose: All user-facing UI, written as JSX with mock data — treated as a sketch (ESLint ignores `**/*.jsx`)
- Contains: app shell + 3 persona screen files + onboarding + shared components + i18n + mock data + prototype CSS
- Key files:
  - `PrototypeApp.jsx` — entry point of the prototype tree
  - `components.jsx` — shared UI atoms; defines `T_CTX`, `LANG_CTX`, `useT()`, `useLang()`
  - `i18n.js` — adding a new visible string starts here
  - `mock-data.js` — adding/changing demo content starts here

**`frontend/src/services/`:**
- Purpose: Production-shaped API client; isolated from prototype UI
- Contains: an `api/` subtree (currently the only service)
- Convention: TypeScript only. Each external concern (e.g. analytics, websockets) gets its own subfolder alongside `api/`.

**`frontend/src/services/api/`:**
- Purpose: Typed FastAPI client — DTOs, HTTP wrapper, endpoint functions
- Contains: `http.ts`, `types.ts`, `index.ts` (barrel), `endpoints/`
- Convention: keep one file per logical resource group inside `endpoints/`

**`frontend/src/services/api/endpoints/`:**
- Purpose: One file per resource (auth, elder, requestor, companion, kyc)
- Naming: lowercase resource name, e.g. `auth.ts`, `elder.ts`
- Pattern: each function is named after the verb (`register`, `searchListings`, `respondToBooking`) and calls `apiRequest<TypedReturn>("/path", {...})`

**`.planning/codebase/`:**
- Purpose: GSD codebase mapper output (consumed by `/gsd-plan-phase` and `/gsd-execute-phase`)
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md` (this file), and other `*.md` from sibling mappers
- Generated: yes, by mapper agents
- Committed: yes (per project convention)

---

## Key File Locations

**Entry Points:**
- `frontend/index.html` — HTML entry, loads the JS bundle
- `frontend/src/main.tsx` — JS entry, mounts React
- `frontend/src/App.tsx` — top-level React component (3-line re-export)
- `frontend/src/prototype/PrototypeApp.jsx` — actual app shell with login, onboarding gate, persona tabs

**Configuration:**
- `frontend/vite.config.ts` — Vite + React plugin (minimal)
- `frontend/tsconfig.json` — root TS project references
- `frontend/tsconfig.app.json` — strict TS for `src/`
- `frontend/tsconfig.node.json` — TS for Vite tooling
- `frontend/eslint.config.js` — ESLint 9 flat config (ignores `**/*.jsx`)
- `frontend/.env.example` — env var template (`VITE_API_BASE_URL`, `VITE_API_TIMEOUT_MS`)
- `frontend/src/config/env.ts` — runtime resolution of env vars

**Core Logic:**
- `frontend/src/services/api/http.ts` — fetch wrapper, auth token, timeout, error normalisation
- `frontend/src/services/api/types.ts` — all DTOs and shared types
- `frontend/src/services/api/endpoints/*.ts` — per-resource endpoint functions
- `frontend/src/prototype/PrototypeApp.jsx` — top-level UI state machine
- `frontend/src/prototype/OnboardingFlow.jsx` — sign-up + KYC stepper

**UI building blocks:**
- `frontend/src/prototype/components.jsx` — shared atoms (`Icon`, `Avatar`, `Button`, `Card`, `Badge`, `AILabel`, `Stars`, `GingerLogo`, `BottomNav`, `PhoneShell`) and i18n contexts
- `frontend/src/prototype/i18n.js` — translation strings, `LANGUAGES`, `makeT(lang)`
- `frontend/src/prototype/mock-data.js` — `PROVIDERS`, `HERO_ELDER`, `ELDER_BOOKINGS`, `ELDER_COMPLETED`, `ELDER_LISTINGS`, `COMPANION_ALERTS`, `REVIEWS`, `TIMELINE`, `PORTRAITS`

**Styling:**
- `frontend/src/index.css` — global resets, body font (Inter), `#root` height, top-bar styles
- `frontend/src/prototype/prototype.css` — prototype-scoped styles (`.app-shell`, `.top-nav`, `.nav-tabs`, `.content-frame`, `.screen-wrap`, `.mobile-bottom-nav`, `.lang-pick`)

**Testing:**
- None. No test files, no test runner configured. Worth flagging when planning quality work.

---

## Naming Conventions

**Files:**
- TypeScript modules: lowercase, often single word — `http.ts`, `types.ts`, `auth.ts`, `env.ts`
- TypeScript components (none yet, but `App.tsx` precedent): PascalCase
- JSX prototype files: kebab-case for screen files (`elder-screens.jsx`, `requestor-screens.jsx`, `companion-screens.jsx`), PascalCase for top-level components (`PrototypeApp.jsx`, `OnboardingFlow.jsx`), lowercase for utilities (`i18n.js`, `mock-data.js`, `components.jsx`)
- Markdown: SCREAMING-KEBAB-CASE for top-level docs (`README.md`, `MULTI-CLOUD-ARCHITECTURE.md`, `API_READY_MIGRATION.md`, `DESIGN_NOTES.md`)
- Config: standard tool-specific names (`.eslintrc.*` would be the older form; this repo uses flat config `eslint.config.js`)

**Directories:**
- All lowercase: `frontend/`, `backend/`, `src/`, `services/`, `prototype/`, `endpoints/`, `config/`, `docs/`

**Functions / variables:**
- camelCase: `apiRequest`, `setApiAccessToken`, `getElderListings`, `respondToBooking`, `waitForVerification`, `parseTimeout`
- Boolean params: prefixed with `is`, `has`, `should` is not enforced — see `halalOnly`, `openNow` in `requestor.ts` (adjective-only)

**Types / interfaces:**
- PascalCase: `ApiError`, `Session`, `UserProfile`, `KycStatus`, `RegisterPayload`, `KycUploadUrls`, `SearchListingsParams`
- Union string literals lower-snake-only-when-needed: `KycStatus = "not_started" | "pending" | "approved" | "failed" | "manual_review"`; otherwise plain camelCase or single words (`UserRole = "elder" | "requestor" | "companion"`)

**Constants:**
- SCREAMING_SNAKE_CASE for module-level: `DEFAULT_API_BASE_URL`, `DEFAULT_TIMEOUT_MS`, `API_PREFIX`, `POLL_INTERVAL_MS`, `MAX_POLLS`, `TERMINAL_STATUSES`, `DEMO_ACCOUNTS`, `ELDER_TABS`, `REQUESTOR_TABS`, `COMPANION_TABS`, `TONE_GRADIENT`, `MOCK_DELAY`, `LANGUAGES`, `I18N`

**API URLs:**
- All endpoints under `/api/v1` (prefix added automatically by `apiRequest`)
- kebab-case path segments: `/auth/me`, `/kyc/session`, `/kyc/verify`, `/kyc/status/:jobId`, `/elders/:id/earnings/summary`, `/companions/elders/:elderId/alert-preferences`
- Snake_case query params (server convention): `max_distance_km`, `halal_only`, `open_now` (camelCase in TS, snake_case in URL — see `requestor.ts` `searchListings`)

**Env vars:**
- Vite-required prefix: `VITE_*`
- SCREAMING_SNAKE_CASE: `VITE_API_BASE_URL`, `VITE_API_TIMEOUT_MS`

**i18n keys:**
- camelCase or snake_case grouped by screen prefix: `appName`, `tagline`, `welcome`, `chooseLanguage`, `v_title`, `v_subtitle` (the `v_*` prefix scopes voice-screen strings). Adopted ad-hoc; no enforced rule.

---

## Where to Add New Code

**A new screen for an existing persona:**
- Add the component to the persona's screen file:
  - Elder → `frontend/src/prototype/elder-screens.jsx`
  - Requestor → `frontend/src/prototype/requestor-screens.jsx`
  - Companion → `frontend/src/prototype/companion-screens.jsx`
- Add a tab entry to the corresponding `*_TABS` constant in `frontend/src/prototype/PrototypeApp.jsx`
- Add a branch to the `if (persona === 'X')` block in `PrototypeApp.jsx`'s `App` function that maps `tab.X === 'newId'` to your component
- Add any new visible strings to `frontend/src/prototype/i18n.js` keyed `{ms, en, zh, ta}`

**A new shared UI component:**
- Add to `frontend/src/prototype/components.jsx`
- Export it via the named-export list at the bottom of the file (`export { Icon, Avatar, ..., NewThing }`)
- Use existing CSS custom properties (`var(--primary)`, `var(--text-1)`, `var(--bg)`, etc.) for colours

**A new translation string:**
- Add a new key to `I18N` in `frontend/src/prototype/i18n.js` with all four languages: `{ms, en, zh, ta}`
- Use it from any prototype component: `const t = useT(); t('myNewKey')`

**A new API endpoint client:**
- Pick or create the right file in `frontend/src/services/api/endpoints/` (one file per resource)
- Add types to `frontend/src/services/api/types.ts` if the request/response shape is shared
- Use `apiRequest<ReturnType>("/path", { method: "POST", body: JSON.stringify(payload) })`
- Re-export happens automatically via `frontend/src/services/api/index.ts` (`export * from "./endpoints/foo"`)
- Document the HTTP method/path in a JSDoc comment above the function (existing convention)

**A new DTO / shared type:**
- Add to `frontend/src/services/api/types.ts`
- Group with related types using comment dividers (existing convention: `// ─── KYC ─── ...`)

**New runtime config (env var):**
- Add a parsed field to the `env` object in `frontend/src/config/env.ts`
- Add the variable to `frontend/.env.example` with a comment explaining it
- Reference it from `import { env } from "../../config/env"`

**New mock data for the prototype:**
- Add to `frontend/src/prototype/mock-data.js`
- Export with `export const MY_NEW_DATA = ...`
- Import directly into the screen file that uses it

**Backend code (when implementing):**
- The README and `MULTI-CLOUD-ARCHITECTURE.md` describe the intent. Files to (re-)create:
  - `backend/main.py` — FastAPI app, `/health` endpoint, router mounts under `/api/v1`
  - `backend/db.py` — async SQLAlchemy engine + session factory
  - `backend/models.py` — SQLAlchemy ORM models
  - `backend/routes/` — one file per resource group (matches frontend `src/services/api/endpoints/` layout: `auth.py`, `elder.py`, `requestor.py`, `companion.py`, `kyc.py`, plus `voice_to_profile.py`)
  - `backend/services/` — business logic + AWS/Alibaba SDK orchestration (Textract, Rekognition, Transcribe, Qwen, S3, OSS)
  - `backend/pyproject.toml` — `uv`-managed deps
  - `backend/.env.example` — `DATABASE_URL`, AWS credentials placeholder, Qwen API key placeholder

---

## Special Directories

**`backend/`:**
- Purpose: Python FastAPI service (planned)
- Generated: no
- Committed: yes (currently empty)
- Notes: deleted scaffold — see `git status`. Implementing this is the obvious next phase.

**`.planning/codebase/`:**
- Purpose: GSD mapper output consumed by other GSD commands
- Generated: yes (by `/gsd-map-codebase`)
- Committed: yes
- Notes: do not hand-edit; re-run the mapper to refresh

**`frontend/dist/`:**
- Purpose: Vite production build output
- Generated: yes (`npm run build`)
- Committed: no (gitignored)

**`frontend/node_modules/`:**
- Purpose: npm install target
- Generated: yes
- Committed: no (gitignored)

**`frontend/screenshots/`, `frontend/uploads/`:**
- Purpose: ad-hoc working folders (referenced in `.gitignore` and `eslint.config.js` ignores)
- Generated: yes
- Committed: no (gitignored)

**`.claude/`, `.cursor/`, `.github/`, `.idea/`, `.vscode/`:**
- Purpose: editor/AI/CI configs
- Generated: yes
- Committed: no (gitignored — note this means GitHub Actions workflows are also gitignored, which is unusual)

---

*Structure analysis: 2026-04-25*
