# Ginger Gig — Design Notes

A high‑fidelity prototype of a hyperlocal gig‑work app designed for Malaysian elders ("makcik & pakcik") with a complementary buyer app and a family‑carer companion app. Built as a single multi‑persona prototype so the same data flows can be viewed from each side.

> Entry: `frontend/index.html` → `src/main.tsx` → `src/App.tsx` → `src/prototype/PrototypeApp.jsx`
> Personas: **Elder (Provider)**, **Requestor (Buyer)**, **Family (Companion)**
> Languages: **Bahasa Malaysia · English · 中文 · தமிழ்** (live toggle)

---

## 1. Product premise

Older adults in Malaysia have time, skills (cooking, tailoring, tutoring, handywork) and a need for supplemental income — but mainstream gig apps are dense, English‑only, fast‑moving and built for younger riders/drivers. Ginger Gig is a calmer, multilingual marketplace where elders can list small services from their kampung or neighbourhood, accept booking requests on their own terms, and have a family member quietly watching over their activity.

The name is a play on _halia_ (ginger) — warming, slightly spicy, and very Malaysian — and also nods to "gigs". The brand mark is a hand‑drawn knobby ginger root in warm terracotta with cream leaves.

### Three audiences, one product

| Persona                | Who                                                         | Primary need                                                     |
| ---------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| **Elder (Provider)**   | Makcik Siti, 68, sells home‑cooked kuih and weekday lunches | Earn small extra income with dignity, on her own schedule        |
| **Requestor (Buyer)**  | Amir, 32, busy professional in Damansara                    | Trustworthy home‑cooked food / handywork from real neighbours    |
| **Family (Companion)** | Faiz, mum's son in Singapore                                | Light‑touch peace of mind that mum is okay and not over‑doing it |

---

## 2. Visual & interaction system

### Type

- **Display:** _Fraunces_ — soft slab serif, warm and editorial. Used at large sizes (`24–48px`) and never below `18px`.
- **Body:** _Inter_ — neutral sans for UI. Body floor is `15px` (vs. typical `13–14px`) to respect ageing eyes.
- **Numbers in stats** — Fraunces at large weight 400 for an "almanac"/ledger feel rather than dashboard‑slick.

### Colour

A warm, kitchen‑cabinet palette — terracotta primary, cream paper, deep brown ink. Avoids the cold blue/teal of most gig apps.

- `--primary: #C2662D` (terracotta)
- `--primary-subtle: #FBE4CC`
- `--bg: #FBF6EE` (cream paper)
- `--bg-2: #F4ECDF` (deeper cream)
- `--surface: #FFFFFF`
- `--text-1: #2A1F17` (deep brown)
- `--text-2: #5C4B3D` · `--text-3: #8C7867`
- `--success: #4A7C59` · `--warning: #D89344` · `--error: #B5443B`
- Accent tones for avatars: `warm`, `teal`, `sand`, `plum`

### Spacing & shape

- `border-radius` of cards: `14–16px` — friendly but not childish
- Card shadows are intentionally soft (`0 1px 3px rgba(0,0,0,0.04)`) to keep paper‑like calmness
- Generous tap targets (`44px+` floor everywhere; key CTAs `56px`)
- 16px gutter on mobile, capped 720–960px content widths on desktop

### Tone of voice

- Greet by name, not by metric ("Selamat petang, Cik Siti" not "Welcome back, user")
- Short, plain sentences. Never gamified ("level up" / "streaks") for the elder
- Numbers are always softened with context ("3 this month", "5+ active days = rest reminder")

---

## 3. Information architecture

### Elder (Provider) tabs

1. **Laman Utama / Home** — today's bookings, quick actions, gentle weekly snapshot
2. **Penyenaraian / Listings** — services she offers
3. **Pendapatan / Earnings** — money in, with friendly framing
4. **Profil / Profile**

### Requestor (Buyer) tabs

1. **Home** — greeting + big search bar + saved providers + nearby
2. **Search** — results list filterable by cuisine, distance, halal, etc.
3. **Bookings** — what I've ordered
4. **Profile** — me as a buyer

### Family (Companion) tabs

1. **Dashboard** — high‑level "is mum doing okay?" view
2. **Alerts** — live activity feed and concerns
3. **Profile** — my carer settings and care circle

A persona switcher in the top‑right of the prototype lets you flip between the three apps with the same underlying mock data.

---

## 4. Screen‑by‑screen design notes

### 4.1 Elder · Home

