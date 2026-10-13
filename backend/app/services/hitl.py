"""In-process HITL proposal store and mutation executor (Sprint 4).

Humans propose writes; approve executes domain services; agents never mutate.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.domain.engine import CostingError, InventoryError
from app.repository.memory import InMemoryRepository
from app.schemas.hitl import ProposalAction, ProposalStatus
from app.services import inventory as inventory_svc


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class HitlProposal:
    id: str
    action: ProposalAction
    summary: str
    payload: dict[str, Any]
    status: ProposalStatus = "pending"
    created_at: str = field(default_factory=_utc_now_iso)
    resolved_at: str | None = None
    feedback: str | None = None
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "action": self.action,
            "summary": self.summary,
            "payload": self.payload,
            "status": self.status,
            "created_at": self.created_at,
            "resolved_at": self.resolved_at,
            "feedback": self.feedback,
            "result": self.result,
            "error": self.error,
        }


class HitlStore:
    """Thread-safe in-memory proposal queue (single-process MVP)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._proposals: dict[str, HitlProposal] = {}

    def clear(self) -> None:
        with self._lock:
            self._proposals.clear()

    def create(
        self,
        *,
        action: ProposalAction,
        summary: str,
        payload: dict[str, Any],
    ) -> HitlProposal:
        proposal = HitlProposal(
            id=str(uuid.uuid4()),
            action=action,
            summary=summary.strip(),
            payload=dict(payload),
        )
        with self._lock:
            self._proposals[proposal.id] = proposal
        return proposal

    def get(self, proposal_id: str) -> HitlProposal | None:
        with self._lock:
            return self._proposals.get(proposal_id)

    def list(
        self,
        *,
        status: ProposalStatus | None = None,
    ) -> list[HitlProposal]:
        with self._lock:
            rows = list(self._proposals.values())
        if status is not None:
            rows = [p for p in rows if p.status == status]
        rows.sort(key=lambda p: p.created_at, reverse=True)
        return rows

    def reject(self, proposal_id: str, feedback: str) -> HitlProposal:
        trimmed = feedback.strip()
        if not trimmed:
            raise HitlError(
                "feedback_required",
                "Reject requires non-empty feedback",
                {"proposal_id": proposal_id},
            )
        with self._lock:
            proposal = self._proposals.get(proposal_id)
            if proposal is None:
                raise HitlError(
                    "proposal_not_found",
                    f"Proposal {proposal_id} not found",
                    {"proposal_id": proposal_id},
                )
            if proposal.status != "pending":
                raise HitlError(
                    "proposal_not_pending",
                    "Only pending proposals can be rejected",
                    {"proposal_id": proposal_id, "status": proposal.status},
                )
            proposal.status = "rejected"
            proposal.feedback = trimmed
            proposal.resolved_at = _utc_now_iso()
            return proposal


class HitlError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


_STORE = HitlStore()


def get_hitl_store() -> HitlStore:
    return _STORE


def reset_hitl_store() -> None:
    """Test helper: wipe proposals between cases."""
    _STORE.clear()


def _order_to_dict(order: Any) -> dict[str, Any]:
    return {
        "id": order.id,
        "recipe_id": order.recipe_id,
        "fg_sku": order.fg_sku,
        "quantity": order.quantity,
        "sell_price": order.sell_price,
        "status": order.status,
        "cost_at_sale": order.cost_at_sale,
        "revenue": order.revenue,
        "created_at": order.created_at.isoformat(),
        "completed_at": (
            order.completed_at.isoformat() if order.completed_at else None
        ),
    }


