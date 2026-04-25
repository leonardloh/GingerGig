# GingerGig

A hyperlocal gig platform connecting Malaysian elders who offer home services (cooking, tutoring, childcare, etc.) with requestors in their community, with family companions monitoring their wellbeing.

## Features

- **Three-persona app** — Elder (service provider), Requestor (customer), Companion (family carer)
- **Multilingual** — Bahasa Malaysia, English, 中文, தமிழ்
- **Voice-to-listing** — Elders describe their service by voice; AI generates a structured listing
- **KYC onboarding** — MyKad IC upload + selfie face match via AWS Textract + Rekognition
- **Companion alerts** — Family members receive care signals (inactivity, overwork, milestones)
- **Fully typed API client** — TypeScript services layer ready to connect to the FastAPI backend

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 8 |
| Styling | CSS custom properties (design token system) |
| API client | Native `fetch` with typed wrappers (`src/services/api/`) |
| Backend | Python FastAPI + SQLAlchemy (async) + PostgreSQL *(in progress)* |
| KYC pipeline | AWS S3 + Textract + Rekognition (orchestrated by FastAPI) |
| Code quality | ESLint 9, Prettier 3, TypeScript strict mode |

## Project Structure

```
GingerGig/
├── frontend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts              # Env var config (API base URL, timeout)
│   │   ├── services/
│   │   │   └── api/
│   │   │       ├── http.ts         # Core fetch client (auth, timeout, error handling)
│   │   │       ├── types.ts        # Shared TypeScript interfaces (DTOs)
│   │   │       ├── index.ts        # Barrel re-export of all services
│   │   │       └── endpoints/
│   │   │           ├── auth.ts     # register, login, logout, getMe
│   │   │           ├── elder.ts    # listings, bookings, earnings, respond
│   │   │           ├── requestor.ts# search, createBooking, getBookings
│   │   │           ├── companion.ts# dashboard, alerts, preferences
│   │   │           └── kyc.ts      # KYC session, upload, verify, poll
│   │   └── prototype/
│   │       ├── PrototypeApp.jsx    # App shell — login, routing, i18n
│   │       ├── elder-screens.jsx   # Elder UI (dashboard, voice, listings, earnings)
│   │       ├── requestor-screens.jsx # Requestor UI (home, search, provider detail)
│   │       ├── companion-screens.jsx # Companion UI (dashboard, alerts)
│   │       ├── OnboardingFlow.jsx  # Sign-up + KYC onboarding stepper
│   │       ├── components.jsx      # Shared UI components (Button, Card, Icon, etc.)
│   │       ├── i18n.js             # Translation strings (MS / EN / ZH / TA)
│   │       └── mock-data.js        # Prototype mock data
│   ├── docs/
│   │   ├── DESIGN_NOTES.md         # Product design decisions and UX notes
│   │   ├── API_READY_MIGRATION.md  # Guide to wiring prototype to live backend
│   │   └── MULTI-CLOUD-ARCHITECTURE.md # AWS (SG) + Alibaba (MY) infrastructure design
│   └── .env.example                # Environment variable template
├── backend/
│   ├── main.py                     # FastAPI app entry point (placeholder)
│   ├── db.py                       # Async SQLAlchemy engine and session factory
│   ├── models.py                   # SQLAlchemy models (in progress)
│   ├── routes/                     # API routers (in progress)
│   ├── services/                   # Business logic (in progress)
│   └── .env.example                # Backend environment variable template
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ with [uv](https://github.com/astral-sh/uv)
- PostgreSQL (for backend — when implemented)

### Run the frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # edit VITE_API_BASE_URL if needed
npm run dev
```

The prototype runs fully on mock data — no backend connection required.
Open [http://localhost:5173](http://localhost:5173) and sign in with any demo account.

**Demo accounts** (password: `demo`):

| Email | Persona |
|---|---|
| `siti@gingergig.my` | Elder — home cook in Kepong |
| `amir@gingergig.my` | Requestor — Damansara Utama |
| `faiz@gingergig.my` | Companion — watching Makcik Siti |

### Run the backend (placeholder)

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL and AWS credentials
uv sync
uv run uvicorn main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health` → `{ "status": "ok" }`

### Frontend scripts

```bash
npm run dev          # start dev server
npm run build        # type-check + production build
npm run typecheck    # TypeScript check only
npm run lint         # ESLint
npm run format       # Prettier (write)
npm run format:check # Prettier (check only, for CI)
```

## API Reference

All endpoints are prefixed with `/api/v1`. The frontend client in `src/services/api/http.ts` prepends this prefix automatically — `VITE_API_BASE_URL` should be the bare host (e.g. `http://localhost:8000`).

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account; returns access token + KYC status |
| `POST` | `/auth/login` | Authenticate and receive access token |
| `GET` | `/auth/me` | Get the authenticated user's profile |

### KYC (elder onboarding)

| Method | Path | Description |
|---|---|---|
| `POST` | `/kyc/session` | Start a KYC session; returns presigned S3 upload URLs |
| `PUT` | `<presigned S3 URL>` | Upload IC front, back, or selfie directly to S3 |
| `POST` | `/kyc/verify` | Trigger Textract + Rekognition pipeline |
| `GET` | `/kyc/status/:jobId` | Poll verification status |
| `POST` | `/kyc/retry` | Re-submit after a failed verification |

### Elder

| Method | Path | Description |
|---|---|---|
| `GET` | `/elders/:id/listings` | Get all listings by this elder |
| `PATCH` | `/listings/:id` | Partially update a listing |
| `GET` | `/elders/:id/bookings` | Get all bookings for this elder's listings |
| `POST` | `/bookings/:id/respond` | Accept or decline a pending booking |
| `GET` | `/elders/:id/earnings/summary` | Get month-to-date and lifetime earnings |

### Requestor

| Method | Path | Description |
|---|---|---|
| `GET` | `/requestor/listings/search` | Search listings with optional filters |
| `POST` | `/requestor/bookings` | Book a listing |
| `GET` | `/requestor/bookings` | Get the requestor's booking history |

### Companion

| Method | Path | Description |
|---|---|---|
| `GET` | `/companions/elders/:elderId/dashboard` | Get the companion's dashboard for their elder |
| `GET` | `/companions/elders/:elderId/alerts` | Get active care alerts for the elder |
| `PUT` | `/companions/elders/:elderId/alert-preferences` | Update notification preferences |

## Connecting the Prototype to the Backend

See [`frontend/docs/API_READY_MIGRATION.md`](frontend/docs/API_READY_MIGRATION.md) for a step-by-step guide to replacing mock data with live API calls.

## Architecture Notes

See [`frontend/docs/MULTI-CLOUD-ARCHITECTURE.md`](frontend/docs/MULTI-CLOUD-ARCHITECTURE.md) for the AWS (Singapore) + Alibaba Cloud (Malaysia) infrastructure design, including the KYC pipeline and voice transcription strategy.
