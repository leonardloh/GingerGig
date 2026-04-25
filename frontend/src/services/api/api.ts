/**
 * Central API object — picks mock or real implementations based on VITE_USE_MOCK_API.
 *
 * Usage in any component or screen:
 *
 *   import { api } from '@/services/api/api';
 *
 *   // In a React component:
 *   const [listings, setListings] = useState<ElderListing[]>([]);
 *   useEffect(() => {
 *     api.elder.getElderListings(userId).then(setListings);
 *   }, [userId]);
 *
 * To switch to the real backend: set VITE_USE_MOCK_API=false in .env
 * and point VITE_API_BASE_URL at the running FastAPI server.
 * No component code changes required.
 */

import { env } from "../../config/env";

// ── Real implementations ───────────────────────────────────────────────────
import * as authReal from "./endpoints/auth";
import * as elderReal from "./endpoints/elder";
import * as requestorReal from "./endpoints/requestor";
import * as companionReal from "./endpoints/companion";
import * as kycReal from "./endpoints/kyc";

// ── Mock implementations ───────────────────────────────────────────────────
import * as authMock from "./mock/auth.mock";
import * as elderMock from "./mock/elder.mock";
import * as requestorMock from "./mock/requestor.mock";
import * as companionMock from "./mock/companion.mock";
import * as kycMock from "./mock/kyc.mock";

const USE_MOCK = env.useMockApi;

export const api = {
  auth: USE_MOCK ? authMock : authReal,
  elder: USE_MOCK ? elderMock : elderReal,
  requestor: USE_MOCK ? requestorMock : requestorReal,
  companion: USE_MOCK ? companionMock : companionReal,
  kyc: USE_MOCK ? kycMock : kycReal,
} as const;
