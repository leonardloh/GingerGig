---
status: resolved
trigger: "The search is not working, i can't click in and search (for both requestor and provider). Please confirm and verify"
created: "2026-04-26"
updated: "2026-04-26"
---

# Debug Session: search-not-clickable

## Symptoms

- expected_behavior: The Search tab should provide a clickable field where buyer-mode users can type a query, submit it, see matching providers, and open provider details.
- actual_behavior: The Search tab rendered only a static query display, so there was no input to focus or type into. This affected requestor and provider/finding buyer flows because both share the same buyer search screen.
- error_messages: None in browser console.
- timeline: Reported during local verification.
- reproduction: Log in as Amir, click the Search tab, try to type into the search bar. Repeat by logging in as Siti, switching to Finding mode, and clicking the Search tab.

## Current Focus

- hypothesis: Confirmed. `RequestorSearch` displayed the query as text instead of rendering an editable input.
- test: Browser verification with Playwright against a mock-backed Vite server.
- expecting: Search tab should expose one editable search input, submit `kepong`, render matches, and allow opening a provider detail page.
- next_action: Done.
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-26
  observation: Before the fix, Playwright found `searchTabInputs: 0` for `requestor-Amir` after clicking the Search tab.
- timestamp: 2026-04-26
  observation: Before the fix, Playwright found `searchTabInputs: 0` for `provider-Siti-finding-mode` after clicking the Search tab.
- timestamp: 2026-04-26
  observation: `RequestorSearch` rendered `"{q}"` inside a `div`, not an editable search control.
- timestamp: 2026-04-26
  observation: The running `5173` frontend was pointed at `http://localhost:8000` and demo login was blocked by CORS, so UI reproduction used a separate mock-backed local server.
- timestamp: 2026-04-26
  observation: After the fix, both requestor and provider/finding flows accepted `kepong`, showed `2 matches found`, and opened Makcik Siti's provider detail without console errors.

## Eliminated

- hypothesis: Home search input itself is not focusable.
  reason: Playwright confirmed the Home search input could be clicked and filled before the fix.
- hypothesis: Provider detail click is broken after searching.
  reason: After searching, clicking Makcik Siti opened the detail page in both verified flows.

## Resolution

- root_cause: The shared buyer Search tab used the results screen directly, and that results screen rendered a static search summary instead of an editable input.
- fix: Made `RequestorSearch` maintain an editable draft query, submit it via the existing buyer search state, and pass the submit handler from the shared app shell.
- verification: `npm run build` passed. Playwright verified requestor and provider/finding search tab typing, submitting, results, and provider detail opening on `127.0.0.1:5176`.
- files_changed: `frontend/src/prototype/requestor-screens.jsx`, `frontend/src/prototype/PrototypeApp.jsx`
