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

_Pending task 06-01-02._

## Audio S3 Bucket

_Pending task 06-01-03._

## IAM Policy

_Pending task 06-01-04._

## AWS Budgets

_Pending task 06-01-04._

## Outputs For Later Plans

- CloudFront distribution domain: `https://<cloudfront-distribution-domain>`
- Audio bucket: `gingergig-audio-<env>`
- Backend origin: `https://<alibaba-ecs-or-slb-host>`
