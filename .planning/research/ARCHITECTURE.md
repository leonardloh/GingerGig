# Architecture Research

**Domain:** Multi-cloud FastAPI backend powering a hyperlocal elder gig marketplace (3-persona React frontend already shipped)
**Researched:** 2026-04-25
**Confidence:** HIGH (high-level design is locked in `MULTI-CLOUD-ARCHITECTURE.md`; all DTOs, mock data shapes, and endpoint paths are concretely defined in the frontend codebase)

This document is **not greenfield architecture research**. The big-picture design (AWS owns frontend + ASR + KYC ML; Alibaba owns DB + cache + LLM + photos) is already decided. The job here is to translate that into:

1. A concrete FastAPI module layout under `backend/`
2. A complete Postgres DDL covering every field the prototype already renders
3. The specific data flow for the two trickiest paths (voice WS proxy and KYC async pipeline)
4. The build order — which phase unblocks which, and what can run in parallel
5. Tair (Redis) cache key design

---

## 1. FastAPI Module Layout

### Design principles

- **One router file per resource group**, mirroring `frontend/src/services/api/endpoints/*.ts` 1:1 (`auth.ts` ↔ `auth.py`, `elder.ts` ↔ `elder.py`, etc.). The frontend has already named the boundaries — match them.
- **Routers stay thin.** A router function validates input (Pydantic), authorises (a `Depends(get_current_user)`), calls a service, returns a Pydantic response. No SQL or boto3 in routers.
- **Services own business logic and external SDKs.** Each service module is a flat collection of `async def` functions taking `(session: AsyncSession, ...)` — no service classes, no DI container, no repository pattern. Keeps the surface obvious for hackathon timeline.
- **Models and schemas split.** SQLAlchemy ORM in `models/`, Pydantic DTOs in `schemas/`. The Pydantic schemas are the contract with the frontend; the SQLAlchemy models are the contract with Postgres. Crossing them goes through `model_validate` / explicit field mapping in services.
- **Cross-cutting in `core/`.** Settings, security (JWT, password hashing), logging, dependencies (`get_db`, `get_current_user`, `get_redis`, `get_s3_client`).

### Concrete layout

```
backend/
├── pyproject.toml                  # uv-managed deps (see STACK.md)
├── uv.lock
├── .env.example
├── alembic.ini
├── README.md
├── Dockerfile                      # for ECS deploy
├── alembic/
│   ├── env.py                      # async engine wiring
│   ├── script.py.mako
│   └── versions/                   # one revision per schema change
│       └── 0001_initial.py         # initial schema (Phase B)
├── scripts/
│   ├── seed.py                     # loads PROVIDERS, HERO_ELDER, ELDER_*, REVIEWS,
│   │                               # COMPANION_ALERTS, TIMELINE, DEMO_ACCOUNTS
│   └── healthcheck.py              # used by docker HEALTHCHECK
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI() construction, lifespan, CORS, router includes
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic-Settings; reads .env (DATABASE_URL, JWT_SECRET,
│   │   │                           # REDIS_URL, AWS_*, OSS_*, DASHSCOPE_API_KEY, S3_KYC_BUCKET,
│   │   │                           # S3_AUDIO_BUCKET)
│   │   ├── security.py             # bcrypt password hash/verify, JWT encode/decode
│   │   ├── logging.py              # structlog or stdlib logging config
│   │   └── errors.py               # ApiError envelope; FastAPI exception handlers that
│   │                               # produce the {status, message, detail} shape the frontend
│   │                               # already parses in http.ts → parseError()
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                 # DeclarativeBase, naming_convention for FK/index names
│   │   ├── session.py              # async_engine, async_sessionmaker, get_db dependency
│   │   └── types.py                # custom types (e.g. JSONB wrappers, citext if used)
│   ├── models/                     # SQLAlchemy 2.x ORM (Mapped[], mapped_column)
│   │   ├── __init__.py             # re-exports for Alembic autogenerate
│   │   ├── user.py                 # User, CompanionLink
│   │   ├── listing.py              # Listing, ListingMenuItem
│   │   ├── booking.py              # Booking, Review
│   │   ├── companion.py            # CompanionAlert, CompanionAlertPrefs, TimelineEvent
│   │   ├── kyc.py                  # KycSession, KycResult
│   │   └── voice.py                # VoiceSession (transcript + Qwen JSON history)
│   ├── schemas/                    # Pydantic DTOs (request/response shapes)
│   │   ├── __init__.py
│   │   ├── common.py               # ApiError, pagination wrappers, enum mirrors
│   │   ├── auth.py                 # RegisterPayload, RegisterResponse, LoginPayload, Session, UserProfile
│   │   ├── listing.py              # Listing, ListingCreate, ListingPatch, MenuItem
│   │   ├── booking.py              # Booking, BookingCreate, BookingRespond
│   │   ├── earnings.py             # EarningsSummary
│   │   ├── companion.py            # CompanionAlert, CompanionDashboard, AlertPreferences
│   │   ├── kyc.py                  # KycUploadUrls, KycVerificationResult, ExtractedIdData, FaceMatchResult
│   │   └── voice.py                # VoicePartial, VoiceFinal, ListingDraft, BatchRequest
│   ├── deps/                       # FastAPI dependency callables
│   │   ├── __init__.py
│   │   ├── auth.py                 # get_current_user, require_role("elder"), require_kyc_approved
│   │   ├── db.py                   # get_db (yields AsyncSession)
│   │   ├── cache.py                # get_redis (singleton aioredis client)
│   │   └── clients.py              # get_s3, get_oss, get_textract, get_rekognition,
│   │                               # get_transcribe_streaming, get_transcribe_batch,
│   │                               # get_qwen — all module-level singletons created in lifespan
│   ├── routers/                    # one file per frontend endpoints/*.ts file + voice
│   │   ├── __init__.py
│   │   ├── health.py               # GET /health (liveness for ECS healthcheck)
│   │   ├── auth.py                 # POST /auth/register, /auth/login, GET /auth/me, POST /auth/logout
│   │   ├── elder.py                # GET /elders/{id}/listings, PATCH /listings/{id},
│   │   │                           # GET /elders/{id}/bookings, POST /bookings/{id}/respond,
│   │   │                           # GET /elders/{id}/earnings/summary
│   │   ├── requestor.py            # GET /requestor/listings/search, POST /requestor/bookings,
│   │   │                           # GET /requestor/bookings
│   │   ├── companion.py            # GET /companions/elders/{id}/dashboard,
│   │   │                           # GET /companions/elders/{id}/alerts,
│   │   │                           # PUT /companions/elders/{id}/alert-preferences
│   │   ├── kyc.py                  # POST /kyc/session, /kyc/verify, /kyc/retry,
│   │   │                           # GET /kyc/status/{jobId}
│   │   └── voice.py                # WS /voice-to-profile/stream, POST /voice-to-profile/batch,
│   │                               # POST /voice-to-profile/audio-upload-url
│   ├── services/                   # business logic + cloud SDK orchestration
│   │   ├── __init__.py
│   │   ├── auth_service.py         # register_user, authenticate, issue_token, fetch_profile
│   │   ├── listing_service.py      # list_for_elder, search, patch, get_for_requestor (with menu join)
│   │   ├── booking_service.py      # create, list_for_elder, list_for_requestor, respond, mark_completed
│   │   ├── earnings_service.py     # summary_for_elder (SQL aggregate over completed bookings)
│   │   ├── companion_service.py    # dashboard, alerts (locale-picked), update_prefs, append_timeline
│   │   ├── kyc_service.py          # create_session, presign_uploads, run_verify (Textract+Rekog),
│   │   │                           # get_status, retry
│   │   ├── voice_service.py        # streaming proxy, batch submit, batch poll, qwen_extract,
│   │   │                           # persist_listing_draft
│   │   ├── cache_service.py        # get_or_set_json (read-through helper used by listing search)
│   │   └── seed_service.py         # idempotent loader called by scripts/seed.py
│   └── integrations/               # thin SDK wrappers — one module per external service.
│       │                           # Reason: services/ stays domain-focused, integrations/ is
│       │                           # the only layer that imports boto3/aliyunsdk/aiohttp.
│       ├── __init__.py
│       ├── s3.py                   # presign_put, presign_get, head_object
│       ├── oss.py                  # alibaba OSS upload (provider photos)
│       ├── textract.py             # analyze_id(front_key, back_key) → ExtractedIdData
│       ├── rekognition.py          # compare_faces(ic_key, selfie_key) → FaceMatchResult
│       ├── transcribe_streaming.py # open_stream(language) → AsyncIterator[str]
│       ├── transcribe_batch.py     # submit_job(s3_uri, language) → job_name; poll_job(name)
│       └── qwen.py                 # extract_listing(transcript, language) → ListingDraft dict
└── tests/
    ├── conftest.py                 # async test client, ephemeral Postgres via testcontainers OR
    │                               # pgsql fixture; redis fixture; mocked AWS via moto
    ├── test_auth.py
    ├── test_elder.py
    ├── test_requestor.py
    ├── test_companion.py
    ├── test_kyc.py                 # mocked Textract + Rekognition responses
    └── test_voice.py               # mocked Transcribe + Qwen
```

