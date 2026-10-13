"""Shared error envelope (SAD §4)."""

from typing import Any

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorBody


class HealthOut(BaseModel):
    status: str = "ok"
    runtime: str
    storage: str = "memory"
    auth_mode: str
    llm_configured: bool


class MessageLimit:
    MAX_MESSAGE_CHARS = 4000
