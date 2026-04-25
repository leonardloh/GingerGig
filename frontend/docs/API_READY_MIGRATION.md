# Backend Integration Guide

This document tells a backend developer exactly what the frontend expects.
All API contracts are already typed in `src/services/api/` — no guesswork needed.

---

## Current state

The app runs as a React prototype from `src/prototype/`. All API calls are
**mocked locally** — the real service functions in `src/services/api/` are
written and typed, but the prototype screens still call inline mock functions.

**Plugging in the backend = two steps per screen:**
1. Replace the mock inline call with the real import from `src/services/api/`.
2. Remove the mock delay / hardcoded return value.

The HTTP client, auth header injection, timeout, and error handling are
already implemented in `src/services/api/http.ts`.

---

## Environment setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set backend base URL:

```env
VITE_API_BASE_URL=https://your-backend.example.com
```

All API calls prefix `VITE_API_BASE_URL` automatically. Default is
`http://localhost:8000` for local development.

---

## Authentication

**File:** `src/services/api/endpoints/auth.ts`

### `POST /auth/register`

Called by: `OnboardingFlow.jsx` — step 2 (basic info submit)

Request body:

```typescript
{
  name: string;
  email: string;
  phone: string;       // E.164 format e.g. "+60123456789"
  password: string;
  role: "elder" | "requestor" | "companion";
  locale: "ms" | "en" | "zh" | "ta";
}
```

Response:

```typescript
{
  userId: string;
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  kycRequired: boolean;    // true when role === "elder"
  kycStatus: "not_started" | "pending" | "approved" | "failed" | "manual_review";
}
```

On success the frontend stores `accessToken` and includes it as
`Authorization: Bearer <token>` on every subsequent request.

---

### `POST /auth/login`

Called by: `PrototypeApp.jsx` — login screen

Request body:

```typescript
{
  email: string;
  password: string;
}
```

Response:

```typescript
{
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  userId: string;
}
```

---

### `GET /auth/me`

Called by: post-login to get the logged-in user's profile

Response:

```typescript
{
  id: string;
  name: string;
  role: "elder" | "requestor" | "companion";
  locale: "ms" | "en" | "zh" | "ta";
}
```

---

## eKYC — AWS Textract + Rekognition pipeline

**File:** `src/services/api/endpoints/kyc.ts`

Applies to **elder role only** during onboarding. Full flow documented in
`docs/MULTI-CLOUD-ARCHITECTURE.md`.

### `POST /kyc/session`

Returns presigned S3 PUT URLs. The browser uploads IC images and selfie
**directly to S3** — they never pass through the backend.

Response:

```typescript
{
  sessionId: string;
  frontUrl: string;    // presigned PUT URL for IC front image
  backUrl: string;     // presigned PUT URL for IC back image
  selfieUrl: string;   // presigned PUT URL for selfie image
}
```

URL validity: **15 minutes**. Content-Type for all uploads: `image/jpeg` or `image/png`.

---

### `POST /kyc/verify`

Triggers the Lambda orchestrator (Textract → Rekognition). Processing is
**asynchronous** — poll `/kyc/status/:jobId` for result.

Request body:

```typescript
{
  sessionId: string;
}
```

Response:

```typescript
{
  jobId: string;
  status: "pending";
  estimatedSeconds: number;   // hint for UI progress bar
}
```

---

### `GET /kyc/status/:jobId`

Frontend polls every **2.5 seconds** until a terminal status is returned.

Terminal statuses: `"approved"` | `"failed"` | `"manual_review"`

Response:

```typescript
{
  jobId: string;
  status: "not_started" | "pending" | "approved" | "failed" | "manual_review";
  extractedData?: {
    fullName: string;
    icNumber: string;       // "950101-14-1234"
    dateOfBirth: string;    // ISO date "1995-01-01"
    address: string;
    nationality: string;
    gender: "M" | "F";
    confidence: number;     // Textract confidence 0–100
  };
  faceMatch?: {
    matched: boolean;
    similarity: number;     // Rekognition score 0–100
    livenessScore?: number;
  };
  failureReason?: string;
}
```

---

### `POST /kyc/retry`

Allowed only when current status is `"failed"`. Creates a new session and
invalidates the previous one.

Response: same shape as `POST /kyc/session`.

---

## Elder endpoints

**File:** `src/services/api/endpoints/elder.ts`

### `GET /elders/{elderId}/listings`

Response: `Listing[]`

```typescript
interface Listing {
  id: string;
  elderId: string;
  title: string;
  description: string;
  price: number;           // MYR, minimum price if range
  currency: "MYR";
  isActive: boolean;
}
```

> **Note:** The prototype also displays `category`, `priceUnit`, `rating`,
> `bookings` (count), `titleEn` (English translation). These should be added
> to the real `Listing` type and returned by this endpoint.

---

### `PATCH /listings/{listingId}`

Partial update — elder toggles active/inactive or edits price.

Request body: `Partial<Listing>`

Response: updated `Listing`

---

### `GET /elders/{elderId}/bookings`

Returns **pending + confirmed** bookings for the elder's dashboard.

Response: `Booking[]`

```typescript
interface Booking {
  id: string;
  listingId: string;
  requestorName: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: number;          // MYR
  scheduledAt: string;     // ISO 8601 datetime
}
```

