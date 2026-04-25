---
phase: 06
slug: multi-cloud-live-deployment
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-26
---

# Phase 06 — Validation Strategy

> Deployment validation mixes static checks, cloud CLI checks, and one manual public smoke test.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + npm/Vite + cloud CLIs/manual checks |
| **Config file** | `backend/pyproject.toml`, `frontend/package.json`, `backend/.env.example`, `frontend/.env.example` |
| **Quick run command** | `cd backend && uv run pytest tests/test_no_forbidden_imports.py -q` |
| **Full suite command** | `cd backend && uv run pytest -q && cd ../frontend && npm run build` |
| **Estimated runtime** | ~120 seconds locally, excluding cloud provisioning |

---

## Sampling Rate

- **After every task commit:** Run the task's static grep/CLI acceptance checks.
- **After every plan wave:** Run the full suite where Phase 5 source is ready; otherwise run the documented static subset and mark cloud checks pending.
- **Before `/gsd-verify-work`:** Full backend tests, frontend build, cloud endpoint checks, and smoke test must be green.
- **Max feedback latency:** 5 minutes for local checks; cloud provisioning waits are manual.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | DEPLOY-01 | T06-01 | Frontend bucket private with CloudFront OAC | static/manual | `rg "Origin Access Control|Block Public Access|ap-southeast-1" backend/docs` | ❌ W0 | pending |
| 06-01-02 | 01 | 0 | DEPLOY-06 | T06-02 | Audio bucket CORS permits only CloudFront/backend origins | static/manual | `rg "AllowedMethods.*PUT|S3_AUDIO_BUCKET|ap-southeast-1" backend/docs` | ❌ W0 | pending |
| 06-01-03 | 01 | 0 | DEPLOY-07 | T06-03 | IAM scoped to audio bucket and Transcribe operations | static/manual | `rg "transcribe:StartTranscriptionJob|s3:GetObject|least-privilege" backend/docs` | ❌ W0 | pending |
| 06-01-04 | 01 | 0 | DEPLOY-09 | T06-04 | Budget alerts at $50 and $100 before judging | static/manual | `rg "\\$50|\\$100|AWS Budgets" backend/docs` | ❌ W0 | pending |
| 06-02-01 | 02 | 0 | DEPLOY-02 | T06-05 | ECS/SLB supports HTTPS + WebSocket idle timeout >=300s | manual | `rg "idle timeout.*300|WebSocket|ECS" backend/docs` | ❌ W0 | pending |
| 06-02-02 | 02 | 0 | DEPLOY-03 | T06-06 | ApsaraDB DSN injected via env, not committed | static/manual | `rg "DATABASE_URL=.*PASSWORD" backend/.env.example` | ✅ | pending |
| 06-02-03 | 02 | 0 | DEPLOY-05 | T06-07 | OSS stores provider photos only, not audio/KYC bytes | static/manual | `rg "provider photos|non-PII|OSS" backend/docs` | ❌ W0 | pending |
| 06-02-04 | 02 | 0 | DEPLOY-08 | T06-08 | DashScope key provisioned without committing secret | static/manual | `rg "DASHSCOPE_API_KEY=" backend/.env.example` | ✅ | pending |
| 06-03-01 | 03 | 1 | DEPLOY-02 | T06-09 | Container runs existing Dockerfile and health route | automated/manual | `cd backend && docker build -t gingergig-api:phase6 .` | ✅ | pending |
| 06-04-01 | 04 | 2 | DEPLOY-01 | T06-10 | Frontend built with backend origin only | automated | `cd frontend && npm run build` | ✅ | pending |
| 06-05-01 | 05 | 3 | DEPLOY-02, DEPLOY-06 | T06-11 | CORS contains exact public origins, never wildcard | static/manual | `rg "CORS_ORIGINS_CSV=.*\\*" backend/.env.example backend/docs` returns no matches | ✅ | pending |
| 06-06-01 | 06 | 4 | DEPLOY-10 | T06-12 | Public smoke test proves full judge flow | manual | `curl -fsS https://<backend>/health` plus browser smoke checklist | ❌ W0 | pending |

---

## Wave 0 Requirements

- [ ] `backend/docs/DEPLOYMENT_AWS.md` — AWS S3, CloudFront, audio bucket, IAM, and budget runbook.
- [ ] `backend/docs/DEPLOYMENT_ALIBABA.md` — ECS, SLB, ApsaraDB, OSS, and DashScope runbook.
- [ ] `backend/docs/DEPLOYMENT_SMOKE_TEST.md` — final public smoke checklist.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CloudFront distribution public URL loads app | DEPLOY-01 | Requires live AWS account and DNS/distribution propagation | Open the CloudFront URL in a clean browser session and verify the React shell renders. |
| Alibaba backend HTTPS endpoint supports WebSocket | DEPLOY-02 | Requires live SLB/ALB or reverse proxy | Open the voice WebSocket from deployed frontend and verify no 60s idle disconnect during a 90s max session. |
| ApsaraDB provisioned and migrated | DEPLOY-03 | Requires live Alibaba account/network access | Run `uv run alembic upgrade head` against production DSN from ECS only, then `uv run alembic current`. |
| DashScope key live | DEPLOY-08 | Requires secret value | Run the Phase 4 Qwen extraction smoke command on ECS with `DASHSCOPE_API_KEY` set. |
| Full judge smoke flow | DEPLOY-10 | Cross-cloud user journey | Login as Siti/Amir/Faiz, create and accept a booking, then produce an en-US `ListingDraft` from voice. |

---

## Validation Sign-Off

- [ ] All tasks have `<acceptance_criteria>` with grep/CLI/manual checks.
- [ ] Sampling continuity: no 3 consecutive tasks without verification.
- [ ] Wave 0 docs cover all cloud resources before deploy actions.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 5 minutes for local checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
