# Coding Conventions

**Analysis Date:** 2026-04-25

> Scope: frontend plus the newly scaffolded FastAPI backend. Frontend rules are encoded in `frontend/eslint.config.js` and TypeScript strict settings; backend rules are encoded in `backend/pyproject.toml` (`ruff`, `mypy`, `pytest`).

## Naming Patterns

**Files:**
- TypeScript source files: lowercase, kebab-friendly single words — `http.ts`, `types.ts`, `index.ts`, `env.ts`, `auth.ts`, `elder.ts`, `requestor.ts`, `companion.ts`, `kyc.ts`
- React component files (TS): PascalCase + `.tsx` — entry component referenced as `App` from `frontend/src/App.tsx`
- Legacy prototype components (JSX, kebab-case): `frontend/src/prototype/elder-screens.jsx`, `frontend/src/prototype/companion-screens.jsx`, `frontend/src/prototype/requestor-screens.jsx` (excluded from TS / lint via `tsconfig.app.json` include and `eslint.config.js` ignores)
- Type declaration files: `*.d.ts` — `frontend/src/jsx-modules.d.ts`
- Config files: lowercase with dotted scope — `vite.config.ts`, `eslint.config.js`, `tsconfig.app.json`
- Backend Python files: snake_case modules under feature folders — `models/user.py`, `models/companion_link.py`, `routers/requestor.py`, `core/config.py`

**Functions:**
- camelCase, verb-first — `apiRequest`, `setApiAccessToken`, `parseError`, `parseTimeout`, `register`, `login`, `logout`, `getMe`, `searchListings`, `createBooking`, `getElderListings`, `respondToBooking`, `initiateSession`, `uploadDocument`, `startVerification`, `pollStatus`, `waitForVerification`, `retryKyc`
- Boolean-returning props/flags: positive form, no `is`/`has` prefix in the data model itself — `isActive` on `Listing` is the only example; payload booleans use noun-based names (`halalOnly`, `openNow`)

**Variables:**
- camelCase locals — `accessToken`, `controller`, `timeoutMs`, `headers`, `response`, `detail`
- Module-private mutable state: plain `let` with camelCase — `let accessToken: string | null = null;` in `frontend/src/services/api/http.ts`
- Module-level constants: `SCREAMING_SNAKE_CASE` — `DEFAULT_API_BASE_URL`, `DEFAULT_TIMEOUT_MS`, `API_PREFIX`, `POLL_INTERVAL_MS`, `MAX_POLLS`, `TERMINAL_STATUSES`

**Types:**
- PascalCase for interfaces and type aliases — `ApiError`, `RequestOptions`, `Session`, `UserProfile`, `Listing`, `Booking`, `EarningsSummary`, `CompanionDashboard`, `CompanionAlert`, `RegisterPayload`, `RegisterResponse`, `LoginPayload`, `KycStatus`, `KycDocumentSide`, `KycUploadUrls`, `ExtractedIdData`, `FaceMatchResult`, `KycVerificationResult`, `SearchListingsParams`, `AlertPreferences`, `StartVerificationPayload`, `StartVerificationResponse`, `UserRole`, `Locale`
- Prefer `interface` for object shapes that may be extended (e.g. `RequestOptions extends RequestInit`); use `type` for unions, primitives, and literal sets (`KycStatus`, `UserRole`, `Locale`, `KycDocumentSide`)
- String literal unions over enums — see `KycStatus = "not_started" | "pending" | "approved" | "failed" | "manual_review"` in `frontend/src/services/api/types.ts`
- Backend constrained values use Python `StrEnum` mirrors in `backend/app/core/enums.py` plus database `String` columns with explicit `CheckConstraint`s; do not use native Postgres ENUM types.

**Backend SQLAlchemy models:**
- Use SQLAlchemy 2 declarative style: `class Model(Base, TimestampMixin)`, `Mapped[T]`, and `mapped_column`.
- Every table inherits `TimestampMixin` so `created_at` and `updated_at` are present.
- Surrogate primary keys are `id UUID` except planned composite-PK pair tables such as `companion_links` and `companion_alert_preferences`.
- Re-export models from `backend/app/models/__init__.py` so importing `app.models` registers tables on `Base.metadata` for Alembic.

## Code Style