def _execute_action(
    repo: InMemoryRepository,
    action: ProposalAction,
    payload: dict[str, Any],
) -> dict[str, Any]:
    if action == "inventory_adjust":
        item_type = payload.get("item_type")
        sku = payload.get("sku")
        delta = payload.get("delta")
        reason = payload.get("reason")
        if item_type not in ("RM", "FG"):
            raise InventoryError(
                "invalid_payload",
                "inventory_adjust requires item_type RM or FG",
                {"payload": payload},
            )
        if not isinstance(sku, str) or not sku:
            raise InventoryError(
                "invalid_payload",
                "inventory_adjust requires sku",
                {"payload": payload},
            )
        if delta is None:
            raise InventoryError(
                "invalid_payload",
                "inventory_adjust requires delta",
                {"payload": payload},
            )
        if not isinstance(reason, str) or not reason.strip():
            raise InventoryError(
                "invalid_payload",
                "inventory_adjust requires reason",
                {"payload": payload},
            )
        return inventory_svc.apply_manual_adjustment(
            repo,
            item_type=item_type,  # type: ignore[arg-type]
            sku=sku,
            delta=float(delta),
            reason=reason,
            actor="hitl",
        )

    if action == "order_create":
        recipe_id = payload.get("recipe_id")
        quantity = payload.get("quantity")
        sell_price = payload.get("sell_price")
        if not isinstance(recipe_id, str) or not recipe_id:
            raise InventoryError(
                "invalid_payload",
                "order_create requires recipe_id",
                {"payload": payload},
            )
        if quantity is None:
            raise InventoryError(
                "invalid_payload",
                "order_create requires quantity",
                {"payload": payload},
            )
        order = inventory_svc.create_order(
            repo,
            recipe_id=recipe_id,
            quantity=float(quantity),
            sell_price=float(sell_price) if sell_price is not None else None,
        )
        return _order_to_dict(order)

    if action == "order_produce":
        order_id = payload.get("order_id")
        if not isinstance(order_id, str) or not order_id:
            raise InventoryError(
                "invalid_payload",
                "order_produce requires order_id",
                {"payload": payload},
            )
        order = inventory_svc.produce_order(repo, order_id)
        return _order_to_dict(order)

    if action == "order_ship":
        order_id = payload.get("order_id")
        if not isinstance(order_id, str) or not order_id:
            raise InventoryError(
                "invalid_payload",
                "order_ship requires order_id",
                {"payload": payload},
            )
        order = inventory_svc.ship_order(repo, order_id)
        return _order_to_dict(order)

    raise HitlError(
        "unsupported_action",
        f"Unsupported HITL action: {action}",
        {"action": action},
    )


def approve_proposal(
    store: HitlStore,
    repo: InMemoryRepository,
    proposal_id: str,
    *,
    feedback: str | None = None,
) -> HitlProposal:
    proposal = store.get(proposal_id)
    if proposal is None:
        raise HitlError(
            "proposal_not_found",
            f"Proposal {proposal_id} not found",
            {"proposal_id": proposal_id},
        )
    if proposal.status != "pending":
        raise HitlError(
            "proposal_not_pending",
            "Only pending proposals can be approved",
            {"proposal_id": proposal_id, "status": proposal.status},
        )

    try:
        result = _execute_action(repo, proposal.action, proposal.payload)
    except (InventoryError, CostingError) as exc:
        proposal.status = "failed"
        proposal.resolved_at = _utc_now_iso()
        proposal.feedback = feedback.strip() if feedback else None
        proposal.error = {
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        }
        return proposal

    proposal.status = "approved"
    proposal.resolved_at = _utc_now_iso()
    proposal.feedback = feedback.strip() if feedback else "Approved"
    proposal.result = result
    proposal.error = None
    return proposal


def validate_proposal_payload(action: ProposalAction, payload: dict[str, Any]) -> None:
    """Lightweight create-time checks so pending queue stays actionable."""
    if action == "inventory_adjust":
        if payload.get("item_type") not in ("RM", "FG"):
            raise HitlError(
                "invalid_payload",
                "inventory_adjust requires item_type RM or FG",
                {"payload": payload},
            )
        if not payload.get("sku"):
            raise HitlError(
                "invalid_payload",
                "inventory_adjust requires sku",
                {"payload": payload},
            )
        if "delta" not in payload:
            raise HitlError(
                "invalid_payload",
                "inventory_adjust requires delta",
                {"payload": payload},
            )
        if not str(payload.get("reason", "")).strip():
            raise HitlError(
                "invalid_payload",
                "inventory_adjust requires reason",
                {"payload": payload},
            )
    elif action == "order_create":
        if not payload.get("recipe_id"):
            raise HitlError(
                "invalid_payload",
                "order_create requires recipe_id",
                {"payload": payload},
            )
        if "quantity" not in payload:
            raise HitlError(
                "invalid_payload",
                "order_create requires quantity",
                {"payload": payload},
            )
    elif action in ("order_produce", "order_ship"):
        if not payload.get("order_id"):
            raise HitlError(
                "invalid_payload",
                f"{action} requires order_id",
                {"payload": payload},
            )
