# AWS Deployment Runbook

## Scope

This runbook captures the AWS side of the GingerGig public deployment. AWS owns the static frontend edge, the batch audio ingest bucket, Transcribe access, and budget guardrails.

Final `frontend/dist` upload is gated on `.planning/phases/05-frontend-wiring-type-extensions/05-07-SUMMARY.md`.

## Region Pins

- AWS region: `ap-southeast-1`
- Frontend bucket placeholder: `gingergig-frontend-<env>`
- Audio bucket placeholder: `gingergig-audio-<env>`
- CloudFront output placeholder: `https://<cloudfront-distribution-domain>`
- Backend origin output placeholder: `https://<alibaba-ecs-or-slb-host>`

## Frontend S3 + CloudFront

Target state:

- S3 bucket `gingergig-frontend-<env>` is private.
- S3 Block Public Access is enabled.
- CloudFront uses Origin Access Control (OAC), not legacy OAI.
- Viewer protocol policy redirects HTTP to HTTPS.
- SPA fallback maps 403 and 404 responses to `/index.html` with response code 200.
- Source artifact is `frontend/dist` from `cd frontend && npm run build`.

Manual checklist:

- [ ] Create the private S3 bucket `gingergig-frontend-<env>` in `ap-southeast-1`.
- [ ] Enable S3 Block Public Access.
- [ ] Create CloudFront Origin Access Control (OAC).
- [ ] Attach a bucket policy restricted to the CloudFront distribution ARN.
- [ ] Configure viewer protocol policy so CloudFront redirects HTTP to HTTPS.
- [ ] Configure SPA fallback for 403 and 404 to `/index.html` with response code 200.
- [ ] Record the CloudFront distribution domain in `## Outputs For Later Plans`.

## Audio S3 Bucket

Target state:

- Bucket `gingergig-audio-<env>` lives in `ap-southeast-1`.
- Backend runtime sets `S3_AUDIO_BUCKET=<audio-bucket-name>`.
- Browser uploads batch audio directly through presigned PUT URLs; the backend never receives raw audio bytes.
- Lifecycle expiration deletes uploaded batch audio after 1 day.

CORS example:

```json
[
  {
    "AllowedOrigins": [
      "https://<cloudfront-distribution-domain>",
      "https://<alibaba-ecs-or-slb-host>"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Manual checklist:

- [ ] Create `gingergig-audio-<env>` in `ap-southeast-1`.
- [ ] Configure the CORS rule above with exact CloudFront and Alibaba origins.
- [ ] Configure lifecycle expiration for uploaded batch audio after 1 day.
- [ ] Record the final bucket name in `## Outputs For Later Plans`.

## IAM Policy

_Pending task 06-01-04._

## AWS Budgets

_Pending task 06-01-04._

## Outputs For Later Plans

- CloudFront distribution domain: `https://<cloudfront-distribution-domain>`
- Audio bucket: `gingergig-audio-<env>`
- Backend origin: `https://<alibaba-ecs-or-slb-host>`