- **Hero greeting** in Fraunces 32–40px. Time‑of‑day aware.
- **Today's bookings strip** — actionable cards, not a calendar grid. Each shows requestor portrait, what they ordered, when, and a single primary action ("Confirm" / "Mark ready").
- **Quick actions** — Add listing · Boost · Message family · Pause for today. The "pause" button is a deliberate counter to growth‑hacker apps that punish you for resting.
- **This week** snapshot card with 3 simple stats, framed as encouragement rather than KPIs.

### 4.2 Elder · Listings

- Card grid of services; tapping reveals an editor.
- Empty state has a hand‑drawn illustration of a ginger root with a plate, with copy in the user's chosen language.

### 4.3 Elder · Earnings

- Big Fraunces RM total at top, "since you joined" sub‑label.
- Bar chart of last 8 weeks, deliberately low‑contrast (it's information, not motivation).
- Withdraw flow uses Maybank/CIMB iconography; copy reassures: "Goes straight to your account, no extra charge."

### 4.4 Elder · Profile

- Personal photo, age, kampung, languages spoken.
- Skills as warm chips ("Masakan Melayu", "Kuih‑muih", "Jahitan").
- Family member listed separately ("Faiz is watching over you. He won't see your messages.") — privacy boundary stated in plain language.

### 4.5 Requestor · Home

- Time‑of‑day greeting in Fraunces.
- **Search bar**: leading magnifier glyph, secondary mic button (soft outline), and a primary **Search** button that highlights when there's text. Mic and Search side by side because not every elder/buyer knows to press Enter on a keyboard.
- Saved providers row · Nearby today · Trending in your area.

### 4.6 Requestor · Search

- Inline filter chips (Halal, ≤3km, Under RM30, Open now) above results.
- Result cards: portrait, name, signature dish, rating, distance, price range. Designed to read more like a market stall directory than an Uber‑Eats list.

### 4.7 Requestor · Provider Detail

- Hero with portrait + name in Fraunces + accent‑coloured avatar background.
- Story paragraph (2–3 sentences) — humanises the provider before menu.
- Menu list with portion sizes and notes ("hari Selasa sahaja" — Tuesdays only).
- Reviews quoted in original language with translation toggle.
- Sticky **Book** CTA on mobile.

### 4.8 Requestor · Profile _(buyer‑centric)_

- Account header + Edit.
- Three stats: bookings made, providers helped, reviews left.
- **Saved providers** row of favourite cards with hearts.
- **Your preferences**: dietary chips (Halal / Vegetarian / No seafood / Mild), cuisine likes, default delivery area & radius.
- **Notifications** toggles: matches, deals, reminders.
- Payment methods + Account settings (language, privacy, help, sign out).

### 4.9 Family · Dashboard

- "Watching over **Makcik Siti**" hero card with live status dot ("Active 8 minutes ago").
- Three stat tiles: this week's earnings · bookings completed · active days.
- Light timeline of mum's recent activity with friendly verbs ("Confirmed booking with Amir for tomorrow") rather than system logs.
- A "Send mum a note" composer at the bottom — simple message, not a chat thread, to keep it low‑friction.

### 4.10 Family · Alerts

- Distinctly _not_ a notifications log. It surfaces **two** kinds of signals only:
  1. **Care signals** — inactivity, overwork patterns, missed bookings.
  2. **Celebrations** — milestones, first‑time achievements, kind reviews.
- Each item has a clear next step ("Call mum" / "Send a note" / "Mark seen").
- Empty state: "All clear. Mum is doing fine."

### 4.11 Family · Profile _(carer‑centric)_

- "Carer account" header so the role is named.
- **Watching over** card (warm gradient) with mum's portrait, status, and a primary **Call** button — the most important action in the whole app for this persona.
- **Care circle** — other family members with the same view; invite flow.
- **When to alert you** — toggles, with the safety‑critical ones tagged with a `SAFETY` chip:
  - If mum hasn't opened the app for 24h
  - 5+ consecutive active days = rest reminder
  - Earnings milestones, new bookings, reviews, app updates
- **Activity digest** schedule (off / daily / weekly).
- **Emergency contact** card with a red accent — local relative with phone number, separate from the digital care circle.
- **What you can see** — a transparency panel showing exactly which of mum's data is shared vs private. Mum controls this; carer can only view.

### 4.12 Persona‑swap & language toggles

- Top‑right pill switches between Elder / Requestor / Family with cross‑fade.
- Language picker shows native script labels ("Bahasa Malaysia · English · 中文 · தமிழ்") and re‑renders the whole UI.

---

## 5. Key design decisions & why

1. **Two different "Profile" mental models, not one.** The Requestor profile is about _managing my needs_ (preferences, payment, saved providers). The Family profile is about _keeping mum safe_ (alerts, care circle, emergency, permissions). One template would have been cheaper to build, but the right design follows the user's intent.

2. **The mic isn't the only way to search.** A primary Search button sits next to the mic so users who don't know about Enter‑to‑search aren't stuck. The mic is styled as a softer secondary action.

3. **Carer profile leads with "Call mum".** Carers don't open the app to read a dashboard — they open it because they're worried. The first interactive element should resolve that worry in one tap.

4. **Safety‑tagged alerts.** Toggles for inactivity and overwork carry a `SAFETY` chip so a hurried user can tell at a glance which switches matter most and shouldn't turn off.

5. **Privacy stated in human language.** "Mum has shared this with you. She can change it anytime." — this is the entire trust contract, in one sentence, on the carer profile.

6. **Honour the elder's pace.** No streaks, no boosts that punish rest, no countdown timers on bookings. The "Pause for today" button is a feature, not a setting buried three menus deep.

7. **Warm, kitchen palette over fintech blue.** This is a marketplace where someone's mum sells you kuih lapis. It should feel like a kitchen, not a bank.

8. **Multilingual from day one.** Not as a settings afterthought — the language picker is in the top bar of every screen. Translations cover BM, EN, 中文, தமிழ்.

---

## 6. File structure

The app is a React 19 + Vite + TypeScript project. The Claude design prototype is preserved verbatim under `src/prototype/` and re-exported from `src/App.tsx`, so the visual design stays as the source of truth while the rest of the codebase grows around it.

```
frontend/
├── index.html                       Vite HTML entry
├── package.json / vite.config.ts    React 19, Vite 8, ESLint, Prettier
├── tsconfig.{json,app,node}.json    TypeScript project refs
├── eslint.config.js
├── DESIGN_NOTES.md                  this file
├── docs/
│   └── API_READY_MIGRATION.md       plan for wiring the API layer to UI
├── uploads/                         original Claude design references (images, prompt)
└── src/
    ├── main.tsx                     mounts <App /> into #root
    ├── App.tsx                      currently re-exports PrototypeApp
    ├── index.css                    global resets
    ├── jsx-modules.d.ts             TS shim so .tsx can import .jsx files
    │
    ├── prototype/                   ── the live UI (Claude design, untyped) ──
    │   ├── PrototypeApp.jsx         persona switcher, routing between tabs
    │   ├── components.jsx           shared primitives: Avatar, Card, Icon, Button…
    │   ├── elder-screens.jsx        provider home, listings, earnings, profile
    │   ├── requestor-screens.jsx    buyer home, search, provider detail, profile
    │   ├── companion-screens.jsx    family dashboard, alerts, profile
    │   ├── tweaks-panel.jsx         in-prototype design tweaks panel
    │   ├── mock-data.js             providers, bookings, alerts, portraits, timeline
    │   ├── i18n.js                  4-language string table + makeT() helper
    │   └── prototype.css            design tokens + layout shell CSS
    │
    ├── config/                      ── scaffolding for backend integration ──
    │   └── env.ts                   reads VITE_* env vars
    └── services/api/
        ├── http.ts                  fetch client (timeout + auth header)
        ├── index.ts                 barrel export
        ├── types.ts                 shared API DTOs
        └── endpoints/
            ├── auth.ts
            ├── elder.ts
            ├── requestor.ts
            └── companion.ts
```

The `config/` and `services/api/` folders are not yet imported by the UI; they exist as the planned backend integration surface (see `docs/API_READY_MIGRATION.md`).

---

## 7. Open questions / next iterations

- **Onboarding for the elder** — a 3‑step flow that doesn't feel like a wizard. Probably a single scrollable page with a friend or family member coaching alongside.
- **Voice search results screen** — currently the mic opens a placeholder modal; the actual transcript‑to‑results experience hasn't been designed yet.
- **Booking detail screens** for both buyer and provider — a shared timeline with messages, payment status, and a "report a problem" path that goes to a human.
- **First‑run for the carer** — a permission‑setting flow run _with mum_, not for her, so she explicitly chooses what to share.
- **Accessibility audit** — colour contrast at the largest text sizes is good, but small chips and disabled states need a pass; also need to validate Tamil and Chinese typography sizing across screens.