### Why this layout

| Choice | Rationale |
|---|---|
| `app/` package vs flat `backend/` | Flat works for hackathon, but `app/` makes Alembic, pytest, and Docker `COPY app /app/app` cleaner. Frontend already namespaces under `src/`; mirror that. |
| `routers/` vs `routes/` | The deleted scaffold used `routes/`. FastAPI's official tutorial uses `routers/`. Either works; pick `routers/` for community-standard naming. Update README accordingly. |
| `models/` and `schemas/` split into multiple files (not one big `models.py`) | Single-file works for ≤10 models. Hackathon will hit ~12 models. Splitting by aggregate (user, listing, booking, companion, kyc, voice) reads better and survives Alembic autogenerate without merge conflicts when two devs add fields in parallel. |
| `integrations/` separate from `services/` | Services do "register a user" (domain). Integrations do "call Textract.AnalyzeID" (SDK plumbing). Splitting lets `services/kyc_service.py` be testable without `boto3` mocking spaghetti — you mock the integration module, not boto3 itself. |
| `deps/clients.py` holds singleton clients | `boto3` clients are expensive to construct. Build once in `lifespan`, inject via `Depends`. Same for Redis pool and Qwen `httpx.AsyncClient`. |
| Pydantic `BaseSettings` in `core/config.py` | Standard FastAPI pattern. Frontend already reads `VITE_API_BASE_URL` from env; backend should follow the same convention. |
| Match frontend route paths exactly | Frontend prepends `/api/v1` automatically. Mount routers with `app.include_router(elder_router, prefix="/api/v1")`. Path segments come from the router files (`/elders/{id}/listings` etc.), not from the prefix. |

### `app/main.py` skeleton

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.session import engine, dispose_engine
from app.deps.cache import init_redis, close_redis
from app.deps.clients import init_clients, close_clients
from app.routers import auth, elder, requestor, companion, kyc, voice, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    await init_clients()           # boto3 clients, Qwen httpx, OSS
    yield
    await close_clients()
    await close_redis()
    await dispose_engine()


