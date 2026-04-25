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

Attach the following least-privilege policy to the backend AWS principal used by Alibaba ECS. Scope is limited to batch voice audio and Transcribe. No S3 provider-photo permissions belong here because Alibaba OSS stores provider photos.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GingerGigAudioBucketAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::gingergig-audio-<env>/*"
    },
    {
      "Sid": "GingerGigTranscribeAccess",
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob",
        "transcribe:StartStreamTranscription"
      ],
      "Resource": "*"
    }
  ]
}
```

Manual checklist:

- [ ] Create or update the backend AWS principal.
- [ ] Attach the audio S3 + Transcribe policy above.
- [ ] Confirm no provider-photo or provider photos permissions are granted in AWS S3; provider photos stay in OSS.
- [ ] Store AWS access keys only in the Alibaba ECS runtime environment or approved secret store.

## AWS Budgets

Configure AWS Budgets actual-cost email alerts before judge/demo traffic:

- AWS account id: `<aws-account-id>`
- notification email: `<alert-email>`
- threshold 1: `$50` actual cost
- threshold 2: `$100` actual cost

Manual checklist:

- [ ] Create an actual-cost budget for `<aws-account-id>`.
- [ ] Add `$50` alert to `<alert-email>`.
- [ ] Add `$100` alert to `<alert-email>`.
- [ ] Verify both budget alerts exist before demo traffic.

## Outputs For Later Plans

- CloudFront distribution domain: `https://<cloudfront-distribution-domain>`
- Audio bucket: `gingergig-audio-<env>`
- Backend origin: `https://<alibaba-ecs-or-slb-host>`
