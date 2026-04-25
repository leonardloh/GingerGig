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
  kycStatus: KycStatus;
  avatarUrl?: string | null;
  area?: string | null;
  age?: number | null;
  phone?: string | null;
  initials: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number | string;
}

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  elderId: string;
  title: string;
  description: string;
  price: number;
  priceMax?: number | null;
  priceUnit: string;
  currency: "MYR";
  category: string;
  rating: number;
  reviewCount: number;
  halal: boolean;
  isActive: boolean;
  days: string[];
  menu: MenuItem[];
  titleMs?: string | null;
  titleEn?: string | null;
  titleZh?: string | null;
  titleTa?: string | null;
  elderName?: string | null;
  elderInitials?: string | null;
  elderArea?: string | null;
  elderPortraitUrl?: string | null;
  distance?: string | null;
  matchScore?: number | null;
  matchReason?: string | null;
}

export interface ListingDetail extends Listing {
  reviews: Review[];
}

export interface Booking {
  id: string;
  listingId: string;
  requestorName: string;
  requestorInitials: string;
  requestorAvatarUrl?: string | null;
  listingTitle: string;
  qty: string;
  itemDescription: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: number;
  currency: string;
  scheduledAt: string;
  notes?: string | null;
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

export interface CompanionElderSnapshot {
  id: string;
  name: string;
  initials: string;
  area?: string | null;
  portraitUrl?: string | null;
}

export interface CompanionDashboard {
  status: string;
  weeklyEarnings: EarningsSummary | number;
  activeDays: number;
  completedBookings: number;
  elder: CompanionElderSnapshot;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  text: string;
  time: string;
  occurredAt: string;
  relatedId?: string | null;
}

export type VoiceLanguage = "en-US" | "zh-CN" | "ms-MY" | "ta-IN";
export type StreamingVoiceLanguage = "en-US" | "zh-CN";
export type BatchVoiceLanguage = "ms-MY" | "ta-IN";

export interface ListingDraft {
  name?: string | null;
  service_offer: string;
  category: "home_cooking" | "traditional_crafts" | "pet_sitting" | "household_help" | "other";
  price_amount?: number | null;
  price_unit?: "per_meal" | "per_hour" | "per_day" | "per_month" | null;
  capacity?: number | null;
  dietary_tags: string[];
  location_hint?: string | null;
  language: VoiceLanguage;
}

export type VoiceStreamMessage =
  | { type: "partial"; text: string }
  | { type: "final"; listing: ListingDraft }
  | { type: "error"; message: string };

export interface AudioUploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface VoiceBatchSubmitResponse {
  jobId: string;
  status: "pending";
  estimatedSeconds: number;
}

export interface VoiceBatchStatusResponse {
  jobId: string;
  status: "pending" | "transcribing" | "extracting" | "ready" | "failed";
  listing?: ListingDraft;
  message?: string;
}
