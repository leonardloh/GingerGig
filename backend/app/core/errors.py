import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _envelope(status: int, message: str, detail: Any | None = None) -> JSONResponse:
    body: dict[str, Any] = {"status": status, "message": message}
    if detail is not None:
        body["detail"] = detail
    return JSONResponse(status_code=status, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        return _envelope(exc.status_code, exc.detail or "Request failed")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _envelope(422, "Validation failed", detail=exc.errors())

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("unhandled", extra={"path": request.url.path})
        return _envelope(500, "Internal server error")
