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

// ─── Base / backend-contract types ────────────────────────────────────────

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

// ─── Rich UI types (returned by search / dashboard endpoints) ─────────────

export type ProviderTone = "warm" | "professional" | "sand" | "plum";

/** Full provider card as returned by GET /requestor/listings/search */
export interface Provider {
  id: string;
  name: string;
  age: number;
  area: string;
  distance: string;
  initials: string;
  portrait: string | null;
  service: string;
  serviceEn?: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  priceUnit: string;
  halal: boolean;
  tone: ProviderTone;
  description: string;
  matchScore?: number;
  matchReason?: string;
  menu?: Array<{ name: string; price: string }>;
  days: string[];
}

/** Elder's own listing card (richer than the base Listing type) */
export interface ElderListing {
  id: string;
  title: string;
  titleEn?: string;
  category: string;
  price: string;
  priceUnit: string;
  rating: number;
  bookings: number;
  isActive: boolean;
}

/** A booking item as shown in the elder dashboard or requestor bookings list */
export interface BookingItem {
  id: string;
  requestor: string;
  requestorInitials: string;
  portrait: string | null;
  date: string;
  qty: string;
  item: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  price: string;
  rating?: number;
}

/** Earnings data including weekly bar chart (8 weeks, oldest → newest) */
export interface ElderEarningsData {
  monthTotal: number;
  lifetimeTotal: number;
  completedCount: number;
  weeklyBar: number[];
}

/** Companion dashboard — overview of the elder they watch over */
export interface CompanionDashboardData {
  elderName: string;
  elderStatus: string;
  lastActiveText: string;
  weeklyEarnings: number;
  bookingsCompleted: number;
  activeDays: number;
  timeline: Array<{ id: string; time: string; text: string }>;
}

/** A single companion alert item (already localised by the server/mock) */
export interface CompanionAlertItem {
  id: string;
  type: "success" | "info" | "warning" | "care";
  text: string;
}