> **Note:** The prototype also shows `requestorInitials`, `portrait` (avatar URL),
> `qty` (e.g. "2 portions"), `item` (listing title at time of booking).
> These should be included in the response.

---

### `POST /bookings/{bookingId}/respond`

Elder accepts or declines a pending booking.

Request body:

```typescript
{
  action: "accept" | "decline";
}
```

Response: updated `Booking`

---

### `GET /elders/{elderId}/earnings/summary`

Response:

```typescript
{
  monthTotal: number;       // MYR, current calendar month
  lifetimeTotal: number;    // MYR
  completedCount: number;
}
```

---

### `POST /voice-to-profile/stream` (WebSocket)

**Not yet wired in the frontend** — the voice screen currently uses
`window.SpeechRecognition` (browser API) as a prototype stand-in.

When wiring the real backend:
- Connect at: `wss://<backend>/voice-to-profile/stream`
- Send: `{ language: "ms-MY" | "en-US" | "zh-CN" | "ta-IN" }` as initial frame
- Then stream 16kHz PCM audio chunks as binary frames
- Receive: `{ type: "partial", text: string }` during speech, then `{ type: "final", listing: ListingDraft }` when done

The `ElderVoice` component in `src/prototype/elder-screens.jsx` already has
state slots for `transcript`, `steps`, and `generated` — connect WebSocket
events to those setters.

---

### `POST /voice-to-profile/batch`

For ms-MY and ta-IN (batch ASR path).

Request body:

```typescript
{
  s3Key: string;     // key of uploaded audio in the S3 audio bucket
  language: "ms-MY" | "ta-IN";
}
```

Response: `ListingDraft` (same shape as streaming final frame)

---

## Requestor endpoints

**File:** `src/services/api/endpoints/requestor.ts`

### `GET /requestor/listings/search`

Query parameters:

| Param | Type | Description |
|---|---|---|
| `query` | string | Free-text search |
| `max_distance_km` | number | Radius filter |
| `halal_only` | boolean | Filter halal listings |
| `open_now` | boolean | Filter by current availability |

Response: `Listing[]`

> **Note:** The prototype browse screen also shows `distance`, `rating`,
> `reviews` (count), `halal`, `matchScore`, `matchReason` (Qwen ranking),
> `days` (availability), `menu` (item list with prices).
> These fields need to be part of the search response — or returned as an
> extended `ProviderListing` type.

---

### `POST /requestor/bookings`

Request body:

```typescript
{
  listingId: string;
  scheduledAt: string;   // ISO 8601 datetime
  notes?: string;
}
```

Response: `Booking`

---

### `GET /requestor/bookings`

Response: `Booking[]` — bookings made by the logged-in requestor.

---

## Companion endpoints

**File:** `src/services/api/endpoints/companion.ts`

### `GET /companions/elders/{elderId}/dashboard`

Response:

```typescript
{
  status: string;
  weeklyEarnings: {
    monthTotal: number;
    lifetimeTotal: number;
    completedCount: number;
  };
  activeDays: number;
  completedBookings: number;
}
```

---

### `GET /companions/elders/{elderId}/alerts`

Response: `CompanionAlert[]`

```typescript
interface CompanionAlert {
  id: string;
  type: "care" | "celebration";
  title: string;
  message: string;
  createdAt: string;   // ISO 8601
}
```

> **Note:** The prototype alert screen currently has `type` values of
> `"success"` | `"info"` | `"warning"` and separate `text_en/ms/zh/ta`
> fields. The real API should send a single `message` string in the user's
> preferred locale (set at register time) and use `type: "care" | "celebration"`.

---

### `PUT /companions/elders/{elderId}/alert-preferences`

Request body:

```typescript
{
  inactivity24h: boolean;
  overworkSignals: boolean;
  earningsMilestones: boolean;
  newBookings: boolean;
  reviews: boolean;
}
```

Response: `204 No Content`

---

## Type gaps to fix before going live

These are fields shown in the prototype UI that are **not yet in the TypeScript
types** in `src/services/api/types.ts`. Add them before removing the mock data.

| Type | Missing fields |
|---|---|
| `Listing` | `category`, `priceUnit`, `priceMax`, `rating`, `reviewCount`, `halal`, `titleMs/En/Zh/Ta`, `days: string[]`, `menu: { name, price }[]`, `matchScore`, `matchReason`, `distance` |
| `Booking` | `requestorName`, `requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription` |
| `UserProfile` | `kycStatus`, `avatarUrl`, `area`, `age`, `phone` |
| `CompanionAlert` | `title` (currently missing from prototype — use for push notification heading) |

---

## API prefix

All paths above are relative. The full URL is:

```
{VITE_API_BASE_URL}/api/v1{path}
```

Example: `POST https://api.gingergig.my/api/v1/auth/login`

Update `src/services/api/http.ts` if the backend uses a different prefix.

---

## Error format

The frontend expects this shape for all `4xx` / `5xx` responses:

```typescript
{
  status: number;
  message: string;
  detail?: unknown;   // optional machine-readable detail
}
```

Errors are caught in `src/services/api/http.ts → parseError()` and thrown as
`ApiError` objects. UI error states read `error.message`.