app = FastAPI(title="GingerGig API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,    # CloudFront domain + localhost:5173
    allow_credentials=False,                # bearer token, no cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

API = "/api/v1"
app.include_router(health.router)                       # /health (no prefix)
app.include_router(auth.router,      prefix=API)
app.include_router(elder.router,     prefix=API)
app.include_router(requestor.router, prefix=API)
app.include_router(companion.router, prefix=API)
app.include_router(kyc.router,       prefix=API)
app.include_router(voice.router,     prefix=API)        # contains the WS endpoint
```

---

## 2. Postgres Schema

The schema must cover **every field the prototype renders** plus **every DTO field** plus **every type-gap** flagged in `frontend/docs/API_READY_MIGRATION.md`. Source-of-truth audit: `frontend/src/prototype/mock-data.js` × `frontend/src/services/api/types.ts` × the type-gaps list.

### Conventions

- All tables `id TEXT PRIMARY KEY` using nanoid or short string (frontend already uses `"l1"`, `"b1"`, `"a1"` — keep IDs human-readable for demo). Real production would use UUID; for hackathon the seeded constants must round-trip, so prefer `TEXT` IDs and let the seed script provide them verbatim.
- `created_at`, `updated_at` `TIMESTAMPTZ NOT NULL DEFAULT NOW()` everywhere; trigger or app-side update on `updated_at`.
- Money stored as `NUMERIC(10,2)` in MYR (no cents-as-int micro-optimisation — hackathon clarity wins).
- Multilingual fields use four `TEXT` columns (`text_en`, `text_ms`, `text_zh`, `text_ta`) instead of a JSONB blob. Reason: the frontend reads exactly these four locales; columnar storage means a simple `SELECT text_<locale> AS text` in the API and no JSON path expressions.
- Enums stored as `TEXT CHECK (... IN (...))` rather than Postgres `ENUM` types. Reason: easier to evolve in a hackathon (no `ALTER TYPE`-and-cast dance).
- All foreign keys named explicitly (`fk_bookings_listing_id`) via SQLAlchemy `naming_convention` for predictable Alembic diffs.

### `users`

Combines elder, requestor, and companion personas in one table — the prototype's `DEMO_ACCOUNTS` already does this, and the API has a single `User.role` discriminator.

```sql
CREATE TABLE users (
    id              TEXT PRIMARY KEY,                        -- "siti", "amir", "companion-1"
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT,                                    -- E.164 "+60123456789"
    hashed_password TEXT NOT NULL,                           -- bcrypt
    name            TEXT NOT NULL,                           -- "Makcik Siti" (display)
    full_name       TEXT,                                    -- "Siti binti Hassan" (KYC)
    role            TEXT NOT NULL CHECK (role IN ('elder','requestor','companion')),
    locale          TEXT NOT NULL CHECK (locale IN ('ms','en','zh','ta')) DEFAULT 'en',
    -- Profile fields the prototype renders (UserProfile gap)
    age             SMALLINT,
    area            TEXT,                                    -- "Kepong, Kuala Lumpur"
    avatar_url      TEXT,                                    -- randomuser.me URL or OSS key
    initials        TEXT,                                    -- "SH" (computed/cached)
    tone            TEXT CHECK (tone IN ('warm','professional')),
    -- KYC state (only meaningful when role='elder')
    kyc_status      TEXT NOT NULL CHECK (kyc_status IN
                       ('not_started','pending','approved','failed','manual_review'))
                    DEFAULT 'not_started',
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_locale ON users (locale);
```

### `companion_links`

A companion watches one elder; an elder may have multiple companions. The prototype only models 1:1, but the schema should anticipate 1:N. Resolution: separate link table, keyed by (companion, elder). The companion router resolves identity from JWT and looks up which elder via this table.

```sql
CREATE TABLE companion_links (
    id           TEXT PRIMARY KEY,
    companion_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    elder_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship TEXT,                                       -- "daughter", "son", "spouse"
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (companion_id, elder_id)
);
CREATE INDEX idx_companion_links_companion ON companion_links (companion_id);
CREATE INDEX idx_companion_links_elder ON companion_links (elder_id);
```

### `listings`

Covers `ELDER_LISTINGS` (hero elder's own) and `PROVIDERS` (browse list — same shape with extra render fields). The provider description, multi-language titles, match metadata, and menu items all live here.

```sql
CREATE TABLE listings (
    id              TEXT PRIMARY KEY,                        -- "l1", "l2"
    elder_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Multi-locale title (4 columns, not JSONB)
    title_ms        TEXT NOT NULL,
    title_en        TEXT NOT NULL,
    title_zh        TEXT,
    title_ta        TEXT,
    description     TEXT NOT NULL,                           -- single-locale, free-text (Qwen output)
    category        TEXT NOT NULL CHECK (category IN
                       ('cat_cooking','cat_crafts','cat_pet','cat_household','cat_other')),
    -- Pricing
    price_min       NUMERIC(10,2) NOT NULL,
    price_max       NUMERIC(10,2),                           -- null when single price (e.g. "RM25")
    price_unit      TEXT NOT NULL CHECK (price_unit IN
                       ('per_meal','per_hour','per_day','per_month','per_visit','per_piece','per_box')),
    currency        TEXT NOT NULL DEFAULT 'MYR' CHECK (currency = 'MYR'),
    -- Browse metadata
    halal           BOOLEAN NOT NULL DEFAULT FALSE,
    dietary_tags    TEXT[] NOT NULL DEFAULT '{}',            -- ['halal','vegetarian'] from Qwen
    -- Availability
    days            TEXT[] NOT NULL DEFAULT '{}',            -- ['Mon','Tue',...] (matches prototype)
    -- Stats (denormalised, refreshed by triggers or cron)
    rating          NUMERIC(3,2) NOT NULL DEFAULT 0,         -- 4.9
    review_count    INTEGER NOT NULL DEFAULT 0,
    booking_count   INTEGER NOT NULL DEFAULT 0,              -- prototype uses `bookings` field name
    -- Lifecycle
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- Optional Qwen ranking metadata (cached per-search-call, see "matching" below)
    -- Note: matchScore/matchReason are NOT stored here — they're query-time per-requestor
    -- and computed by Qwen against the requestor's profile during search.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_listings_elder ON listings (elder_id);
CREATE INDEX idx_listings_category_active ON listings (category, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_listings_halal ON listings (halal) WHERE halal = TRUE;
-- For free-text search across the four title columns + description:
CREATE INDEX idx_listings_search_en ON listings USING GIN
    (to_tsvector('english', coalesce(title_en,'') || ' ' || coalesce(description,'')));
```

> **`matchScore` / `matchReason`:** Qwen-ranked at search time (per requestor, per query). NOT a column. Returned in the search response as a `MatchInfo` object alongside the listing. Cached in Redis under the search-result key (see Section 5).

### `listing_menu_items`

The prototype's `menu` field is a list of `{name, price}` per provider. Modelled as a child table for queryability (allows filtering listings by menu item later).

```sql
CREATE TABLE listing_menu_items (
    id          TEXT PRIMARY KEY,
    listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,                               -- "Rendang Daging"
    price       NUMERIC(10,2) NOT NULL,                      -- 18.00
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_menu_items_listing ON listing_menu_items (listing_id, sort_order);
```

### `bookings`

Covers `ELDER_BOOKINGS` (pending/confirmed) and `ELDER_COMPLETED` (delivered). Snapshot fields are **denormalised on purpose** — the prototype displays `requestorInitials`, `portrait`, `qty`, `item` (description) per booking row, and these need to survive even if the underlying user/listing is edited or deleted.

```sql
CREATE TABLE bookings (
    id                 TEXT PRIMARY KEY,                     -- "b1", "c1"
    listing_id         TEXT NOT NULL REFERENCES listings(id),
    requestor_id       TEXT NOT NULL REFERENCES users(id),
    -- Snapshot fields (denormalised) — populated at booking creation, never updated
    listing_title      TEXT NOT NULL,                        -- "Rendang + Nasi Lemak" or listing title at time
    requestor_name     TEXT NOT NULL,                        -- "Amir"
    requestor_initials TEXT NOT NULL,                        -- "AR"
    requestor_avatar   TEXT,                                 -- snapshot of user.avatar_url
    -- Booking specifics
    quantity_label     TEXT NOT NULL,                        -- "2 portions", "5 portions", "1 box"
    item_description   TEXT,                                 -- "Rendang + Nasi Lemak" — free-form note
    notes              TEXT,                                 -- requestor's optional message
    -- Timing
    scheduled_at       TIMESTAMPTZ NOT NULL,
    scheduled_label    TEXT,                                 -- "Tomorrow, 6:30 PM" — pre-formatted
                                                             -- (saves locale-aware formatting roundtrip)
    -- Money
    amount             NUMERIC(10,2) NOT NULL,
    currency           TEXT NOT NULL DEFAULT 'MYR',
    -- State
    status             TEXT NOT NULL CHECK (status IN
                          ('pending','confirmed','completed','cancelled')),
    completed_at       TIMESTAMPTZ,
    -- Timestamps
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bookings_listing ON bookings (listing_id, status);
CREATE INDEX idx_bookings_requestor ON bookings (requestor_id, status);
CREATE INDEX idx_bookings_elder_pending
    ON bookings (listing_id) WHERE status IN ('pending','confirmed');
-- For the "Today's earnings" / "month total" query:
CREATE INDEX idx_bookings_completed_at ON bookings (completed_at) WHERE status = 'completed';
```

### `reviews`

```sql
CREATE TABLE reviews (
    id           TEXT PRIMARY KEY,                           -- "r1"
    booking_id   TEXT REFERENCES bookings(id),               -- nullable for seeded reviews
    listing_id   TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    author_id    TEXT REFERENCES users(id),                  -- nullable for seeded reviews
    author_name  TEXT NOT NULL,                              -- "Amir R." (display, may be initialled)
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body         TEXT NOT NULL,
    relative_date TEXT,                                      -- "2 weeks ago" — pre-formatted display
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_listing ON reviews (listing_id, created_at DESC);
```

### Earnings — computed, not stored

`EarningsSummary` (monthTotal, lifetimeTotal, completedCount) is a pure aggregate over `bookings WHERE status='completed'`. Don't materialise. Cache the result in Redis under `earnings:elder:{id}` for 60s — that absorbs dashboard polling without adding write paths.

### `companion_alerts`

The prototype keeps `text_en/ms/zh/ta` per alert. Per the project's Key Decision: store all four locales, server picks by `users.locale`. Add a `title` field (flagged in API_READY_MIGRATION as a gap).

```sql
CREATE TABLE companion_alerts (
    id          TEXT PRIMARY KEY,                            -- "a1"
    elder_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Alert classification
    type        TEXT NOT NULL CHECK (type IN
                   ('success','info','warning','care','celebration')),
                                                             -- prototype uses success/info/warning;
                                                             -- DTO uses care/celebration. Store both
                                                             -- vocabularies; map at API layer if needed.
    severity    TEXT NOT NULL DEFAULT 'info'
                   CHECK (severity IN ('info','warning','critical')),
    -- Multilingual content (all four required for elders that speak any)
    title_en    TEXT,
    title_ms    TEXT,
    title_zh    TEXT,
    title_ta    TEXT,
    text_en     TEXT NOT NULL,
    text_ms     TEXT NOT NULL,
    text_zh     TEXT NOT NULL,
    text_ta     TEXT NOT NULL,
    -- Lifecycle
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_companion_alerts_elder ON companion_alerts (elder_id, created_at DESC);
```

### `companion_alert_preferences`

```sql
CREATE TABLE companion_alert_preferences (
    companion_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    elder_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inactivity_24h      BOOLEAN NOT NULL DEFAULT TRUE,
    overwork_signals    BOOLEAN NOT NULL DEFAULT TRUE,
    earnings_milestones BOOLEAN NOT NULL DEFAULT TRUE,
    new_bookings        BOOLEAN NOT NULL DEFAULT TRUE,
    reviews             BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (companion_id, elder_id)
);
```

### `timeline_events`

Per `TIMELINE` mock — single text per event in prototype, but multilingual storage matches the alerts approach.

```sql
CREATE TABLE timeline_events (
    id           TEXT PRIMARY KEY,                           -- "t1"
    elder_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occurred_at  TIMESTAMPTZ NOT NULL,
    relative_label TEXT,                                     -- "Today, 4:20 PM"
    text_en      TEXT NOT NULL,
    text_ms      TEXT,
    text_zh      TEXT,
    text_ta      TEXT,
    event_type   TEXT,                                       -- 'booking_confirmed','listing_posted', etc.
    related_id   TEXT,                                       -- soft FK (booking_id, listing_id)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_timeline_elder ON timeline_events (elder_id, occurred_at DESC);
```

### `kyc_sessions`

Tracks the upload + verification lifecycle. S3 keys are stored, not bytes. Textract and Rekognition raw JSON responses are kept for debugging (truncated `_raw` JSONB).

```sql
CREATE TABLE kyc_sessions (
    id                 TEXT PRIMARY KEY,                     -- session_id surfaced to frontend
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- S3 object keys (KYC bucket, ap-southeast-1, 24h auto-delete lifecycle)
    ic_front_s3_key    TEXT,
    ic_back_s3_key     TEXT,
    selfie_s3_key      TEXT,
    -- Pipeline state
    status             TEXT NOT NULL CHECK (status IN
                          ('not_started','pending','approved','failed','manual_review'))
                       DEFAULT 'not_started',
    job_id             TEXT,                                 -- surfaced to frontend for polling
    -- Textract output
    extracted_full_name TEXT,
    extracted_ic_number TEXT,
    extracted_dob       DATE,
    extracted_address   TEXT,
    extracted_nationality TEXT,
    extracted_gender    TEXT CHECK (extracted_gender IN ('M','F')),
    textract_confidence NUMERIC(5,2),                        -- 0..100
    textract_raw        JSONB,                               -- full AnalyzeID response
    -- Rekognition output
    face_matched        BOOLEAN,
    face_similarity     NUMERIC(5,2),                        -- 0..100
    liveness_score      NUMERIC(5,2),                        -- 0..100, nullable
    rekognition_raw     JSONB,
    -- Failure tracking
    failure_reason      TEXT,
    -- Timestamps
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kyc_sessions_user ON kyc_sessions (user_id, created_at DESC);
CREATE INDEX idx_kyc_sessions_job ON kyc_sessions (job_id) WHERE job_id IS NOT NULL;
```

### `voice_sessions`

Stores the transcript + Qwen-extracted draft so the elder can "save" or "regenerate" without re-recording. Also useful for debugging Qwen hallucinations.

```sql
CREATE TABLE voice_sessions (
    id                 TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language           TEXT NOT NULL CHECK (language IN ('en-US','zh-CN','ms-MY','ta-IN')),
    flow               TEXT NOT NULL CHECK (flow IN ('streaming','batch')),
    -- For batch only
    audio_s3_key       TEXT,
    transcribe_job_name TEXT,
    -- Output
    transcript         TEXT,
    qwen_draft         JSONB,                                -- {name, service_offer, category, price_amount, ...}
    -- Optional: link to created listing once draft is saved
    listing_id         TEXT REFERENCES listings(id),
    -- State
    status             TEXT NOT NULL CHECK (status IN
                          ('recording','transcribing','extracting','ready','saved','failed')),
    error_message      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_voice_sessions_user ON voice_sessions (user_id, created_at DESC);
```

### Coverage check

| Mock data constant / DTO | Tables that cover it |
|---|---|
| `HERO_ELDER` | `users` |
| `PROVIDERS[].{rating,reviews,price,priceUnit,halal,menu,days,description,matchScore,matchReason,distance}` | `listings`, `listing_menu_items`; `matchScore/matchReason/distance` are computed at search-time |
| `ELDER_LISTINGS[]` | `listings` (`title_*`, `category`, `price_*`, `rating`, `booking_count`, `is_active`) |
| `ELDER_BOOKINGS[]`, `ELDER_COMPLETED[]` | `bookings` (snapshot fields cover `requestor`, `requestorInitials`, `portrait`, `qty`, `item`, `price`, `rating`) |
| `REVIEWS[]` | `reviews` |
| `COMPANION_ALERTS[]` | `companion_alerts` (4 locale columns) |
| `TIMELINE[]` | `timeline_events` |
| `DEMO_ACCOUNTS` (Siti/Amir/Companion) | `users` (seeded) + `companion_links` (companion → siti) |
| `KycVerificationResult` | `kyc_sessions` |
| `ListingDraft` (Qwen) | `voice_sessions.qwen_draft` |
| `UserProfile` gaps (`kycStatus`, `avatarUrl`, `area`, `age`, `phone`) | `users` (all five present) |
| `Booking` gaps (`requestorInitials`, `requestorAvatarUrl`, `listingTitle`, `qty`, `itemDescription`) | `bookings` (all five denormalised) |
| `Listing` gaps (`category`, `priceUnit`, `priceMax`, `rating`, `reviewCount`, `halal`, `titleMs/En/Zh/Ta`, `days`, `menu`) | `listings` + `listing_menu_items` |
| `CompanionAlert.title` gap | `companion_alerts.title_*` |

All four locales (`ms`, `en`, `zh`, `ta`) are first-class columns on `companion_alerts`, `timeline_events`, and `listings`.

---

## 3. Data Flows (the trickiest two)

### 3.1 Voice streaming WebSocket proxy (en-US, zh-CN)

This is the highest-risk path because (a) FastAPI bridges two async streams (browser ⇄ Transcribe), (b) `boto3` does NOT support Transcribe Streaming — must use the separate `amazon-transcribe` Python SDK, and (c) the browser sends binary PCM frames while the SDK consumes them via an `async def` event loop.

#### Sequence

```
Browser                FastAPI WS                  amazon-transcribe SDK         AWS Transcribe         Qwen
  |                       |                                |                             |               |
  |---WS connect-------->|                                 |                             |               |
  |<---accept------------|                                 |                             |               |
  |                       |                                |                             |               |
  |---{language:"en-US"}->|                                |                             |               |
  |                       |--TranscribeStreamingClient.start_stream_transcription()--->|               |
  |                       |<--stream object (input + output)---------------------------|               |
  |                       |                                                              |               |
  |                       |--asyncio.create_task(forward_inbound)                        |               |
  |                       |--asyncio.create_task(forward_outbound) [event handler]       |               |
  |                       |                                                              |               |
  |---PCM bytes (16kHz)-->|--stream.input_stream.send_audio_event(chunk)--------------->|               |
  |---PCM bytes--------->|---send_audio_event--------------------------------------->|                 |
  |                       |                                                              |               |
  |                       |<------------partial transcript event------------------------|               |
  |<--{type:"partial",    |                                                              |               |
  |    text:"saya..."}----|                                                              |               |
  |                       |                                                              |               |
  |---(silence detected,  |                                                              |               |
  |    client sends                                                                                       |
  |    {type:"end"})----->|--stream.input_stream.end_stream()                            |               |
  |                       |<------------final transcript event-------------------------|               |
  |                       |                                                              |               |
  |                       |--httpx.post(qwen, transcript) ----------------------------------->         |
  |                       |<--JSON listing draft -------------------------------------------------|     |
  |                       |                                                              |               |
  |                       |--INSERT voice_sessions, qwen_draft                          |               |
  |<--{type:"final",      |                                                              |               |
  |    listing: {...}}----|                                                              |               |
  |                       |--close()                                                    |               |
```

#### FastAPI implementation pattern

The key trick: `amazon-transcribe`'s `TranscriptResultStreamHandler` runs its own `async for` loop on the output stream. Run it as a separate task; have a queue of partials to push to the WS.

```python
# app/integrations/transcribe_streaming.py
import asyncio
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent

class _PartialQueueHandler(TranscriptResultStreamHandler):
    def __init__(self, output_stream, queue: asyncio.Queue):
        super().__init__(output_stream)
        self._queue = queue

    async def handle_transcript_event(self, event: TranscriptEvent):
        for result in event.transcript.results:
            for alt in result.alternatives:
                await self._queue.put({
                    "is_partial": result.is_partial,
                    "text": alt.transcript,
                })

async def open_stream(language: str, region: str = "ap-southeast-1"):
    client = TranscribeStreamingClient(region=region)
    stream = await client.start_stream_transcription(
        language_code=language,            # "en-US" or "zh-CN"
        media_sample_rate_hz=16000,
        media_encoding="pcm",
    )
    queue: asyncio.Queue = asyncio.Queue()
    handler = _PartialQueueHandler(stream.output_stream, queue)
    handler_task = asyncio.create_task(handler.handle_events())
    return stream, queue, handler_task
```

```python
# app/routers/voice.py
@router.websocket("/voice-to-profile/stream")
async def voice_stream(ws: WebSocket, user=Depends(get_current_user_ws)):
    await ws.accept()
    init = await ws.receive_json()
    language = init["language"]                 # "en-US" or "zh-CN"
    if language not in ("en-US", "zh-CN"):
        await ws.close(code=4400, reason="streaming requires en-US or zh-CN")
        return

    stream, queue, handler_task = await open_stream(language)

    async def push_partials():
        while True:
            event = await queue.get()
            if event is None:                   # sentinel for completion
                break
            await ws.send_json({
                "type": "partial" if event["is_partial"] else "interim_final",
                "text": event["text"],
            })

    push_task = asyncio.create_task(push_partials())

    full_transcript_parts = []
    try:
        async for message in ws.iter_bytes():
            await stream.input_stream.send_audio_event(audio_chunk=message)
    except WebSocketDisconnect:
        pass
    finally:
        await stream.input_stream.end_stream()
        await handler_task                      # drain remaining events
        await queue.put(None)
        await push_task

    # Reassemble final transcript from non-partial events captured by the handler
    final_text = " ".join(full_transcript_parts).strip()
    listing_draft = await qwen.extract_listing(final_text, language)
    await voice_service.persist_draft(user.id, language, "streaming", final_text, listing_draft)
    await ws.send_json({"type": "final", "listing": listing_draft})
    await ws.close()
```

> **Concrete gotcha:** `amazon-transcribe` requires `aws_access_key_id` and `aws_secret_access_key` in the environment OR a session passed in. ECS task role won't work out-of-the-box because the SDK does its own SigV4 signing. Either pass `aws_access_key_id=settings.aws_access_key` explicitly or set them in env. (Confirmed via Context7: the SDK is "an asynchronous Python SDK", separate from boto3.)

> **WebSocket auth:** `get_current_user_ws` parses the JWT from the `?token=` query string (the browser can't set headers on a WS handshake easily). Frontend's `apiRequest` already auto-attaches the bearer for HTTP; for WS the helper needs `setApiAccessToken`'s value appended to the URL.

> **PCM format:** Browser must send 16-bit signed PCM at 16kHz. The MediaRecorder API gives you Opus/WebM by default — you'll need an `AudioWorklet` to downsample and convert. This is a frontend wiring concern (already flagged as the only frontend code change permitted in `ElderVoice`); call it out for the phase plan.

#### Streaming end-to-end target: 2-3 seconds after stop speaking

Budget breakdown:
- Last audio chunk → Transcribe final transcript: ~500-1500ms (Transcribe-bound)
- FastAPI → Qwen → JSON: ~600-1200ms (DashScope-bound, prompt with `response_format=json_object`)
- Persist + return to browser: ~50ms

If 2-3s is missed, the bottleneck is Qwen latency — mitigate with a smaller Qwen model variant (`qwen-turbo` vs `qwen-max`) at the cost of extraction quality.

### 3.2 Voice batch flow (ms-MY, ta-IN)

Simpler — no WebSocket, but a polling loop.

```
Browser                    FastAPI                     S3 (audio bucket)        Transcribe Batch       Qwen
  |                           |                              |                          |                 |
  |--POST /voice/audio-upload-url, {language}->|             |                          |                 |
  |                           |--presign PUT---------------->|                          |                 |
  |<--{put_url, s3_key}-------|                              |                          |                 |
  |                           |                              |                          |                 |
  |--PUT audio.wav----------->|                              |                          |                 |
  |                                                           |                          |                 |
  |--POST /voice/batch, {s3_key, language}---->|             |                          |                 |
  |                           |--start_transcription_job(s3://audio/{key})----------->  |                 |
  |                           |<-job_name----------------------------------------|     |                 |
  |                           |                                                           |                 |
  |                           |--poll every 1.5s (sync inside the request)------>       |                 |
  |                           |<-status: IN_PROGRESS / COMPLETED                |     |                 |
  |                           |--get_transcription_job → transcript URL                  |                 |
  |                           |--httpx.get(transcript URL)                                |                 |
  |                           |--httpx.post(qwen, transcript)----------------------------------->         |
  |                           |<--listing draft-----------------------------------------------------|     |
  |                           |--INSERT voice_sessions                                    |                 |
  |<--{listing: {...}}--------|                                                            |                 |
```

> **Why poll inside the request:** the frontend's `voice-to-profile/batch` endpoint is documented as a synchronous-looking call returning the final draft. Hackathon target of 8-12s is well within FastAPI's request timeout. If we move to async, the frontend needs a status-polling loop that doesn't exist today. Trade-off: ECS workers tied up for ~10s per batch call. Acceptable for demo scale; revisit if concurrency matters.

> **Region note:** Audio bucket must be in `ap-southeast-1` (where Transcribe Batch reads from) regardless of `MULTI-CLOUD-ARCHITECTURE.md` putting the rest of AWS in Singapore. KYC bucket too. Cross-region S3→Transcribe is a no-go.

### 3.3 KYC async pipeline

The third critical flow — depicted in MULTI-CLOUD-ARCHITECTURE.md but not unfolded into a sequence.

```
Browser                       FastAPI                          S3 (KYC bucket)    Textract        Rekognition
  |                              |                                    |                |                |
  |--POST /kyc/session---------->|                                    |                |                |
  |                              |--INSERT kyc_sessions (status='not_started')         |                |
  |                              |--presign PUT × 3 (front, back, selfie, 15min TTL)   |                |
  |<--{sessionId, frontUrl,      |                                                                       |
  |    backUrl, selfieUrl}-------|                                                                       |
  |                              |                                                                       |
  |--PUT front IC image--------->|                                    |                                  |
  |--PUT back IC image---------->|                                    |                                  |
  |--PUT selfie---------------->|                                     |                                  |
  |                                                                    |                                  |
  |--POST /kyc/verify, {sessionId}-->|                                |                                  |
  |                              |--UPDATE kyc_sessions SET status='pending', job_id=<gen>               |
  |                              |--asyncio.create_task(run_verify(session_id))                          |
  |<--{jobId, status:"pending",  |                                                                       |
  |    estimatedSeconds:8}-------|                                                                       |
  |                              |                                                                       |
  |  [background task]           |--head_object(front, back, selfie) — confirm uploads                  |
  |                              |--Textract.AnalyzeID(front, back)----->|                              |
  |                              |<--ExtractedIdData---------------------|                              |
  |                              |--Rekognition.CompareFaces(IC face, selfie)---->                      |
  |                              |<--similarity score---------------------------------|                  |
  |                              |--(optional) Rekognition.StartFaceLivenessSession→ Liveness check     |
  |                              |--UPDATE kyc_sessions SET extracted_*, face_matched, similarity,      |
  |                              |   status='approved'|'failed'|'manual_review', completed_at=NOW()     |
  |                              |--UPDATE users SET kyc_status=...                                     |
  |                              |                                                                       |
  |--GET /kyc/status/{jobId} (every 2.5s, max 24 polls)-->|                                              |
  |<--{status: "pending"}--------|                                                                       |
  |  ...                                                                                                  |
  |--GET /kyc/status/{jobId}---->|                                                                       |
  |<--{status:"approved", extractedData, faceMatch}-------                                                 |
```

#### Async task strategy

For hackathon scale, run `run_verify` as `asyncio.create_task` from the `/kyc/verify` handler. **Caveat:** if the ECS task restarts mid-verify, the job is orphaned. Acceptable for demo; document this as a known limitation. Alternative is to add a Celery worker or a polling worker process — overkill for v1.

#### Status state machine

```
not_started ──POST /kyc/verify──> pending ──run_verify──> approved
                                              ├────────> failed
                                              └────────> manual_review

failed ──POST /kyc/retry──> not_started (new session_id, new job_id)
```

#### Decision rules (encoded in `kyc_service.py`)

```python
def decide_status(extracted: ExtractedIdData, face: FaceMatchResult) -> str:
    if not extracted or extracted.confidence < 60:
        return "failed"            # IC unreadable
    if not face.matched:
        return "failed"            # face mismatch
    if face.similarity < 80:
        return "manual_review"     # borderline
    if extracted.confidence < 85:
        return "manual_review"     # low OCR confidence
    return "approved"
```

Numbers are tunable; MULTI-CLOUD-ARCHITECTURE doesn't specify them. Document them in code comments and PROJECT.md Key Decisions when chosen.

### 3.4 Bonus: auth + session flow (lightest of the three)

```
Browser              FastAPI               Postgres            Redis
  |                     |                     |                   |
  |--POST /auth/login-->|                     |                   |
  |                     |--SELECT users WHERE email=?-------->    |
  |                     |<--row, hashed_password---------         |
  |                     |--bcrypt.verify(password, hash)          |
  |                     |--jwt.encode({sub: user_id, role,        |
  |                     |             locale, exp})              |
  |                     |--SET session:{token_jti}=user_id, EX 86400 -->|
  |<--{accessToken, ...}|                                                |
  |                                                                       |
  |--GET /elders/{id}/listings (Authorization: Bearer ...)-->|           |
  |                     |--jwt.decode → user_id, jti                     |
  |                     |--GET session:{jti} (Redis) — confirms not revoked       |
  |                     |--service call → SELECT listings...               |
  |<--Listing[]---------|                                                  |
```

Redis session lookups give us O(1) revocation (logout writes `DEL session:{jti}`). For hackathon, JWT-only without revocation also works — the project's "no localStorage/cookie persistence" constraint means tokens die with the browser tab anyway.

---

## 4. Build Order — Dependency Graph

The hackathon needs to enable parallel work. Here's the DAG of phases. Items at the same depth can be built simultaneously by different developers.

```
                       ┌──────────────────────────────┐
                       │ A. Scaffold + Settings        │
                       │   - pyproject.toml (uv)       │
                       │   - app/main.py + lifespan    │
                       │   - core/config.py            │
                       │   - core/errors.py            │
                       │   - /health                   │
                       │   - Docker + .env.example     │
                       └──────────────┬────────────────┘
                                      │
                       ┌──────────────▼────────────────┐
                       │ B. DB schema + Alembic        │
                       │   - models/* (all aggregates) │
                       │   - alembic/versions/0001     │
                       │   - db/session.py             │
                       │   - scripts/seed.py           │
                       │   - integration test:         │
                       │     "seed runs, queries work" │
                       └──────────────┬────────────────┘
                                      │
                       ┌──────────────▼────────────────┐
                       │ C. Auth + middleware           │
                       │   - core/security.py           │
                       │   - schemas/auth.py            │
                       │   - services/auth_service.py   │
                       │   - routers/auth.py            │
                       │   - deps/auth.py               │
                       │     (get_current_user)         │
                       │   - errors → ApiError envelope │
                       └──────────────┬────────────────┘
                                      │
        ┌─────────────────┬───────────┼──────────────┬────────────────┐
        │                 │           │              │                │
   ┌────▼─────┐     ┌────▼────┐ ┌────▼─────┐  ┌────▼─────┐    ┌────▼─────┐
   │ D1 Elder │     │ D2 Req- │ │ D3 Comp- │  │ D4 KYC   │    │ D5 Voice │
   │  router  │     │ uestor  │ │ anion    │  │ pipeline │    │ pipeline │
   │   +svc   │     │ router  │ │ router   │  │  full    │    │   full   │
   │          │     │  + svc  │ │  + svc   │  │ flow     │    │  flow    │
   │ depends: │     │ depends:│ │ depends: │  │ depends: │    │ depends: │
   │ B,C      │     │ B,C,D1  │ │ B,C      │  │ B,C, S3  │    │ B,C, WS  │
   │          │     │         │ │          │  │ + Textract│   │ + Trans- │
   │          │     │         │ │          │  │ + Rekog  │    │ cribe +  │
   │          │     │         │ │          │  │          │    │ Qwen     │
   └────┬─────┘     └────┬────┘ └────┬─────┘  └────┬─────┘    └────┬─────┘
        │                │           │              │                │
        └────────────────┴───────────┼──────────────┴────────────────┘
                                      │
                       ┌──────────────▼────────────────┐
                       │ E. Tair (Redis) cache layer    │
                       │   - deps/cache.py              │
                       │   - services/cache_service.py  │
                       │   - decorate listing search    │
                       │   - decorate earnings summary  │
                       │   depends: D1, D2              │
                       └──────────────┬────────────────┘
                                      │
                       ┌──────────────▼────────────────┐
                       │ F. Frontend wiring             │
                       │   - extend types.ts (additive) │
                       │   - swap mock helpers in       │
                       │     OnboardingFlow.jsx,        │
                       │     elder/requestor/companion  │
                       │   - wire WS in ElderVoice      │
                       │   depends: D1-D5 deployed     │
                       └──────────────┬────────────────┘
                                      │
                       ┌──────────────▼────────────────┐
                       │ G. Multi-cloud deployment      │
                       │   - ECS task + Dockerfile      │
                       │   - ApsaraDB Postgres          │
                       │   - Tair instance              │
                       │   - OSS bucket + IAM           │
                       │   - S3 buckets (audio, KYC)    │
                       │     with lifecycle (24h KYC)   │
                       │   - CloudFront + S3 frontend   │
                       │   - DashScope key, AWS keys    │
                       │   depends: A-F                 │
                       └────────────────────────────────┘
```

### Critical-path notes

- **Scaffold (A) must finish before everything.** No useful work happens without `app/main.py` and config.
- **Schema (B) blocks every router.** Prioritise it. The schema is the contract — getting the columns right early prevents rewrites in D1-D5.
- **Auth (C) blocks all data routers.** `get_current_user` is the dependency every protected endpoint uses. Build it once, well, then move on.
- **D1-D5 are independent.** Five developers can split: elder + requestor + companion + KYC + voice. They don't share files except `schemas/common.py` and `deps/auth.py`.
- **D2 (requestor) has a soft dep on D1 (elder)** because requestor search returns listings — `services/listing_service.py` is shared. In practice D1 builds the read side (`list_for_elder`); D2 adds the search side. They can land in the same PR or sequential PRs.
- **E (Redis) is additive** — every endpoint works without it. Add the cache layer last so cache-key choices reflect actual query patterns.
- **F (frontend wiring) requires D1-D5 deployed** at least to staging (or `localhost:8000`). Until then, frontend stays on mocks.
- **G (deployment) can start in parallel with D1-D5.** Provisioning ECS, Postgres, Redis, OSS, S3 buckets, and DNS doesn't need code — it can be done by anyone with the cloud accounts. Block on having a runnable Docker image (which needs scaffold A done).

### Suggested phase mapping for the roadmap

| Phase | Build items | Outcome |
|---|---|---|
| Phase 1 | A + B | Backend boots, schema migrated, seed loads, /health green |
| Phase 2 | C | Real auth: register, login, /me, demo accounts work |
| Phase 3 | D1 + D2 + D3 | Core CRUD (elder/requestor/companion) running on real data |
| Phase 4 | D4 (KYC) | eKYC happy path + retry, real Textract + Rekognition |
| Phase 5 | D5 (Voice) | Streaming WS for en/zh + batch for ms/ta, both with Qwen |
| Phase 6 | E + F | Cache layer + frontend wired end-to-end (no more mocks) |
| Phase 7 | G | Live multi-cloud deploy + smoke test from CloudFront URL |

Phases 4 and 5 can swap order or run in parallel if two devs are available — they share zero code paths.

---

## 5. Tair (Redis) Cache Design

Tair is a **read-through cache only** (per MULTI-CLOUD-ARCHITECTURE.md) — not a job queue, not a session store-of-record. Use cases:

1. Listing browse / search results (most expensive query: tsvector + filter + Qwen ranking)
2. Earnings summary (aggregate over `bookings`, refreshed at most once/minute)
3. JWT session presence check (revocation list)
4. KYC status during polling (frontend polls every 2.5s — every poll hitting Postgres is wasteful)
5. Rate limiting buckets (low priority for v1)

### Cache key scheme

| Key | Value | TTL | Invalidation trigger | Notes |
|---|---|---|---|---|
| `listings:search:{hash}` | JSON `Listing[]` (with menu joined) | 60s | Any `INSERT/UPDATE/DELETE` on `listings` for an elder in result set (best-effort: just let TTL expire; hackathon scale tolerates 60s staleness) | `{hash}` = stable hash of `(query, max_distance_km, halal_only, open_now, requestor_id_for_qwen_ranking, locale)` |
| `listings:elder:{elder_id}` | JSON `Listing[]` (full) | 120s | On `PATCH /listings/{id}` for that elder (delete the key) | Used by `GET /elders/{id}/listings` |
| `listings:byid:{listing_id}` | JSON `Listing` (full incl. menu) | 300s | On `PATCH /listings/{id}` (delete the key) | Used by provider-detail screen |
| `earnings:elder:{elder_id}` | JSON `EarningsSummary` | 60s | On `bookings` status transition to `completed` (delete the key) | Dashboard polls this, expensive aggregate |
| `bookings:elder:{elder_id}:active` | JSON `Booking[]` (status in pending,confirmed) | 30s | On respond/create-booking (delete the key) | Elder dashboard live tile |
| `kyc:status:{job_id}` | JSON `KycVerificationResult` | 10s while pending; 300s once terminal | On status transition (set new value) | Frontend polls every 2.5s — Redis absorbs the load |
| `session:{jwt_jti}` | `user_id` string | matches JWT `exp` | On logout (`DEL`) | Revocation check on every protected request |
| `voice:draft:{user_id}:{session_id}` | JSON `ListingDraft` | 600s | On listing save (`DEL`) | "Try again" without re-recording |
| `qwen:rank:{requestor_id}:{listings_hash}` | JSON `{listing_id: {score, reason}}[]` | 300s | TTL-only | Memoise expensive Qwen ranking calls |

### Hash function for search keys

```python
import hashlib, json
def search_key(params: dict, requestor_id: str | None, locale: str) -> str:
    payload = {
        "q": params.get("query") or "",
        "d": params.get("max_distance_km"),
        "h": bool(params.get("halal_only")),
        "o": bool(params.get("open_now")),
        "r": requestor_id or "anon",
        "l": locale,
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return f"listings:search:{hashlib.sha1(blob.encode()).hexdigest()[:16]}"
```

### Read-through helper

```python
# app/services/cache_service.py
from typing import Awaitable, Callable, TypeVar
T = TypeVar("T")

async def get_or_set_json(
    redis, key: str, ttl_s: int, loader: Callable[[], Awaitable[T]]
) -> T:
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    value = await loader()
    await redis.set(key, json.dumps(value, default=str), ex=ttl_s)
    return value
```

### Invalidation patterns

- **TTL-first.** Default to "let it expire" rather than maintaining elaborate dependency tracking. 60s staleness is fine for a demo.
- **Targeted DEL on writes.** When a listing is PATCHed, do `redis.delete(f"listings:byid:{id}", f"listings:elder:{elder_id}")`. Search keys are TTL-only because reverse-mapping search → listing is impractical.
- **No write-through.** All writes hit Postgres first, then optionally invalidate cache. Never write to cache without writing to DB.

### Redis client

Use `redis-py` (which has full async support since 4.2; the old `aioredis` package is now part of `redis.asyncio`). Single connection pool, instantiated in `lifespan`, attached to `app.state.redis` and yielded via `Depends(get_redis)`.

```python
# app/deps/cache.py
from redis.asyncio import Redis, ConnectionPool

_pool: ConnectionPool | None = None

async def init_redis() -> None:
    global _pool
    _pool = ConnectionPool.from_url(settings.redis_url, decode_responses=True)

async def get_redis() -> Redis:
    return Redis(connection_pool=_pool)

async def close_redis() -> None:
    if _pool:
        await _pool.disconnect()
```

---

## 6. Component Boundaries (final summary)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Browser (React 19, persona shell)                                            │
│ ─ apiRequest<T> in src/services/api/http.ts ─ Bearer token injection         │
│ ─ WebSocket client in ElderVoice (16kHz PCM via AudioWorklet)                │
└────────────────┬────────────────────────────────────────┬───────────────────┘
                 │ HTTPS REST + WebSocket                 │ direct PUT (presigned)
                 │ Authorization: Bearer <jwt>            │
                 ▼                                        ▼
┌─────────────────────────────────────────┐  ┌──────────────────────────────┐
│ FastAPI (Alibaba ECS, ap-southeast-3)    │  │ AWS S3 (ap-southeast-1)      │
│                                          │  │  - kyc bucket (24h TTL)      │
│  routers/  → schemas (Pydantic)          │  │  - audio bucket (BM/Tamil)   │
│  services/ → models (SQLAlchemy)         │  │                              │
│  integrations/ → boto3, OSS, Qwen        │  └──────────┬───────────────────┘
│  deps/     → DI: db, redis, clients      │             │ read by Transcribe Batch
│                                          │             │ read by Textract / Rekognition
│         │  read/write     │ R/W cache    │             ▼
│         ▼                 ▼              │  ┌──────────────────────────────┐
│  ┌──────────────┐  ┌────────────────┐    │  │ AWS AI services              │
│  │ ApsaraDB PG  │  │ Tair (Redis)   │    │  │  - Transcribe Streaming WS   │
│  │ (primary    )│  │ (read-through  │    │  │  - Transcribe Batch          │
│  │              │  │  cache)        │    │  │  - Textract AnalyzeID        │
│  └──────────────┘  └────────────────┘    │  │  - Rekognition CompareFaces  │
│                                          │  │  - Rekognition Liveness      │
│  ┌──────────────┐                        │  └──────────────────────────────┘
│  │ Alibaba OSS  │  ← provider photos     │
│  └──────────────┘                        │  ┌──────────────────────────────┐
│                                          │  │ DashScope / Qwen             │
│  WS proxy ─ amazon-transcribe SDK        │  │  - JSON extraction           │
│  Qwen client ─ httpx async               │  │  - listing copy gen          │
│                                          │  │  - matching ranking          │
└──────────────────────────────────────────┘  └──────────────────────────────┘
```

### Internal module dependency rules

```
routers      → schemas, services, deps
services     → models, schemas (response types only), integrations
integrations → SDK clients only (boto3, oss, httpx)
models       → db.base
schemas      → (no internal deps; Pydantic only)
deps         → core, db.session, integrations
core         → (leaves; no internal deps)
```

If you find a router importing `boto3` directly, or a service importing `fastapi`, you've crossed a boundary.

---

## Sources

- `frontend/src/prototype/mock-data.js` — exact field shapes for PROVIDERS, listings, bookings, alerts, timeline, reviews
- `frontend/src/services/api/types.ts` — current DTOs
- `frontend/src/services/api/endpoints/{auth,elder,requestor,companion,kyc}.ts` — exact endpoint paths and request/response shapes
- `frontend/docs/API_READY_MIGRATION.md` — type-gap inventory
- `MULTI-CLOUD-ARCHITECTURE.md` — cloud split, voice flow, Qwen prompt
- `.planning/PROJECT.md` — Active requirements, Constraints, Key Decisions
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md` — repo state
- AWS Transcribe streaming Python SDK docs (Context7 `/websites/aws_amazon_transcribe_dg`) — confirms `amazon-transcribe` SDK, async iterator pattern, 16kHz PCM, chunk-size guidance
- FastAPI WebSocket reference (Context7 `/websites/fastapi_tiangolo`) — `iter_bytes`, `receive_bytes`, `WebSocketDisconnect` handling
- Deleted scaffold (`git show 3de5f53:backend/pyproject.toml`) — confirms `fastapi>=0.136`, `sqlalchemy>=2.0.49`, `asyncpg>=0.31`, Python ≥3.12

**Confidence by area:**
- FastAPI module layout: HIGH (matches frontend mirror, FastAPI community-standard structure, validated against deleted scaffold)
- Postgres schema: HIGH (every column traced to a mock-data field or DTO field; coverage check table shows full mapping)
- Voice WS flow: HIGH (Context7 confirms SDK API; FastAPI iter_bytes pattern is documented)
- KYC flow: MEDIUM (decision thresholds for similarity/confidence are guesses — flag for tuning during implementation)
- Build order: HIGH (DAG is mechanical from module dependencies)
- Redis cache keys: MEDIUM (TTLs are educated estimates; real numbers need load testing)
