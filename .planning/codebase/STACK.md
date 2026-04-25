# Technology Stack

**Analysis Date:** 2026-04-25

## Overview

GingerGig is a hyperlocal gig platform with two halves:

- **Frontend** — fully implemented React + TypeScript + Vite SPA at `frontend/`. The prototype runs on mock data; a typed API client layer is wired and ready for backend integration.
- **Backend** — previously scaffolded as a FastAPI + SQLAlchemy + asyncpg service at `backend/`, now removed (only the empty `backend/` directory remains). All backend tech below is **planned/scaffolded but removed** — recoverable from commit `3de5f53` if needed.

## Languages

**Primary (implemented):**
- TypeScript 5.8.3 — frontend source under `frontend/src/services/`, `frontend/src/config/`, `frontend/src/App.tsx`, `frontend/src/main.tsx`
- JavaScript (JSX) — prototype UI under `frontend/src/prototype/*.jsx` (intentionally untyped, excluded from the lint TS pass via `eslint.config.js` ignores)

**Primary (planned/scaffolded but removed):**
- Python ≥3.12 — declared in former `backend/pyproject.toml` (commit `3de5f53`); intended for FastAPI service

**Secondary:**
- CSS — design-token system in `frontend/src/index.css` and `frontend/src/prototype/prototype.css`
- HTML — single entry shell at `frontend/index.html`

## Runtime

**Frontend (implemented):**
- Node.js 18+ (per README "Prerequisites")
- Vite 8.0.10 dev server / build tool — config at `frontend/vite.config.ts`
- Module type: ESM (`"type": "module"` in `frontend/package.json`)
- Browser target: ES2023 (`frontend/tsconfig.app.json`), with DOM lib

**Backend (planned/scaffolded but removed):**
- Python 3.12+
- ASGI server: Uvicorn (per former `backend/main.py` and `pyproject.toml`)
- Run command (from README): `uv run uvicorn main:app --reload --port 8000`

## Frameworks

**Frontend (implemented):**
- React 19.2.0 — `frontend/package.json` dependencies; `StrictMode` mount at `frontend/src/main.tsx`
- React DOM 19.2.0 — same source
- Vite 8.0.10 + `@vitejs/plugin-react` 6.0.1 — `frontend/vite.config.ts`

**Backend (planned/scaffolded but removed):**
- FastAPI ≥0.136.1 — REST + WebSocket per `frontend/docs/MULTI-CLOUD-ARCHITECTURE.md`
- SQLAlchemy ≥2.0.49 (async) — engine setup in former `backend/db.py`
- asyncpg ≥0.31.0 — Postgres driver
- python-dotenv ≥1.2.2 — env loading

**Testing:**
- Not detected. No Jest, Vitest, Playwright, or pytest config or test files anywhere in the repo.

**Build/Dev (frontend):**
- Vite 8.0.10 — bundler / dev server
- TypeScript 5.8.3 — compiler (`tsc -b` orchestrates project references in `frontend/tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`)
- ESLint 9.25.0 + `typescript-eslint` 8.32.1 — `frontend/eslint.config.js` (flat config)
- Prettier 3.6.2 — invoked via `npm run format` / `format:check`

## Key Dependencies

**Critical (frontend):**
- `react` 19.2.0 — UI runtime
- `react-dom` 19.2.0 — DOM renderer
- Native `fetch` — HTTP transport, wrapped in `frontend/src/services/api/http.ts` (no axios / ky / SWR / react-query)

**Critical (planned backend):**
- `fastapi` — HTTP framework
- `sqlalchemy` — async ORM
- `asyncpg` — Postgres driver
- `uvicorn` — ASGI server

**Notably absent (frontend):**
- No router (React Router, TanStack Router) — navigation is handled inside `frontend/src/prototype/PrototypeApp.jsx` via local state
- No state library (Redux, Zustand, Jotai) — local React state only
- No CSS framework (Tailwind, MUI) — hand-rolled CSS variables in `frontend/src/index.css`
- No data-fetching library — all calls go through `frontend/src/services/api/http.ts`
- No i18n library — translation strings inlined in `frontend/src/prototype/i18n.js`

**Infrastructure:**
- `uv` lockfile (former `backend/uv.lock`) — Python package manager intended for backend, file removed

