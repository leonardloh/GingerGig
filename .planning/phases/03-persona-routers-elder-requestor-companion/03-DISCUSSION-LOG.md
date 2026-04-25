# Phase 3: Persona Routers (Elder + Requestor + Companion) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 03-persona-routers-elder-requestor-companion
**Areas discussed:** Demo-first scope, search match values, persona data behavior

---

## Demo-First Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full implementation | Implement all Phase 3 requirements with production-leaning behavior and live service integration where named. | |
| Quick demo implementation | Keep the endpoint contract real, but prefer deterministic seeded data and simple behavior where that preserves the existing UI. | yes |

**User's choice:** This is just a quick demo.
**Notes:** The phase should focus on making the app work predictably from Postgres without expanding scope or depending on avoidable live services.

---

## Search Match Values

| Option | Description | Selected |
|--------|-------------|----------|
| Live Qwen | Call DashScope/Qwen during requestor search to generate `matchScore` and `matchReason`. | |
| Seeded values | Return `matchScore` and `matchReason` from seeded provider/listing data. | yes |
| Deterministic heuristic | Compute simple values from rating, distance, category, and filters. | |

**User's choice:** Return the seeded values.
**Notes:** The assistant clarified that skipping live Qwen means no real DashScope API call in Phase 3. The frontend still receives the smart-match fields, but they come from prepared seed data.

---

## Persona Data Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Strict demo contract | Basic role/ownership checks, SQL locale projection, server-inferred booking snapshots, seeded/derived companion data. | yes |
| Broader production policy | General permission framework, complex alert filtering, live ranking behavior, and extra hardening. | |

**User's choice:** Proceed with the demo-first revision.
**Notes:** Locked decisions: basic role/ownership checks, locale display fields with English fallback, server-side booking snapshot inference, seeded/derived companion dashboard/alerts/timeline, and persisted alert preferences without complex filtering.

---

## Claude's Discretion

- Exact serializer/module boundaries and helper extraction.
- Exact fallback behavior if a seeded `matchScore` or `matchReason` is missing.
- Exact implementation mechanics for SQL locale projection, provided it happens server-side with English fallback.

## Deferred Ideas

- Live Qwen search ranking and generated match explanations.
- Complex companion alert filtering based on preferences.
- Production recommendation/scoring logic.
