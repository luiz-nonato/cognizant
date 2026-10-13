"""Map domain errors to SAD error envelope."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from app.domain.engine import CostingError


def error_payload(code: str, message: str, details: dict | None = None) -> dict:
    body: dict = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return body


def costing_error_response(exc: CostingError, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=error_payload(exc.code, exc.message, exc.details),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=error_payload("internal_error", "Unexpected server error"),
    )
