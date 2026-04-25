# Phase 06 Pattern Map

## Existing Files to Reuse

| Role | File | Pattern to Preserve |
|------|------|---------------------|
| Backend container | `backend/Dockerfile` | Multi-stage `uv sync --frozen --no-dev`, non-root `gingergig` user, port `8000`, `uvicorn app.main:app`. |
| Backend env contract | `backend/.env.example` | Placeholder-only secrets, explicit regions, `CORS_ORIGINS_CSV` allowlist, no wildcard. |
| Backend commands | `backend/Makefile` | `make migrate`, `make seed`, `make test`, `make lint`, `make typecheck` wrap canonical `uv` commands. |
| Frontend env contract | `frontend/.env.example` | `VITE_API_BASE_URL` is backend origin only; no trailing slash and no `/api/v1`. |
| Frontend build | `frontend/package.json` | Production build command is `npm run build`; static output is Vite `dist`. |
| Runtime app | `backend/app/main.py` | `/health` unprefixed, feature routes under `/api/v1`, `debug=False`, explicit CORS middleware. |
| Architecture source | `MULTI-CLOUD-ARCHITECTURE.md` | AWS owns frontend/audio/Transcribe; Alibaba owns ECS/Postgres/OSS/Qwen. |

## Deployment Docs Pattern

Phase 1 already has `backend/docs/APSARADB_PROVISIONING.md`. Phase 6 should extend the same docs area instead of introducing a new root-level infra framework unless the execution task deliberately creates one.

Recommended new docs:

- `backend/docs/DEPLOYMENT_AWS.md`
- `backend/docs/DEPLOYMENT_ALIBABA.md`
- `backend/docs/DEPLOYMENT_SMOKE_TEST.md`

## Command Patterns

Use these commands as canonical strings inside plans and runbooks:

- Backend image build: `cd backend && docker build -t gingergig-api:phase6 .`
- Backend local health after container starts: `curl -fsS http://localhost:8000/health`
- Backend tests: `cd backend && uv run pytest -q`
- Backend migration: `cd backend && uv run alembic upgrade head`
- Backend seed: `cd backend && ALLOW_SEED=1 uv run python -m scripts.seed`
- Frontend build: `cd frontend && npm run build`
- No committed frontend API prefix mistake: `rg "VITE_API_BASE_URL=.*api/v1" frontend/.env.example`
- No wildcard CORS examples: `rg "CORS_ORIGINS_CSV=.*\\*" backend/.env.example backend/docs`

## Security Patterns

- Deployment plans must never write real secret values into committed files.
- Use placeholder env keys only: `JWT_SECRET`, `DATABASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DASHSCOPE_API_KEY`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`.
- Backend production env must omit `ENABLE_TEST_ROUTES` or set it false.
- S3 audio bucket is PII-adjacent audio and should expire objects after 24 hours.
- OSS provider photos are non-PII only; audio and KYC raw bytes do not go there.

## Dependency Gate Pattern

Plans 06-01 and 06-02 can run before Phase 5 because they provision cloud foundations. Plans 06-03 through 06-06 must explicitly check that Phase 4 and Phase 5 summaries exist before doing production rollout or final smoke:

- `.planning/phases/04-voice-to-profile-pipeline/04-05-SUMMARY.md`
- `.planning/phases/05-frontend-wiring-type-extensions/05-07-SUMMARY.md`
