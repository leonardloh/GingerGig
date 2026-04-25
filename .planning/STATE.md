# GingerGig backend v1 — Project State

**Last updated:** 2026-04-25 (initial state)

## Project Reference

**Name:** GingerGig backend v1 (replace-mocks-with-DB milestone)
**Core value:** The frontend continues to work exactly as today — every screen, every persona, every i18n string — but every piece of "data" loads from the database via the existing typed API client. No feature is added, removed, or visually changed.
**Granularity:** Standard (8 phases derived from 7-phase research suggestion + explicit cache/deploy split)
**Workflow mode:** YOLO (auto-advance enabled, plan_check + verifier + nyquist_validation on)

## Current Position

**Phase:** 1 of 8 — Backend Scaffold + Schema + Seed
**Plan:** None yet (planning has not begun)
**Status:** Roadmap defined, awaiting `/gsd-plan-phase 1`
**Progress:** 0/8 phases complete

```
[░░░░░░░░░░░░░░░░░░░░] 0% (Phase 0 of 8)
```

## Phase Pipeline

| # | Phase | Status | Depends on |
|---|-------|--------|------------|
| 1 | Backend Scaffold + Schema + Seed | Not started | — |
| 2 | Auth + Bearer Middleware | Not started | 1 |
| 3 | Persona Routers (Elder + Requestor + Companion) | Not started | 2 |
| 4 | eKYC Pipeline | Not started | 2 |
| 5 | Voice-to-Profile Pipeline | Not started | 2 |
| 6 | Tair Cache Layer | Not started | 3, 4 |
| 7 | Frontend Wiring + Type Extensions | Not started | 3, 4, 5 |
| 8 | Multi-Cloud Live Deployment | Not started | 7 |

## Performance Metrics

- **Plans complete:** 0
- **Verifications passed:** 0
- **Phases shipped:** 0
- **Phases inserted (decimal):** 0

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

### Open Decisions (to resolve at phase start)

| Decision | Surface in phase | Notes |
|----------|------------------|-------|
| KYC similarity / confidence thresholds | Phase 4 | Defaults (sim≥80 approved, ≥70 manual_review) need real-data tuning; document chosen values in PROJECT.md after phase 4 |
| DashScope strict JSON-schema mode availability on chosen Qwen model | Phase 5 | Validate during planning; fall back to `json_object` + Pydantic if strict mode unavailable on `qwen-max` |
| AudioWorklet 16kHz PCM Int16 conversion (Safari fallback) | Phase 7 | Frontend wiring concern; `SpeechRecognition` fallback retained for browsers without `AudioWorklet` |

### Active Todos

- (None — populated by planner as phases progress)

### Blockers

- (None)

## Session Continuity

**Last session ended:** 2026-04-25 — roadmap creation
**Next action:** `/gsd-plan-phase 1` to plan Phase 1 (Backend Scaffold + Schema + Seed)

**Resume context for next session:**
- Read `.planning/ROADMAP.md` for the 8-phase structure
- Read `.planning/REQUIREMENTS.md` for the 73 v1 requirements with traceability
- Read `.planning/research/SUMMARY.md` + `ARCHITECTURE.md` + `PITFALLS.md` for the cross-cutting design corrections
- Backend `backend/` directory was wiped on the `backend` branch — re-scaffold cleanly (do not restore commit `3de5f53`)

---
*State initialised: 2026-04-25 after roadmap creation*
