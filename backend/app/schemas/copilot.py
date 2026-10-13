"""Copilot chat request/response (ADR-15 / SAD §4)."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import MessageLimit


class CopilotContext(BaseModel):
    screen: Literal["recipe", "inventory", "orders", "dashboard"]
    entity_ids: list[str] | None = None


class CopilotChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MessageLimit.MAX_MESSAGE_CHARS)
    context: CopilotContext


class CopilotChatResponse(BaseModel):
    """output_pydantic model for explain_costing (and later specialists)."""

    reply: str
    citations: dict[str, Any]
    grounding_timestamp: str
    agent: str
