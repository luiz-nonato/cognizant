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
    """output_pydantic model for explain_costing (and later specialists).

    Week 4 bonus: optional crew_plan / agent_reasoning are filled by the
    runtime after kickoff (not invented by the narrate model).
    """

    reply: str
    citations: dict[str, Any]
    grounding_timestamp: str
    agent: str
    crew_plan: str | None = None
    agent_reasoning: str | None = None
