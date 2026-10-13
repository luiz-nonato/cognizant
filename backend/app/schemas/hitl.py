"""HITL proposal schemas (Sprint 4 human confirmation gates)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


ProposalAction = Literal[
    "inventory_adjust",
    "order_create",
    "order_produce",
    "order_ship",
]
ProposalStatus = Literal["pending", "approved", "rejected", "failed"]


class HitlProposalCreate(BaseModel):
    action: ProposalAction
    summary: str = Field(min_length=1, max_length=500)
    payload: dict[str, Any] = Field(default_factory=dict)


class HitlRejectRequest(BaseModel):
    feedback: str = Field(min_length=1, max_length=1000)


class HitlApproveRequest(BaseModel):
    feedback: str | None = Field(default=None, max_length=1000)


class HitlProposalOut(BaseModel):
    id: str
    action: ProposalAction
    summary: str
    payload: dict[str, Any]
    status: ProposalStatus
    created_at: str
    resolved_at: str | None = None
    feedback: str | None = None
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
