from contextlib import asynccontextmanager
from typing import Any

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.session import build_engine, dispose_engine
from app.routers import (
    auth as auth_router,
)
from app.routers import (
    companion as companion_router,
)
from app.routers import (
    elder as elder_router,
)
from app.routers import (
    health as health_router,
)
from app.routers import (
    kyc as kyc_router,
)
from app.routers import (
    requestor as requestor_router,
)
from app.routers import (
    voice as voice_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = build_engine(settings)
    yield
    await dispose_engine(app.state.engine)


app = FastAPI(
    title="GingerGig API",
    version="0.1.0",
    debug=False,  # Pitfall 20: never True in any environment.
    lifespan=lifespan,
)

# CORS uses an explicit allowlist, never "*" (Pitfall 19, FOUND-03).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,  # Bearer token, no cookies.
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# /health is mounted without /api/v1 prefix per FOUND-01.
app.include_router(health_router.router)

API = "/api/v1"
app.include_router(auth_router.router, prefix=API)
app.include_router(elder_router.router, prefix=API)
app.include_router(requestor_router.router, prefix=API)
app.include_router(companion_router.router, prefix=API)
app.include_router(kyc_router.router, prefix=API)
app.include_router(voice_router.router, prefix=API)

# Test-only route exercising the global Exception handler (D-17 #4).
# Mounted under /__test__ so production tooling can identify and exclude it.
_test_router = APIRouter(prefix="/__test__", tags=["__test__"])


@_test_router.get("/boom")
async def _boom() -> dict[str, Any]:
    raise RuntimeError("kaboom")  # Intentional test fixture.


app.include_router(_test_router)
