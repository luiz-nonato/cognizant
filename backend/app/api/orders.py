from fastapi import APIRouter, Depends, HTTPException, status

from app.api.errors import error_payload
from app.auth import require_auth_if_configured
from app.deps import get_repository
from app.domain.engine import CostingError, InventoryError
from app.domain.models import Order
from app.repository.memory import InMemoryRepository
from app.schemas.orders import OrderCreate, OrderOut
from app.services import inventory as inventory_svc

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    dependencies=[Depends(require_auth_if_configured)],
)


def _to_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        recipe_id=order.recipe_id,
        fg_sku=order.fg_sku,
        quantity=order.quantity,
        sell_price=order.sell_price,
        status=order.status,
        cost_at_sale=order.cost_at_sale,
        revenue=order.revenue,
        payment_method=order.payment_method,
        created_at=order.created_at.isoformat(),
        completed_at=order.completed_at.isoformat() if order.completed_at else None,
    )


def _http_for_domain(exc: InventoryError | CostingError) -> HTTPException:
    not_found = {
        "order_not_found",
        "recipe_not_found",
        "stock_item_not_found",
        "material_not_found",
    }
    code = (
        status.HTTP_404_NOT_FOUND
        if exc.code in not_found
        else status.HTTP_400_BAD_REQUEST
    )
    return HTTPException(
        status_code=code,
        detail=error_payload(exc.code, exc.message, exc.details),
    )


@router.get("", response_model=list[OrderOut])
async def list_orders(
    repo: InMemoryRepository = Depends(get_repository),
) -> list[OrderOut]:
    return [_to_out(o) for o in repo.list_orders()]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    repo: InMemoryRepository = Depends(get_repository),
) -> OrderOut:
    order = repo.get_order(order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_payload(
                "order_not_found",
                f"Order {order_id} not found",
                {"order_id": order_id},
            ),
        )
    return _to_out(order)


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    body: OrderCreate,
    repo: InMemoryRepository = Depends(get_repository),
) -> OrderOut:
    try:
        order = inventory_svc.create_order(
            repo,
            recipe_id=body.recipe_id,
            quantity=body.quantity,
            sell_price=body.sell_price,
            payment_method=body.payment_method,
        )
    except (InventoryError, CostingError) as exc:
        raise _http_for_domain(exc) from exc
    return _to_out(order)


@router.post("/{order_id}/produce", response_model=OrderOut)
async def produce_order(
    order_id: str,
    repo: InMemoryRepository = Depends(get_repository),
) -> OrderOut:
    try:
        order = inventory_svc.produce_order(repo, order_id)
    except (InventoryError, CostingError) as exc:
        raise _http_for_domain(exc) from exc
    return _to_out(order)


@router.post("/{order_id}/ship", response_model=OrderOut)
async def ship_order(
    order_id: str,
    repo: InMemoryRepository = Depends(get_repository),
) -> OrderOut:
    try:
        order = inventory_svc.ship_order(repo, order_id)
    except (InventoryError, CostingError) as exc:
        raise _http_for_domain(exc) from exc
    return _to_out(order)
