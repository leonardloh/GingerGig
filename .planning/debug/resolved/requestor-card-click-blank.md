---
status: resolved
trigger: "[Image #1] when i click this card in the requestor view (after login as requestor) it shows blank and empty screen."
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: requestor-card-click-blank

## Symptoms

- expected_behavior: Clicking a provider/listing card in the requestor view should open the corresponding detail or booking flow.
- actual_behavior: The app renders a blank, empty screen after clicking the card.
- error_messages: Unknown; browser console/runtime error not yet captured.
- timeline: Unknown; reported during current requestor-view testing.
- reproduction: Log in as requestor, find the card showing "Makcik Siti" / "Traditional Malay Cooking", then click the card.

## Current Focus

- hypothesis: ProviderDetail violated React hook ordering by calling favToast state only after the provider fetch populated p.
- test: Move all ProviderDetail hooks above the early return and run frontend verification.
- expecting: The detail screen no longer crashes after the selected provider loads.
- next_action: complete
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-26; observation: ProviderDetail initialized p/faved hooks, then returned null while p was missing, then declared favToast after the early return. First render called fewer hooks than the render after api.requestor.getProvider resolved, which matches a blank screen after clicking a card.
- timestamp: 2026-04-26; observation: npm run build in frontend completed successfully after moving favToast initialization.

## Eliminated

## Resolution

- root_cause: React hook-order violation in ProviderDetail.
- fix: Moved favToast state initialization before the early return so every render calls the same hooks.
- verification: npm run build
- files_changed: frontend/src/prototype/requestor-screens.jsx
