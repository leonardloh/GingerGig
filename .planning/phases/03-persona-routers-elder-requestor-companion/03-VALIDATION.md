---
phase: 03
slug: persona-routers-elder-requestor-companion
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-26
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio + httpx ASGITransport |
| **Config file** | `backend/pyproject.toml` |
| **Quick run command** | `cd backend && uv run pytest tests -q` |
| **Full suite command** | `cd backend && uv run pytest tests -q` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && uv run pytest tests -q`
- **After every plan wave:** Run `cd backend && uv run pytest tests -q`
- **Before `/gsd-verify-work`:** Full backend suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-W0-01 | 01 | 0 | ELDER-01..05 | T-03-01 | Authenticated elder endpoint tests use real bearer headers | integration | `cd backend && uv run pytest tests/test_persona_elder.py -q` | no | pending |
| 03-W0-02 | 01 | 0 | REQ-01..05 | T-03-02 | Requestor search returns seeded `matchScore`/`matchReason` without live Qwen and bookings preserve snapshots | integration/static | `cd backend && uv run pytest tests/test_persona_requestor.py -q` | no | pending |
| 03-W0-03 | 01 | 0 | COMP-01..04 | T-03-03 | Companion dashboard, alerts, timeline, and preferences preserve seeded demo contracts | integration | `cd backend && uv run pytest tests/test_persona_companion.py -q` | no | pending |
| 03-W0-04 | 01 | 0 | ELDER-01, REQ-03, COMP-02, COMP-03, COMP-04 | T-03-04 | Locale fields are SQL-projected with English fallback; authz rejects missing tokens, role mismatches, and cross-user access | unit/integration | `cd backend && uv run pytest tests/test_persona_locale_and_authz.py -q` | no | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_persona_elder.py` — elder endpoint contract tests for listings, listing updates, bookings, booking responses, and earnings.
- [ ] `backend/tests/test_persona_requestor.py` — requestor endpoint contract tests for search, listing detail, booking creation, and booking history.
- [ ] `backend/tests/test_persona_companion.py` — companion endpoint contract tests for dashboard, alerts, timeline, and preferences.
- [ ] `backend/tests/test_persona_locale_and_authz.py` — cross-route locale fallback, SQL projection, missing-token, role, and ownership authorization tests.
- [ ] Auth helper in tests logs in through `/api/v1/auth/login` for Siti, Amir, and Faiz; tests should not bypass auth dependencies for route coverage.
- [ ] Tests reference deterministic IDs through `app.core.ids.entity_id`.
- [ ] Tests assert rejected requests return ApiError-compatible bodies with `status` and `message`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Demo flow across persona screens after frontend wiring | ELDER-01..05, REQ-01..05, COMP-01..04 | Phase 7 wires the frontend; Phase 3 can only validate API responses | After Phase 7, login as Siti/Amir/Faiz and verify persona screens render seeded data from the backend. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