**Formatting:**
- Tool: Prettier 3.6.2 (`devDependencies` in `frontend/package.json`)
- No `.prettierrc` file present — Prettier defaults are in force:
  - 2-space indent
  - Double quotes for strings (matches existing source)
  - Semicolons required
  - Trailing commas: `"all"` (default in Prettier 3) — confirmed by `} satisfies ApiError;` style and multi-line arg lists
  - Print width: 80 characters
- Run with `npm run format` (write) or `npm run format:check` (CI verification) — defined in `frontend/package.json`

**Linting:**
- Tool: ESLint 9 (flat config) at `frontend/eslint.config.js`
- Stack:
  - `@eslint/js` recommended rules
  - `typescript-eslint` recommended rules (applied only to `src/**/*.{ts,tsx}`)
- Scope: `src/**/*.{ts,tsx}` — JSX/JS files in `frontend/src/prototype/` are excluded (`**/*.jsx` in `ignores`)
- Other ignores: `dist/**`, `uploads/**`, `screenshots/**`
- Browser globals enabled via `globals.browser`
- Run with `npm run lint`

**TypeScript Strictness (`frontend/tsconfig.app.json`):**
- `"strict": true` — full strict mode (implies `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.)
- `"noUnusedLocals": true` — unused locals are compile errors
- `"noUnusedParameters": true` — unused parameters are compile errors (prefix with `_` to opt out)
- `"noFallthroughCasesInSwitch": true`
- `"verbatimModuleSyntax": true` — requires explicit `import type` for type-only imports (see `frontend/src/services/api/endpoints/auth.ts` line 2)
- `"moduleDetection": "force"` — every file is a module
- `"allowImportingTsExtensions": true` — `.ts` extensions permitted in imports
- `"jsx": "react-jsx"` — no React import needed for JSX
- Target: `ES2023`, module: `ESNext`, moduleResolution: `Bundler`
- `npm run typecheck` runs `tsc -b` against the project references

## Import Organization

**Order (observed in `frontend/src/services/api/endpoints/*.ts`):**
1. Same-package value imports — `import { apiRequest } from "../http";`
2. Same-package type imports — `import type { Booking, Listing } from "../types";`
3. Sibling/relative imports last
- React imports come first when present (`frontend/src/main.tsx`)
- Type-only imports MUST use `import type` (enforced by `verbatimModuleSyntax: true`) — example: `import type { ApiError } from "./types";` in `frontend/src/services/api/http.ts`

**Path Aliases:**
- None configured. All imports are relative (`./`, `../`, `../../`).

## Error Handling

**Patterns observed in `frontend/src/services/api/http.ts`:**
- Throw a typed object literal conforming to `ApiError` for non-2xx HTTP responses; use `satisfies ApiError` to validate the shape without widening:
  ```ts
  throw {
    status: 408,
    message: "Request timed out",
    detail: undefined,
  } satisfies ApiError;
  ```
- `ApiError` shape (`frontend/src/services/api/types.ts`): `{ status: number; message: string; detail?: unknown }`
- Defensive JSON parsing with `try/catch` returning `undefined` for empty/invalid bodies (see `parseError` in `http.ts`)
- Distinguish `AbortError` (timeout) from other errors using `instanceof DOMException && err.name === "AbortError"`
- `try/finally` always clears timers — never leak `setTimeout` handles
- For non-API failures (e.g. direct S3 upload), throw a plain `new Error(...)` with a descriptive message — see `uploadDocument` in `frontend/src/services/api/endpoints/kyc.ts`
- Document thrown errors in JSDoc with `@throws {ApiError} <status> <reason>` — see `respondToBooking` in `frontend/src/services/api/endpoints/elder.ts`

**Async patterns:**
- Endpoint functions usually return the bare `apiRequest<T>(...)` promise without `await` — only `await` when post-processing is needed (e.g. `register`/`login` which then call `setApiAccessToken`)
- Polling loops use `for` + `await new Promise(resolve => setTimeout(resolve, ...))`, not recursion — see `waitForVerification` in `frontend/src/services/api/endpoints/kyc.ts`

## Logging

**Framework:** None. No `console.log` / `console.error` usage in `src/`. No third-party logger.

**Patterns:**
- Errors propagate as thrown `ApiError` objects; UI is expected to surface them. Do not add `console.error` in service code — let callers decide.
- If logging is added later, prefer a single thin wrapper rather than scattering `console.*` calls.

## Comments

**When to Comment:**
- Every exported function in `frontend/src/services/api/**` carries a JSDoc block. The pattern is:
  1. First line: HTTP method + path (e.g. `POST /api/v1/auth/login`)
  2. Blank line
  3. Behavioural description, including side effects (e.g. "stores the returned access token in the shared HTTP client")
  4. `@param` for non-obvious parameters
  5. `@returns` describing the resolved value
  6. `@throws {ApiError}` lines for each documented status code
- Module-level explainers for non-trivial flows live at the top of the file — see the KYC pipeline overview in `frontend/src/services/api/endpoints/kyc.ts` (lines 1-17)
- Section dividers with box-drawing characters group related declarations:
  ```ts
  // ─── Step 1: Initiate KYC session ─────────────────────────────────────────
  ```
- Inline `//` comments annotate fields whose meaning is not obvious from the type — e.g. `icNumber: string;          // e.g. "950101-14-1234"`

**JSDoc/TSDoc:**
- Use `/** ... */` for any exported symbol (function, interface, const, field). Field-level JSDoc on interfaces is encouraged (see `RequestOptions.timeoutMs`, every field on `AlertPreferences`).
- Single-line JSDoc is acceptable for short descriptions — see `getElderEarnings`.

## Function Design

**Size:**
- Functions stay short — most endpoint wrappers are 1-5 lines. The largest function in the codebase, `apiRequest`, is ~45 lines (`frontend/src/services/api/http.ts`) and that is treated as the upper bound.
- Extract helpers when a function exceeds ~30 lines (see `parseError`, `parseTimeout`).

**Parameters:**
- Up to two positional parameters; group anything beyond that into a typed payload object — e.g. `searchListings(params: SearchListingsParams)`, `createBooking(payload: { listingId; scheduledAt; notes? })`, `respondToBooking(bookingId, action)`.
- Define a named `interface` for the payload when it is reused or has more than 2 fields (`LoginPayload`, `RegisterPayload`, `SearchListingsParams`, `AlertPreferences`).
- Use optional fields (`?:`) over `| undefined` in interface definitions.

**Return Values:**
- Always typed explicitly via the `apiRequest<T>` generic; never rely on inference for endpoint responses.
- `void` for fire-and-forget mutations (e.g. `updateCompanionAlertPreferences` returns `Promise<void>`).
- Return the original or updated entity for create/update endpoints (`createBooking`, `updateListing`, `respondToBooking`).

## Module Design

**Exports:**
- Named exports only (`export function …`, `export const …`, `export interface …`). The only `export default` is `frontend/src/App.tsx`, which re-exports the prototype root component.
- `setApiAccessToken` is exported from `http.ts` as the single point of mutation for the in-module `accessToken` variable. Do not mutate from outside.

**Barrel Files:**
- `frontend/src/services/api/index.ts` is a flat barrel that re-exports every endpoint module and `types`/`http`. Consumers should import from `…/services/api` rather than reaching into `endpoints/*` directly.
- Endpoint files do **not** re-export each other — only the top-level `index.ts` does.

**Module Boundaries:**
- `config/env.ts` is the single source of truth for environment variables. Other modules read `env.apiBaseUrl` / `env.apiTimeoutMs` rather than `import.meta.env` directly.
- `services/api/http.ts` is the only file that calls `fetch` for backend endpoints. The one exception is `uploadDocument` in `endpoints/kyc.ts`, which deliberately bypasses the HTTP client because S3 presigned URLs must not receive the Bearer token.

## Files Outside Convention

The `frontend/src/prototype/` directory contains JSX files (`PrototypeApp.jsx`, `*-screens.jsx`, `mock-data.js`, `i18n.js`) that pre-date the TypeScript migration. They are:
- Excluded from TypeScript via `tsconfig.app.json` (`"include": ["src"]` but JSX modules are typed via the `frontend/src/jsx-modules.d.ts` ambient declaration)
- Excluded from ESLint via `**/*.jsx` in the `ignores` array of `frontend/eslint.config.js`
- Imported through the ambient module declaration as `ComponentType` defaults — see `frontend/src/jsx-modules.d.ts`

New code MUST be written in TypeScript (`.ts` / `.tsx`). Treat the prototype directory as a temporary fixture; do not extend it.

---

*Convention analysis: 2026-04-25*
