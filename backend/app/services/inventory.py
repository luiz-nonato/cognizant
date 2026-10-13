"""Inventory and order transition services (DEC-05, DEC-06, DEC-15, ADR-11, ADR-16).

Cost basis (list_price, last_purchase_price, purchases, recipe unit cost / WA)
is never rewritten by manual adjust or by produce/ship stock movements.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.domain.engine import (
    InventoryError,
    compute_costing_snapshot,
    produce_consumption_plan,
    resolve_input_unit_cost,
)
from app.domain.models import AdjustmentAudit, ItemType, Order, StockBalance, utc_now
from app.repository.memory import InMemoryRepository
from app.services.costing import costing_snapshot_for_recipe


def _ensure_stock(
    repo: InMemoryRepository,
    item_type: ItemType,
    sku: str,
) -> StockBalance:
    existing = repo.get_stock(item_type, sku)
    if existing is not None:
        return existing

    if item_type == "RM":
        material = repo.get_material(sku)
        if material is None:
            raise InventoryError(
                "stock_item_not_found",
                f"Raw material {sku} not found",
                {"item_type": item_type, "sku": sku},
            )
        return StockBalance(
            item_type="RM",
            sku=sku,
            on_hand=0.0,
            name=material.name,
            uom=material.uom,
            reorder_point=material.reorder_point,
        )

    # FG: resolve from recipe finished_product_sku
    for recipe in repo.list_recipes():
        if recipe.finished_product_sku == sku:
            return StockBalance(
                item_type="FG",
                sku=sku,
                on_hand=0.0,
                name=recipe.name,
                uom="unit",
                reorder_point=0.0,
            )
    raise InventoryError(
        "stock_item_not_found",
        f"Finished-goods SKU {sku} not found",
        {"item_type": item_type, "sku": sku},
    )


def inventory_unit_cost(repo: InMemoryRepository, balance: StockBalance) -> float | None:
    """Display unit cost: WA/list-last for RM; live recipe unit cost for FG."""
    if balance.item_type == "RM":
        material = repo.get_material(balance.sku)
        if material is None:
            return None
        return resolve_input_unit_cost(material).unit_cost

    for recipe in repo.list_recipes():
        if recipe.finished_product_sku == balance.sku:
            materials = {m.id: m for m in repo.list_materials()}
            snap = compute_costing_snapshot(recipe, materials)
            return float(snap["unit_cost"])
    return None


def list_inventory_rows(repo: InMemoryRepository) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for balance in repo.list_stock():
        rows.append(
            {
                "item_type": balance.item_type,
                "sku": balance.sku,
                "name": balance.name,
                "uom": balance.uom,
                "on_hand": float(balance.on_hand),
                "reorder_point": float(balance.reorder_point),
                "unit_cost": inventory_unit_cost(repo, balance),
            }
        )
    rows.sort(key=lambda r: (r["item_type"], r["sku"]))
    return rows


def apply_manual_adjustment(
    repo: InMemoryRepository,
    *,
    item_type: ItemType,
    sku: str,
    delta: float,
    reason: str,
    actor: str | None = None,
) -> dict[str, Any]:
    """DEC-15 / ADR-11: change on-hand only; audit; never go negative; no WA rewrite."""
    trimmed = reason.strip() if reason else ""
    if not trimmed:
        raise InventoryError(
            "reason_required",
            "Manual adjustment requires a non-empty reason",
            {"sku": sku},
        )

    balance = _ensure_stock(repo, item_type, sku)
    resulting = float(balance.on_hand) + float(delta)
    if resulting < 0:
        raise InventoryError(
            "insufficient_stock",
            "Adjustment would drive on-hand negative",
            {
                "item_type": item_type,
                "sku": sku,
                "on_hand": float(balance.on_hand),
                "delta": float(delta),
                "resulting_on_hand": resulting,
            },
        )

    balance.on_hand = resulting
    repo.set_stock(balance)
    audit = AdjustmentAudit(
        id=str(uuid.uuid4()),
        item_type=item_type,
        sku=sku,
        delta=float(delta),
        reason=trimmed,
        resulting_on_hand=resulting,
        created_at=utc_now(),
        actor=actor,
    )
    saved = repo.append_adjustment(audit)
    return {
        "id": saved.id,
        "item_type": saved.item_type,
        "sku": saved.sku,
        "delta": saved.delta,
        "reason": saved.reason,
        "resulting_on_hand": saved.resulting_on_hand,
        "created_at": saved.created_at.isoformat(),
        "actor": saved.actor,
        "on_hand": resulting,
    }


def create_order(
    repo: InMemoryRepository,
    *,
    recipe_id: str,
    quantity: float,
    sell_price: float | None = None,
) -> Order:
    """Create pending order; default sell price to recommended (DEC-17)."""
    if quantity <= 0:
        raise InventoryError(
            "invalid_order_quantity",
            "Order quantity must be greater than 0",
            {"quantity": quantity},
        )
    recipe = repo.get_recipe(recipe_id)
    if recipe is None:
        raise InventoryError(
            "recipe_not_found",
            f"Recipe {recipe_id} not found",
            {"recipe_id": recipe_id},
        )
    if not recipe.finished_product_sku:
        raise InventoryError(
            "fg_sku_required",
            "Recipe must have finished_product_sku to create an order",
            {"recipe_id": recipe_id},
        )

    if sell_price is None:
        snap = costing_snapshot_for_recipe(repo, recipe_id)
        sell_price = float(snap["recommended_sell_price"])
    if sell_price < 0:
        raise InventoryError(
            "invalid_sell_price",
            "Sell price must be >= 0",
            {"sell_price": sell_price},
        )

    # Ensure FG stock row exists (on-hand unchanged).
    _ensure_stock(repo, "FG", recipe.finished_product_sku)
    order = Order(
        id=str(uuid.uuid4()),
        recipe_id=recipe_id,
        fg_sku=recipe.finished_product_sku,
        quantity=float(quantity),
        sell_price=float(sell_price),
        status="pending",
        created_at=utc_now(),
    )
    return repo.upsert_order(order)


def produce_order(repo: InMemoryRepository, order_id: str) -> Order:
    """pending → in_progress: consume RM by yield formula; FG += order_quantity."""
    order = repo.get_order(order_id)
    if order is None:
        raise InventoryError(
            "order_not_found",
            f"Order {order_id} not found",
            {"order_id": order_id},
        )
    if order.status != "pending":
        raise InventoryError(
            "invalid_order_state",
            "Produce requires order status pending",
            {"order_id": order_id, "status": order.status},
        )

    recipe = repo.get_recipe(order.recipe_id)
    if recipe is None:
        raise InventoryError(
            "recipe_not_found",
            f"Recipe {order.recipe_id} not found",
            {"recipe_id": order.recipe_id},
        )

    plan = produce_consumption_plan(recipe, order.quantity)
    short_skus: list[str] = []
    for step in plan:
        sku = step["material_id"]
        balance = _ensure_stock(repo, "RM", sku)
        if float(balance.on_hand) - float(step["consumed"]) < 0:
            short_skus.append(sku)

    if short_skus:
        raise InventoryError(
            "insufficient_stock",
            "Produce blocked: raw material on-hand would go negative",
            {"short_skus": short_skus, "order_id": order_id},
        )

    for step in plan:
        sku = step["material_id"]
        balance = _ensure_stock(repo, "RM", sku)
        balance.on_hand = float(balance.on_hand) - float(step["consumed"])
        repo.set_stock(balance)

    fg = _ensure_stock(repo, "FG", order.fg_sku)
    fg.on_hand = float(fg.on_hand) + float(order.quantity)
    repo.set_stock(fg)

    order.status = "in_progress"
    return repo.upsert_order(order)


def ship_order(repo: InMemoryRepository, order_id: str) -> Order:
    """in_progress → completed: decrement FG; write immutable cost-at-sale."""
    order = repo.get_order(order_id)
    if order is None:
        raise InventoryError(
            "order_not_found",
            f"Order {order_id} not found",
            {"order_id": order_id},
        )
    if order.status != "in_progress":
        raise InventoryError(
            "invalid_order_state",
            "Ship requires order status in_progress",
            {"order_id": order_id, "status": order.status},
        )

    fg = _ensure_stock(repo, "FG", order.fg_sku)
    if float(fg.on_hand) - float(order.quantity) < 0:
        raise InventoryError(
            "insufficient_stock",
            "Ship blocked: finished-goods on-hand would go negative",
            {
                "short_skus": [order.fg_sku],
                "order_id": order_id,
                "on_hand": float(fg.on_hand),
                "quantity": float(order.quantity),
            },
        )

    snap = costing_snapshot_for_recipe(repo, order.recipe_id)
    cost_at_sale = float(snap["unit_cost"])
    revenue = float(order.quantity) * float(order.sell_price)

    fg.on_hand = float(fg.on_hand) - float(order.quantity)
    repo.set_stock(fg)

    order.status = "completed"
    order.cost_at_sale = cost_at_sale
    order.revenue = revenue
    order.completed_at = datetime.now(timezone.utc)
    return repo.upsert_order(order)
