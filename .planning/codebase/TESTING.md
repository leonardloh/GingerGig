# Testing Patterns

**Analysis Date:** 2026-04-25

## Test Framework

**No test framework configured yet.**

Findings:
- `frontend/package.json` declares no `test` script. The full script list is: `dev`, `build`, `typecheck`, `preview`, `lint`, `format`, `format:check`.
- No test runner is present in `dependencies` or `devDependencies` (no `vitest`, `jest`, `@testing-library/*`, `playwright`, or `cypress`).
- No test config files exist: searched for `vitest.config.*`, `jest.config.*`, `playwright.config.*`, `cypress.config.*` — none present at `frontend/`.
- No test files exist in the repository: `find frontend -name "*.test.*" -o -name "*.spec.*"` returns zero matches under `frontend/src/` or `frontend/tests/`.
- No `frontend/tests/`, `frontend/__tests__/`, or `frontend/e2e/` directory exists.
- No `setupTests.ts` / `test-setup.ts` file exists.

The closest thing to runtime verification today is `npm run typecheck` (`tsc -b`), which is gated by the strict TS config in `frontend/tsconfig.app.json`. That is type-checking, not testing.

## Recommended Setup (not yet adopted)

When tests are introduced, **Vitest is the conventional choice for this stack** because:
- The project already runs on Vite 8 (`frontend/vite.config.ts`) — Vitest reuses the same config, transformers, and module graph, so there is nothing extra to wire up for ESM/TSX.
- Vitest's API is Jest-compatible (`describe` / `it` / `expect` / `vi.mock`), which keeps the learning curve flat.
- Native ESM + TypeScript support without Babel.

Suggested initial install:

```bash
npm i -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Suggested `frontend/package.json` script additions:

```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

Suggested `frontend/vite.config.ts` extension (Vitest reads from the same file):

```ts
/// <reference types="vitest" />
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
});
```

These are recommendations only — none of this code exists in the repository today.

## Test File Organization (proposed)

**Location:** Co-locate tests next to the unit under test. This matches the flat module layout already used in `frontend/src/services/api/`.

**Naming:**
- Unit/integration: `<filename>.test.ts` / `<filename>.test.tsx`
- E2E (if added later via Playwright): `<feature>.spec.ts` under `frontend/e2e/`

**Proposed structure:**
```
frontend/src/
├── services/api/
│   ├── http.ts
│   ├── http.test.ts                ← test the HTTP client (mock fetch)
│   ├── endpoints/
│   │   ├── auth.ts
│   │   ├── auth.test.ts            ← test register/login token storage
│   │   ├── kyc.ts
│   │   └── kyc.test.ts             ← test pollStatus + waitForVerification
│   └── ...
├── config/
│   ├── env.ts
│   └── env.test.ts                 ← test parseTimeout edge cases
└── test-setup.ts                   ← @testing-library/jest-dom matchers, MSW server
```

## Test Structure (proposed pattern)

When writing the first test, this shape is consistent with the project's existing JSDoc-heavy, declarative style:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest, setApiAccessToken } from "./http";

describe("apiRequest", () => {
  beforeEach(() => {
    setApiAccessToken(null);
    vi.restoreAllMocks();
  });

  it("attaches the bearer token when one is set", async () => {
    setApiAccessToken("test-token");
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 })
    );

    await apiRequest("/auth/me");

    const headers = (fetchMock.mock.calls[0]![1]!.headers as Headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("throws an ApiError with status 408 on timeout", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new DOMException("aborted", "AbortError")), 5)
      )
    );

    await expect(apiRequest("/slow", { timeoutMs: 1 })).rejects.toMatchObject({
      status: 408,
      message: "Request timed out",
    });
  });
});
```

**Patterns to enforce when tests land:**
- One `describe` per exported symbol; `it` describes a single behaviour ("does X when Y").
- Reset module-level state (e.g. `accessToken` in `frontend/src/services/api/http.ts`) in `beforeEach` — this module holds private mutable state and tests will pollute each other otherwise.
- Prefer `expect(promise).rejects.toMatchObject({...})` over `try/catch` for thrown errors.

## Mocking (proposed)

**Framework:** `vi.mock` / `vi.spyOn` from Vitest.

**HTTP layer:**
- For `apiRequest` itself: mock `global.fetch` directly with `vi.spyOn(global, "fetch")` and return a `new Response(JSON.stringify(body), { status })`.
- For endpoint modules (e.g. `frontend/src/services/api/endpoints/auth.ts`): mock `apiRequest` from `../http` using `vi.mock("../http", () => ({ apiRequest: vi.fn(), setApiAccessToken: vi.fn() }))`. This isolates the endpoint logic (URL composition, payload shape, token-side-effects) from network concerns.
- For higher-level integration tests, consider Mock Service Worker (`msw`) to intercept fetch at the network layer without changing application code.

**Timers:**
- `waitForVerification` in `frontend/src/services/api/endpoints/kyc.ts` uses `setTimeout` for its 2.5-second polling interval. Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)` to test it without real waits.

