---
status: resolved
trigger: "when i search kepong in the search services field in the requestor view, i'm suppose to get Mackcik Siti, but it gives me empty, is the search only searching the service name or it search all texts. It should be searching the information of each cards"
created: "2026-04-26"
updated: "2026-04-26"
---

# Debug Session: search-kepong-requestor-empty

## Symptoms

- expected_behavior: Searching `kepong` in the requestor search services field should return Mackcik Siti because search should cover the information shown in each card.
- actual_behavior: Searching `kepong` returns an empty result.
- error_messages: None reported.
- timeline: Not reported.
- reproduction: Open requestor view, use the search services field, enter `kepong`.

## Current Focus

- hypothesis: Confirmed. Requestor search was filtering only listing title and description, not provider/card fields like elder name or area.
- test: Trace frontend requestor search input through API helper and backend route query filters.
- expecting: Search predicate excludes location/provider/profile card fields where `kepong` appears.
- next_action: Done. Restarted backend with reload and verified direct API response.
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-26
  observation: `frontend/src/services/api/mock/requestor.mock.ts` searched mock provider `name`, `service`, `area`, and `serviceEn`.
- timestamp: 2026-04-26
  observation: `backend/app/routers/requestor.py` searched only localized listing title and `ListingModel.description`.
- timestamp: 2026-04-26
  observation: `backend/scripts/seed_data.py` stores Siti's location as `Kepong, Kuala Lumpur` on the elder/user row, so the old backend predicate could not match it.
- timestamp: 2026-04-26
  observation: Running backend process was started without `--reload` before the router edit, so it continued serving the old predicate until restarted.
- timestamp: 2026-04-26
  observation: After backend restart, direct API check for `query=kepong` returned 3 results, including two Makcik Siti listings and Ah Ma Chen in Kepong Baru.

## Eliminated

- hypothesis: Frontend requestor field fails to pass the query.
  reason: `RequestorSearch` calls `api.requestor.searchListings({ query: q || undefined })`, and the endpoint helper sends `query` to `/requestor/listings/search`.

## Resolution

- root_cause: Live backend search was narrower than the original mock search and did not include provider/card fields such as elder name or elder area.
- fix: Expanded requestor search to include localized title variants, description, match reason, elder name, elder area, distance label, price fields, price unit, and menu item names.
- verification: `uv run ruff check app/routers/requestor.py tests/test_persona_requestor.py` passed. Direct API check against `127.0.0.1:8001` returned 3 `kepong` matches after backend restart. Initial `uv run pytest tests/test_persona_requestor.py -q` was blocked because no `TEST_DATABASE_URL` or `DATABASE_URL` was set in that shell.
- files_changed: `backend/app/routers/requestor.py`, `backend/tests/test_persona_requestor.py`
