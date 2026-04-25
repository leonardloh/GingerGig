---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
last_updated: "2026-04-25T16:09:26.323Z"
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
  percent: 88
---

# GingerGig backend v1 — Project State

**Last updated:** 2026-04-25 (Phase 01 complete)

## Project Reference

**Name:** GingerGig backend v1 (replace-mocks-with-DB milestone)
**Core value:** The frontend continues to work exactly as today — every screen, every persona, every i18n string — but every piece of "data" loads from the database via the existing typed API client. No feature is added, removed, or visually changed.
**Granularity:** Standard (8 phases derived from 7-phase research suggestion + explicit cache/deploy split)
**Workflow mode:** YOLO (auto-advance enabled, plan_check + verifier + nyquist_validation on)

## Current Position

**Phase:** 02 of 8 (auth bearer middleware)
**Plan:** Not started
**Status:** Ready to plan
**Progress:** 1/8 phases complete

```
[██░░░░░░░░░░░░░░░░░░] 12% (Phase 1 of 8)
```

## Phase Pipeline

| # | Phase | Status | Depends on |
|---|-------|--------|------------|
| 1 | Backend Scaffold + Schema + Seed | Complete | — |
| 2 | Auth + Bearer Middleware | Not started | 1 |
| 3 | Persona Routers (Elder + Requestor + Companion) | Not started | 2 |
| 4 | eKYC Pipeline | Not started | 2 |
| 5 | Voice-to-Profile Pipeline | Not started | 2 |
| 6 | Tair Cache Layer | Not started | 3, 4 |
| 7 | Frontend Wiring + Type Extensions | Not started | 3, 4, 5 |
| 8 | Multi-Cloud Live Deployment | Not started | 7 |

## Performance Metrics

- **Plans complete:** 7
- **Verifications passed:** 1
- **Phases shipped:** 1
- **Phases inserted (decimal):** 0
- **Latest phase metric:** Phase 01 — 7 plans, 15 backend tests passed

## Accumulated Context

### Key Decisions (carried from PROJECT.md at init)

| Decision | Locked? | Notes |
|----------|---------|-------|
| FastAPI + `uv` + Python ≥3.12 + async SQLAlchemy 2 + asyncpg | Yes | Explicit user requirement |
| Re-scaffold backend (don't restore commit `3de5f53`) | Yes | Cleaner foundation |
| Live multi-cloud deployment (real AWS + Alibaba) | Yes | Hackathon judging criterion |
| Real AI features (Transcribe + Qwen + Textract + Rekognition) | Yes | "Both, real" picked |
| Real auth, seed `DEMO_ACCOUNTS` with bcrypt | Yes | Quick-login UX preserved |
| Postgres as system-of-record (NOT DynamoDB) | Yes | `kyc.ts` JSDoc reference is stale |
| `amazon-transcribe>=0.6.4` for streaming (NOT boto3) | Yes | boto3 has zero streaming support |
| Textract `AnalyzeDocument` + regex for MyKad (NOT `AnalyzeID`) | Yes | `AnalyzeID` is US-document-only |
| `bcrypt>=4.2.0,<5.0.0` used directly (no `passlib`) | Yes | bcrypt 5.0 silently breaks passlib |
| Centralised JWT decode in `core/security.py` with `algorithms=["HS256"]` | Yes | CVE-2022-29217 / CVE-2024-33663 |
| WebSocket `try/finally` + 90s max-session timer | Yes | Quota exhaustion risk during demo |
| Companion alerts: 4 locale columns, server picks by user locale | Yes | Matches existing `text_en/ms/zh/ta` shape |
| Additive type extensions in `types.ts` (no rename/remove) | Yes | Prototype already renders the missing fields |
| Tair as read-through cache only (NOT job queue) | Yes | Per `MULTI-CLOUD-ARCHITECTURE.md` |
| Browser-direct S3 uploads via presigned PUT | Yes | PII off application logs |
| KYC orchestrator = FastAPI background task (NOT Lambda) for v1 | Yes | Hackathon simplicity |
| 01-01 backend skeleton only | Yes | `app.main`, routers, models, migrations, and seed stay in later Phase 01 plans |
| `app.*` backend package layout | Yes | Old flat scaffold removed rather than restored |
| 01-02 FastAPI route shell | Yes | `/health` is unprefixed; all feature stubs mount under `/api/v1`; `/__test__/boom` exercises sanitized 500 envelopes |
| 01-03 SQLAlchemy schema models | Yes | `app.models` registers exactly 11 tables; enum-like values are `String` plus CHECK constraints; companion pair tables use composite PKs |
| 01-05 seed verification target | Yes | `gingergig_test` was absent, so live seed idempotency was verified against the migrated configured database with process-local asyncpg/no-SSL overrides |
| 01-06 test harness target | Yes | Test fixtures prefer `TEST_DATABASE_URL` but fall back to normalized `DATABASE_URL` per user approval; guardrail tests enforce forbidden deps/imports, no wildcard CORS, and no `Base.metadata.create_all` |

### Open Decisions (to resolve at phase start)

| Decision | Surface in phase | Notes |
|----------|------------------|-------|
| KYC similarity / confidence thresholds | Phase 4 | Defaults (sim≥80 approved, ≥70 manual_review) need real-data tuning; document chosen values in PROJECT.md after phase 4 |
| DashScope strict JSON-schema mode availability on chosen Qwen model | Phase 5 | Validate during planning; fall back to `json_object` + Pydantic if strict mode unavailable on `qwen-max` |
| AudioWorklet 16kHz PCM Int16 conversion (Safari fallback) | Phase 7 | Frontend wiring concern; `SpeechRecognition` fallback retained for browsers without `AudioWorklet` |

### Active Todos

- (None — populated by planner as phases progress)

### Blockers

- None for 01-06. `gingergig_test` is still absent on the configured Postgres server, but the test harness now supports the approved `DATABASE_URL` fallback.

## Session Continuity

**Last session ended:** 2026-04-25 — completed `01-06-PLAN.md`
**Next action:** Execute `01-07-PLAN.md` only when requested; do not auto-run it from the 01-06 executor context

**Resume context for next session:**

- Read `.planning/ROADMAP.md` for the 8-phase structure
- Read `.planning/REQUIREMENTS.md` for the 73 v1 requirements with traceability
- Read `.planning/research/SUMMARY.md` + `ARCHITECTURE.md` + `PITFALLS.md` for the cross-cutting design corrections
- Backend `backend/` directory was wiped on the `backend` branch — re-scaffold cleanly (do not restore commit `3de5f53`)

---
*State initialised: 2026-04-25 after roadmap creation*

**Planned Phase:** 02 (Auth + Bearer Middleware) — 1 plans — 2026-04-25T16:09:26.319Z