**What to Mock:**
- `fetch` (network)
- `setTimeout` / timers (when testing polling or timeouts)
- The HTTP client (`apiRequest`) when testing endpoint wrappers

**What NOT to Mock:**
- Pure helpers like `parseTimeout` in `frontend/src/config/env.ts` — test them directly with input/output assertions.
- Type-only constructs (interfaces, unions). Nothing to mock.
- The actual S3 endpoint in `uploadDocument` integration tests — use MSW instead so the same code path runs.

## Fixtures and Factories (proposed)

The shared `interface` definitions in `frontend/src/services/api/types.ts` (`Listing`, `Booking`, `UserProfile`, `KycVerificationResult`, etc.) are the natural anchors for fixture builders. Suggested location: `frontend/src/services/api/__fixtures__/` co-located with `types.ts`.

Builder pattern recommendation:

```ts
// frontend/src/services/api/__fixtures__/booking.ts
import type { Booking } from "../types";

export const aBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: "bk_test",
  listingId: "ls_test",
  requestorName: "Test Requestor",
  status: "pending",
  amount: 100,
  scheduledAt: "2026-05-01T10:00:00Z",
  ...overrides,
});
```

## Coverage

**Requirements:** None enforced (no test runner installed).

**Recommended target once Vitest is wired up:** 80% lines / 80% branches on `frontend/src/services/api/**` and `frontend/src/config/**` (the type-safe, framework-agnostic core). UI components in `frontend/src/prototype/` should be excluded from coverage until they are migrated to TypeScript.

**View coverage (after install):**
```bash
npm run test:coverage
```

## Test Types

**Unit Tests:** Not present.
- Highest-value first targets (in priority order):
  1. `frontend/src/services/api/http.ts` — token attachment, content-type defaulting, 204 handling, timeout/AbortError translation, ApiError shape.
  2. `frontend/src/config/env.ts` — `parseTimeout` for missing / non-numeric / zero / negative inputs.
  3. `frontend/src/services/api/endpoints/kyc.ts` — `waitForVerification` terminal-state detection, MAX_POLLS timeout, `onProgress` callback firing.
  4. `frontend/src/services/api/endpoints/auth.ts` — token storage side-effects of `register`/`login` and clearing on `logout`.

**Integration Tests:** Not present. MSW is the recommended approach when tests are added — it lets the real `apiRequest` code path run against a fake backend.

**E2E Tests:** Not present. Playwright is the conventional Vite-era choice if and when full-flow tests are needed.

## Common Patterns (when tests are added)

**Async Testing:**
```ts
// Always return / await the assertion promise
await expect(login({ email, password })).resolves.toMatchObject({
  tokenType: "bearer",
});
```

**Error Testing:**
```ts
// ApiError is a thrown plain object, not an Error instance
await expect(apiRequest("/missing")).rejects.toMatchObject({
  status: 404,
});
```

**Polling / Timer Testing:**
```ts
vi.useFakeTimers();
const promise = waitForVerification("job_123");
await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
const result = await promise;
expect(result.status).toBe("approved");
```

---

*Testing analysis: 2026-04-25*
