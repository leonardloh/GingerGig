---
status: partial
phase: 02-auth-bearer-middleware
source: [02-VERIFICATION.md]
started: 2026-04-25T16:21:24Z
updated: 2026-04-25T16:21:24Z
---

# Phase 02 Human UAT

## Current Test

awaiting human testing

## Tests

### 1. Run DB-backed auth test suite
expected: With a migrated Postgres database configured through `TEST_DATABASE_URL` or `DATABASE_URL`, `uv run pytest tests/test_auth_demo.py tests/test_auth_dependencies.py -q` and `uv run pytest -q` pass from `backend/`.
result: pending

### 2. Smoke test seeded demo login and `/auth/me`
expected: `siti@gingergig.my`, `amir@gingergig.my`, and `faiz@gingergig.my` each receive a bearer token from `POST /api/v1/auth/login`, and each token works against `GET /api/v1/auth/me`.
result: pending

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
