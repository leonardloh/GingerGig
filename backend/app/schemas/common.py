from typing import Any, Literal

from pydantic import BaseModel


class ApiErrorBody(BaseModel):
    """Mirror of frontend ApiError shape from frontend/src/services/api/types.ts."""

    status: int
    message: str
    detail: Any | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
