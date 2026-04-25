---
phase: 03
status: issues_found
files_reviewed: 15
findings:
  critical: 0
  warning: 3
  info: 0
  total: 3
---

# Phase 03 Code Review

## Summary

Reviewed the Phase 03 persona router source, schemas, migration, seed updates, and contract tests at standard depth. Authorization and locale projection are generally implemented with the expected role/link checks and SQL-level `coalesce` fallback, and no forbidden live AI/cache runtime integrations were found in the Phase 3 router/helper surface.

Three warning-level issues remain: companion dashboard response contract drift, requestor booking snapshot mutation in responses, and an uncaught invalid UUID path during booking creation.

## Findings

### WR-01 - Companion dashboard schema/OpenAPI contract does not match runtime JSON

Severity: warning

Files:
- `backend/app/schemas/persona.py`
- `backend/app/routers/companion.py`

`CompanionDashboard.weeklyEarnings` is typed as an `EarningsSummary`, and the route decorator advertises `response_model=CompanionDashboard`, but `get_companion_dashboard()` returns a raw `JSONResponse` where `weeklyEarnings` is a float. Returning `JSONResponse` bypasses FastAPI response-model validation, so tests pass while the OpenAPI schema and typed API contract describe a different shape than clients receive.

This is contract drift on a camelCase DTO and can break generated clients or frontend code that trusts the `CompanionDashboard` type. Fix by making the backend schema match the intended numeric contract, or return the nested `EarningsSummary` shape consistently.

### WR-02 - Requestor booking history overwrites denormalized booking snapshots

Severity: warning

Files:
- `backend/app/routers/requestor.py`
- `backend/app/services/persona_queries.py`

`get_requestor_bookings()` filters by `Booking.requestor_user_id`, then mutates the mapped response to replace `requestorName`, `requestorInitials`, and `requestorAvatarUrl` with the current `User` record. That defeats the project invariant that booking rows snapshot requestor display fields so they survive later user edits.

The seeded data inconsistency should be handled in seed/test data, not by changing historical booking response semantics for every requestor booking. Return `booking_to_response(booking)` directly so requestor history uses the denormalized row fields just like elder booking views.

### WR-03 - Invalid booking listingId can raise an uncaught ValueError and return 500

Severity: warning

Files:
- `backend/app/routers/requestor.py`
- `backend/app/schemas/persona.py`

`CreateBookingPayload.listingId` is declared as `str`, and `create_booking()` calls `UUID(payload.listingId)` inside the SQLAlchemy filter. A syntactically invalid UUID is not converted into the standard FastAPI validation envelope; it raises `ValueError`, reaches the global unhandled exception path, logs a server error, and returns a 500.

Use a `UUID` field in `CreateBookingPayload` or catch `ValueError` and return a 422/404 API error. This keeps malformed client input from looking like a server fault.
