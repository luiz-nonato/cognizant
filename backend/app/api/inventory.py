from fastapi import APIRouter, Depends, HTTPException, status

from app.api.errors import error_payload
from app.auth import require_auth_if_configured
from app.deps import get_repository
from app.domain.engine import InventoryError
from app.repository.memory import InMemoryRepository
from app.schemas.inventory import AdjustmentCreate, AdjustmentOut, InventoryItemOut
from app.services import inventory as inventory_svc

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
    dependencies=[Depends(require_auth_if_configured)],
)


@router.get("", response_model=list[InventoryItemOut])
async def list_inventory(
    repo: InMemoryRepository = Depends(get_repository),
) -> list[InventoryItemOut]:
    return [InventoryItemOut(**row) for row in inventory_svc.list_inventory_rows(repo)]


@router.get("/adjustments", response_model=list[AdjustmentOut])
async def list_adjustments(
    repo: InMemoryRepository = Depends(get_repository),
) -> list[AdjustmentOut]:
    rows = repo.list_adjustments()
    return [
        AdjustmentOut(
            id=r.id,
            item_type=r.item_type,
            sku=r.sku,
            delta=r.delta,
            reason=r.reason,
            resulting_on_hand=r.resulting_on_hand,
            created_at=r.created_at.isoformat(),
            actor=r.actor,
        )
        for r in rows
    ]


@router.post(
    "/adjustments",
    response_model=AdjustmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_adjustment(
    body: AdjustmentCreate,
    repo: InMemoryRepository = Depends(get_repository),
) -> AdjustmentOut:
    try:
        result = inventory_svc.apply_manual_adjustment(
            repo,
            item_type=body.item_type,
            sku=body.sku,
            delta=body.delta,
            reason=body.reason,
        )
    except InventoryError as exc:
        code = (
            status.HTTP_404_NOT_FOUND
            if exc.code == "stock_item_not_found"
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=code,
            detail=error_payload(exc.code, exc.message, exc.details),
        ) from exc
    return AdjustmentOut(**result)
