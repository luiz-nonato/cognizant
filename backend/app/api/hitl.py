"""HITL proposal endpoints — human confirmation before domain mutations."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.errors import error_payload
from app.auth import require_auth_if_configured
from app.deps import get_repository
from app.repository.memory import InMemoryRepository
from app.schemas.hitl import (
    HitlApproveRequest,
    HitlProposalCreate,
    HitlProposalOut,
    HitlRejectRequest,
    ProposalStatus,
)
from app.services import hitl as hitl_svc
from app.services.hitl import HitlError, HitlStore, get_hitl_store

router = APIRouter(
    prefix="/hitl",
    tags=["hitl"],
    dependencies=[Depends(require_auth_if_configured)],
)


def _store() -> HitlStore:
    return get_hitl_store()


def _http_for_hitl(exc: HitlError) -> HTTPException:
    not_found = {"proposal_not_found"}
    code = (
        status.HTTP_404_NOT_FOUND
        if exc.code in not_found
        else status.HTTP_400_BAD_REQUEST
    )
    return HTTPException(
        status_code=code,
        detail=error_payload(exc.code, exc.message, exc.details),
    )


def _to_out(proposal: hitl_svc.HitlProposal) -> HitlProposalOut:
    return HitlProposalOut(**proposal.to_dict())


@router.post(
    "/proposals",
    response_model=HitlProposalOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_proposal(
    body: HitlProposalCreate,
    store: HitlStore = Depends(_store),
) -> HitlProposalOut:
    try:
        hitl_svc.validate_proposal_payload(body.action, body.payload)
    except HitlError as exc:
        raise _http_for_hitl(exc) from exc
    proposal = store.create(
        action=body.action,
        summary=body.summary,
        payload=body.payload,
    )
    return _to_out(proposal)


@router.get("/proposals", response_model=list[HitlProposalOut])
async def list_proposals(
    status_filter: Literal["pending", "approved", "rejected", "failed"] | None = Query(
        default=None,
        alias="status",
    ),
    store: HitlStore = Depends(_store),
) -> list[HitlProposalOut]:
    typed: ProposalStatus | None = status_filter
    return [_to_out(p) for p in store.list(status=typed)]


@router.get("/proposals/{proposal_id}", response_model=HitlProposalOut)
async def get_proposal(
    proposal_id: str,
    store: HitlStore = Depends(_store),
) -> HitlProposalOut:
    proposal = store.get(proposal_id)
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_payload(
                "proposal_not_found",
                f"Proposal {proposal_id} not found",
                {"proposal_id": proposal_id},
            ),
        )
    return _to_out(proposal)


@router.post("/proposals/{proposal_id}/approve", response_model=HitlProposalOut)
async def approve_proposal(
    proposal_id: str,
    body: HitlApproveRequest | None = None,
    store: HitlStore = Depends(_store),
    repo: InMemoryRepository = Depends(get_repository),
) -> HitlProposalOut:
    feedback = body.feedback if body else None
    try:
        proposal = hitl_svc.approve_proposal(
            store,
            repo,
            proposal_id,
            feedback=feedback,
        )
    except HitlError as exc:
        raise _http_for_hitl(exc) from exc
    return _to_out(proposal)


@router.post("/proposals/{proposal_id}/reject", response_model=HitlProposalOut)
async def reject_proposal(
    proposal_id: str,
    body: HitlRejectRequest,
    store: HitlStore = Depends(_store),
) -> HitlProposalOut:
    try:
        proposal = store.reject(proposal_id, body.feedback)
    except HitlError as exc:
        raise _http_for_hitl(exc) from exc
    return _to_out(proposal)
