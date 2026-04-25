// ─── KYC ──────────────────────────────────────────────────────────────────

export type KycStatus = "not_started" | "pending" | "approved" | "failed" | "manual_review";

export type KycDocumentSide = "front" | "back";

/** Presigned S3 URLs returned by the backend for direct browser-to-S3 upload */
export interface KycUploadUrls {
  sessionId: string;
  frontUrl: string;    // PUT presigned URL → S3
  backUrl: string;     // PUT presigned URL → S3
  selfieUrl: string;   // PUT presigned URL → S3
}

/** Data extracted by AWS Textract from the MyKad */
export interface ExtractedIdData {
  fullName: string;
  icNumber: string;          // e.g. "950101-14-1234"
  dateOfBirth: string;       // ISO date "1995-01-01"
  address: string;
  nationality: string;
  gender: "M" | "F";
  /** Textract confidence 0–100 */
  confidence: number;
}

/** Face comparison result from AWS Rekognition */
export interface FaceMatchResult {
  matched: boolean;
  /** Rekognition similarity score 0–100 */
  similarity: number;
  livenessScore?: number;    // if Rekognition Face Liveness was used
}

export interface KycVerificationResult {
  jobId: string;
  status: KycStatus;
  extractedData?: ExtractedIdData;
  faceMatch?: FaceMatchResult;
  failureReason?: string;
}

// ─── Auth / registration ───────────────────────────────────────────────────

export type UserRole = "elder" | "requestor" | "companion";
export type Locale = "ms" | "en" | "zh" | "ta";

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;        // E.164 format, e.g. "+60123456789"
  password: string;
  role: UserRole;
  locale: Locale;
}

export interface RegisterResponse {
  userId: string;
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  /** Whether this role requires eKYC before full access */
  kycRequired: boolean;
  kycStatus: KycStatus;
}

// ─── Shared API error ─────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
}

export interface Session {
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  userId: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: "elder" | "requestor" | "companion";
  locale: "ms" | "en" | "zh" | "ta";
}

export interface Listing {
  id: string;
  elderId: string;
  title: string;
  description: string;
  price: number;
  currency: "MYR";
  isActive: boolean;
}

export interface Booking {
  id: string;
  listingId: string;
  requestorName: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: number;
  scheduledAt: string;
}

export interface EarningsSummary {
  monthTotal: number;
  lifetimeTotal: number;
  completedCount: number;
}

export interface CompanionAlert {
  id: string;
  type: "care" | "celebration";
  title: string;
  message: string;
  createdAt: string;
}

export interface CompanionDashboard {
  status: string;
  weeklyEarnings: EarningsSummary;
  activeDays: number;
  completedBookings: number;
}
