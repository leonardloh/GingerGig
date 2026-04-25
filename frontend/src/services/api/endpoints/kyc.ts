/**
 * KYC API endpoints — AWS Textract + Rekognition pipeline
 *
 * Flow:
 *   1. initiateSession()   → get presigned S3 upload URLs + sessionId
 *   2. uploadDocument()    → PUT file directly to S3 presigned URL (no auth header needed)
 *   3. startVerification() → trigger backend pipeline: Textract (IC OCR) + Rekognition (face match)
 *   4. pollStatus()        → poll until status is "approved" | "failed" | "manual_review"
 *
 * AWS services involved (backend-side, orchestrated by FastAPI):
 *   - S3               store uploaded IC images and selfie
 *   - Textract         extract text from MyKad front/back (AnalyzeID API)
 *   - Rekognition      compare IC face photo vs selfie (CompareFaces + Face Liveness)
 *
 * KYC results are stored in Postgres alongside the user record.
 * PII (IC images) stays in S3 and never passes through the application server.
 */

import { apiRequest } from "../http";
import type {
  KycUploadUrls,
  KycVerificationResult,
  KycStatus,
} from "../types";

// ─── Step 1: Initiate KYC session ─────────────────────────────────────────

/**
 * POST /api/v1/kyc/session
 *
 * Backend creates a KYC session record in DynamoDB and returns
 * presigned S3 PUT URLs valid for 15 minutes.
 *
 * The frontend uploads directly to S3 — documents never pass through
 * the backend server, keeping PII off application logs.
 */
export function initiateSession(): Promise<KycUploadUrls> {
  return apiRequest<KycUploadUrls>("/kyc/session", { method: "POST" });
}

// ─── Step 2: Upload document directly to S3 ───────────────────────────────

/**
 * PUT <presignedUrl>  (direct S3 call, no Authorization header)
 *
 * Uploads a file blob directly to the presigned S3 URL returned by
 * initiateSession(). Content-Type must match what the backend specified
 * when generating the URL (typically "image/jpeg" or "image/png").
 *
 * Returns true on success (S3 returns 200/204 with no body).
 */
export async function uploadDocument(
  presignedUrl: string,
  file: File,
): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

// ─── Step 3: Start verification ───────────────────────────────────────────

export interface StartVerificationPayload {
  sessionId: string;
}

export interface StartVerificationResponse {
  jobId: string;
  status: KycStatus;
  /** Estimated processing time in seconds */
  estimatedSeconds: number;
}

/**
 * POST /api/v1/kyc/verify
 *
 * Triggers the backend Lambda pipeline:
 *   1. Textract AnalyzeID on IC front + back → extracts name, IC number, DOB, address
 *   2. Rekognition CompareFaces → compares IC face photo vs selfie
 *   3. (Optional) Rekognition Face Liveness → checks selfie is a live person
 *   4. Writes result to DynamoDB, updates user record
 *
 * Processing is async. Poll pollStatus(jobId) until terminal state.
 */
export function startVerification(
  payload: StartVerificationPayload,
): Promise<StartVerificationResponse> {
  return apiRequest<StartVerificationResponse>("/kyc/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Step 4: Poll verification status ─────────────────────────────────────

/**
 * GET /api/v1/kyc/status/:jobId
 *
 * Returns current KYC status. Poll every 2–3 seconds until status is
 * one of: "approved" | "failed" | "manual_review"
 *
 * Terminal statuses:
 *   approved      - Textract + Rekognition both passed, user is verified
 *   failed        - Hard failure (face mismatch, unreadable IC, suspected fraud)
 *   manual_review - Borderline confidence score, queued for human review
 */
export function pollStatus(jobId: string): Promise<KycVerificationResult> {
  return apiRequest<KycVerificationResult>(`/kyc/status/${jobId}`);
}

// ─── Convenience: full poll loop ──────────────────────────────────────────

const TERMINAL_STATUSES: KycStatus[] = ["approved", "failed", "manual_review"];
export const POLL_INTERVAL_MS = 2500;
export const MAX_POLLS = 24; // 60 s total timeout

/**
 * Polls pollStatus() until a terminal state is reached or timeout.
 * Calls onProgress with each intermediate status update.
 */
export async function waitForVerification(
  jobId: string,
  onProgress?: (status: KycStatus) => void,
): Promise<KycVerificationResult> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const result = await pollStatus(jobId);
    onProgress?.(result.status);
    if (TERMINAL_STATUSES.includes(result.status)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("KYC verification timed out after 60 seconds");
}

// ─── Re-submission ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/kyc/retry
 *
 * Allowed only when status is "failed". Creates a new session and
 * invalidates the previous one. Returns fresh upload URLs.
 */
export function retryKyc(): Promise<KycUploadUrls> {
  return apiRequest<KycUploadUrls>("/kyc/retry", { method: "POST" });
}
