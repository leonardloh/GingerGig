# Phase 06 Research: Multi-Cloud Live Deployment

## Purpose

Plan a public, hackathon-judgeable deployment while Phase 4/5 are still in motion. The safe split is:

- Provision cloud foundations early where they do not depend on final application code.
- Gate container rollout, frontend publication, and smoke testing on Phase 5 completion.
- Keep the split from `MULTI-CLOUD-ARCHITECTURE.md`: AWS `ap-southeast-1` for frontend edge, S3 audio, Transcribe, and budget guardrails; Alibaba `ap-southeast-3` for FastAPI, ApsaraDB Postgres, OSS provider photos, and DashScope/Qwen.

## Source Constraints

- Frontend remains React/Vite with `VITE_API_BASE_URL` as backend origin only; `apiRequest` owns `/api/v1`.
- Backend container is already defined in `backend/Dockerfile`, exposes port `8000`, and runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Backend production config comes from env vars in `backend/.env.example`, especially `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS_CSV`, `AWS_REGION`, `S3_AUDIO_BUCKET`, `DASHSCOPE_API_KEY`, and OSS settings.
- `ENABLE_TEST_ROUTES` must remain false/omitted in production.
- CORS must never use `*`; deployment must update backend `CORS_ORIGINS_CSV` to include the public CloudFront URL and local dev origin only where needed.

## Cloud Research Notes

### AWS S3 + CloudFront

- Use a private frontend S3 bucket with CloudFront Origin Access Control (OAC), not legacy OAI and not public website hosting.
- CloudFront viewer policy should redirect HTTP to HTTPS.
- SPA routing requires an error response mapping for 403/404 to `/index.html` with HTTP 200, or equivalent CloudFront Function behavior.
- Build artifact source is `frontend/dist` after `npm run build`.

### AWS Audio Bucket

- Audio bucket lives in `ap-southeast-1` and is separate from the frontend bucket.
- Browser presigned PUT needs S3 CORS allowing `PUT`, `GET`, `HEAD`, and browser preflight from the CloudFront origin.
- Backend/Transcribe needs read access to the bucket/key prefix used for batch audio.
- Lifecycle expiration is required for demo hygiene: expire batch audio after 1 day unless a later phase changes retention.

### AWS IAM and Budgets

- Least privilege for the backend AWS principal should include only:
  - `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the audio bucket prefix used by voice batch.
  - `transcribe:StartTranscriptionJob`, `transcribe:GetTranscriptionJob`, and streaming Transcribe permissions required by `amazon-transcribe`.
- Budget alerts should be configured before live testing. Requirements call for alert thresholds at $50 and $100.

### Alibaba ECS / SLB / ApsaraDB / OSS

- ECS runs the existing Docker image or a local image built from `backend/Dockerfile`.
- A public HTTPS endpoint should terminate at Alibaba SLB/ALB or reverse proxy and forward to container port `8000`.
- WebSocket support requires idle timeout >=300 seconds on the load balancer path and keepalive behavior if the provider default remains 60 seconds.
- ApsaraDB PostgreSQL must accept the ECS security group and provide a `postgresql+asyncpg://...` DSN.
- OSS provider photo bucket stores non-PII media only and must not be reused for audio or IC/KYC raw documents.
- DashScope/Qwen uses `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` and `DASHSCOPE_CHAT_MODEL=qwen-max` unless deployment validation proves a different approved model is needed.

## Parallelization Decision

Phase 6 execution is split so early provisioning can run before Phase 5 completes:

- Early, parallel-safe: AWS buckets/CloudFront shell/IAM/budgets and Alibaba ECS/ApsaraDB/OSS/DashScope credential readiness.
- Gated: backend container rollout, frontend CloudFront publication, CORS finalization, and smoke testing.

## Validation Architecture

Phase 6 cannot be fully proven with unit tests alone. Validation is a mix of:

- Static checks on committed config/docs/scripts:
  - no committed secret values
  - no active `VITE_API_BASE_URL` containing `/api/v1`
  - no wildcard backend CORS in examples or deployment docs
- CLI smoke checks once credentials exist:
  - `curl https://<backend>/health`
  - `aws cloudfront get-distribution`
  - `aws s3api get-bucket-cors --bucket <audio-bucket>`
  - Alibaba ECS/SLB status checks from the console or CLI
- Manual end-to-end demo:
  - CloudFront URL loads app
  - Siti/Amir/Faiz login chips work
  - Amir books, Siti accepts
  - Siti voice-to-profile en-US returns a `ListingDraft`
  - browser console shows no CORS failures

## Risks

- CloudFront URL is not known until AWS provisioning, so backend CORS must be revisited after distribution creation.
- Alibaba SLB/ALB default HTTP idle timeout may be 60 seconds; the plan must explicitly verify >=300 seconds for WebSocket paths.
- Phase 4/5 are still unfinished; smoke test plan must block until voice and frontend wiring have summaries.
- Credentials and endpoints are human-provisioned; plans must be `autonomous: false` where cloud console/API access is required.
