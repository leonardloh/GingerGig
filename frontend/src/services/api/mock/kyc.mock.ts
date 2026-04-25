import type {
  KycUploadUrls,
  KycVerificationResult,
  KycStatus,
} from "../types";
import type {
  StartVerificationPayload,
  StartVerificationResponse,
} from "../endpoints/kyc";
import { mockDelay } from "./delay";

export async function initiateSession(): Promise<KycUploadUrls> {
  await mockDelay(300, 600);
  const sessionId = `mock-kyc-${Date.now()}`;
  return {
    sessionId,
    frontUrl: `https://mock-s3.example.com/${sessionId}/front`,
    backUrl: `https://mock-s3.example.com/${sessionId}/back`,
    selfieUrl: `https://mock-s3.example.com/${sessionId}/selfie`,
  };
}

export async function uploadDocument(
  _presignedUrl: string,
  _file: File,
): Promise<void> {
  void _presignedUrl;
  void _file;
  await mockDelay(500, 1200);
  // Simulate successful S3 upload — no-op in mock mode
}

export async function startVerification(
  payload: StartVerificationPayload,
): Promise<StartVerificationResponse> {
  await mockDelay(400, 800);
  return {
    jobId: `mock-job-${payload.sessionId}`,
    status: "pending",
    estimatedSeconds: 5,
  };
}

export async function pollStatus(jobId: string): Promise<KycVerificationResult> {
  await mockDelay(500, 1000);
  return {
    jobId,
    status: "approved",
    extractedData: {
      fullName: "Siti binti Hassan",
      icNumber: "600101-14-1234",
      dateOfBirth: "1960-01-01",
      address: "No 12, Jalan Kepong 1, 52100 Kuala Lumpur",
      nationality: "Malaysian",
      gender: "F",
      confidence: 97.4,
    },
    faceMatch: {
      matched: true,
      similarity: 94.2,
    },
  };
}

export async function waitForVerification(
  jobId: string,
  onProgress?: (status: KycStatus) => void,
): Promise<KycVerificationResult> {
  onProgress?.("pending");
  await mockDelay(1000, 2000);
  onProgress?.("approved");
  return pollStatus(jobId);
}

export async function retryKyc(): Promise<KycUploadUrls> {
  return initiateSession();
}
