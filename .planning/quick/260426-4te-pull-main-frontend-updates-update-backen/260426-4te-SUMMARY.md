---
quick_id: 260426-4te
slug: pull-main-frontend-updates-update-backen
status: complete
completed: 2026-04-25
commit: 9468f2d
---

# Quick Task 260426-4te Summary

Pulled the latest `origin/main` frontend updates into the `backend` branch and resolved the API conflicts so the merged frontend can run against FastAPI locally.

## Completed

- Merged `origin/main` and kept the new landing/PWA/assets/layout work from the frontend branch.
- Restored real backend demo login for quick-login cards instead of runtime mock bypass.
- Preserved the Phase 5 `ElderVoice` backend transport after the main merge so streaming/batch voice still uses `api.voice`.
- Added backend `elderAge` to listing responses and adapted requestor, elder, and companion API modules to the merged UI shapes.
- Replaced the KYC stub with a local no-persist contract for session, upload, verify, status, and retry so onboarding can complete without cloud services.
- Added `backend/tests/test_kyc_local.py`.

## Verification

- `cd backend && uv run pytest -q` - passed, `84 passed`, 2 existing pytest mark warnings.
- `cd frontend && npm run typecheck` - passed.
- `cd frontend && npm run lint` - passed.
- `cd frontend && npm run build` - passed.
- Local smoke on `127.0.0.1:8001` and `127.0.0.1:5175` - passed health, login, `auth/me`, elder listings, KYC session/upload/verify/status, and Vite page fetch.

## Notes

Port `8000` was already occupied by another FastAPI process, so verification used `8001` for this branch's backend and `5175` for Vite with `VITE_API_BASE_URL=http://127.0.0.1:8001`.

## Commits

- `720c3b3` - merge main frontend updates into backend and adapt API contracts.
- `f39d78f` - remove the local `%VITE_CDN_URL%` Vite warning.
- `9468f2d` - restore `ElderVoice` WebSocket/batch backend transport after the merge.