## Configuration

**Frontend environment:**
- Loaded by Vite via `import.meta.env` in `frontend/src/config/env.ts`
- Template: `frontend/.env.example`
- User-supplied file: `.env.local` (gitignored, see `.gitignore` — entry `.env`)
- Required keys:
  - `VITE_API_BASE_URL` — backend host without trailing slash, e.g. `http://localhost:8000`. The HTTP client appends `/api/v1` automatically.
  - `VITE_API_TIMEOUT_MS` — request timeout in ms, default `15000`
- Defaults applied in `frontend/src/config/env.ts`: `apiBaseUrl = "http://localhost:8000"`, `apiTimeoutMs = 15000`

**Backend environment (planned, from former `backend/.env.example`):**
- `DATABASE_URL`, `DASHSCOPE_API_KEY`, `OSS_ENDPOINT`, `OSS_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

**Build configuration:**
- `frontend/tsconfig.json` — root project-references shell
- `frontend/tsconfig.app.json` — app code: ES2023 target, strict mode, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `react-jsx`, `moduleResolution: "Bundler"`
- `frontend/tsconfig.node.json` — applied to `vite.config.ts` only (ES2022 target, node types)
- `frontend/vite.config.ts` — single React plugin, no aliases or proxies configured
- `frontend/eslint.config.js` — flat config: TS recommended rules over `src/**/*.{ts,tsx}`; ignores `dist/`, `**/*.jsx`, `uploads/`, `screenshots/`
- No Prettier rc file — uses Prettier defaults

**Path aliases:**
- None configured. All imports use relative paths (e.g. `frontend/src/services/api/http.ts` imports `"../../config/env"`).

## Platform Requirements

**Development:**
- Node.js 18+ (frontend) — README "Prerequisites"
- Python 3.11+ with `uv` — README mentions, but backend is removed
- PostgreSQL — README mentions for backend (removed)

**Production (planned, per `MULTI-CLOUD-ARCHITECTURE.md`):**
- Frontend: AWS S3 + CloudFront, region `ap-southeast-1` (Singapore)
- Backend: Alibaba Cloud ECS, region `ap-southeast-3` (Malaysia)
- Database: Alibaba ApsaraDB PostgreSQL
- Cache: Alibaba Tair (Redis)
- No deployment manifests (Dockerfile, k8s, terraform) committed yet

## Project Structure (top-level)

```
gingergig/
├── frontend/                   # Implemented React app
│   ├── src/
│   │   ├── App.tsx             # Re-exports prototype shell
│   │   ├── main.tsx            # ReactDOM.createRoot mount
│   │   ├── config/env.ts       # Vite env wrapper
│   │   ├── services/api/       # Typed fetch client + endpoint modules
│   │   └── prototype/          # JSX prototype screens (mock data)
│   ├── docs/                   # API_READY_MIGRATION, DESIGN_NOTES, MULTI-CLOUD-ARCHITECTURE
│   ├── package.json            # React 19, Vite 8, TS 5.8
│   ├── vite.config.ts
│   ├── tsconfig.{json,app.json,node.json}
│   ├── eslint.config.js
│   └── .env.example
├── backend/                    # Empty (scaffolded then removed)
├── MULTI-CLOUD-ARCHITECTURE.md # Top-level (sibling to README)
└── README.md
```

## Notable Tech Decisions

- **Native fetch over a library** — `frontend/src/services/api/http.ts` handcrafts auth header injection, timeout via `AbortController`, and a typed `ApiError` thrown on non-2xx. No retry / cache layer.
- **Strict TypeScript** — `strict: true` plus `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax` in `frontend/tsconfig.app.json`.
- **JSX prototype excluded from TS** — `frontend/src/prototype/*.jsx` is deliberately JS so the demo can iterate fast; ESLint ignores `**/*.jsx`. The TS API client layer is the contract that will replace prototype mock data.
- **No backend present** — every backend reference in README, `MULTI-CLOUD-ARCHITECTURE.md`, and `frontend/docs/API_READY_MIGRATION.md` describes intended state. The frontend prototype is fully self-contained on mock data in `frontend/src/prototype/mock-data.js`.

---

*Stack analysis: 2026-04-25*
