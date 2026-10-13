"""Deterministic costing and inventory formulas.

Costing: DEC-01, DEC-02, DEC-03, DEC-16.
Inventory produce/ship: DEC-05, DEC-06, ADR-16.
Manual adjust cost basis: DEC-15, ADR-11 (on-hand only; no WA rewrite).

Agents must not recompute these values; they narrate validated engine JSON only.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.domain.models import Material, Recipe


ZERO_COST_PRICE_LABEL = "n/a / zero cost"
METHOD_WEIGHTED_AVG = "weighted average of purchases"
METHOD_LIST_LAST = "registered list/last price (no purchases)"


class CostingError(ValueError):
    """Domain validation failure with a stable error code."""

    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


class InventoryError(ValueError):
    """Inventory / order transition failure with a stable error code."""

    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def rm_consumed_for_produce(
    line_quantity: float,
    order_quantity: float,
    yield_qty: float,
) -> float:
    """DEC-05 / ADR-16: RM consumed = line_quantity × (order_quantity / yield)."""
    if yield_qty <= 0:
        raise InventoryError(
            "invalid_yield",
            "Recipe yield must be greater than 0",
            {"yield": yield_qty},
        )
    if order_quantity <= 0:
        raise InventoryError(
            "invalid_order_quantity",
            "Order quantity must be greater than 0",
            {"order_quantity": order_quantity},
        )
    return float(line_quantity) * (float(order_quantity) / float(yield_qty))


def produce_consumption_plan(
    recipe: Recipe,
    order_quantity: float,
) -> list[dict[str, Any]]:
    """Per-line RM consumption for pending → in_progress (produce)."""
    plan: list[dict[str, Any]] = []
    for line in recipe.lines:
        consumed = rm_consumed_for_produce(line.quantity, order_quantity, recipe.yield_qty)
        plan.append(
            {
                "material_id": line.material_id,
                "line_quantity": float(line.quantity),
                "uom": line.uom,
                "consumed": consumed,
            }
        )
    return plan


@dataclass(frozen=True)
class InputCostResolution:
    unit_cost: float
    method_label: str


def resolve_input_unit_cost(material: Material) -> InputCostResolution:
    """DEC-03: qty-weighted average of purchases; else registered list/last price."""
    if material.purchases:
        total_qty = sum(p.quantity for p in material.purchases)
        if total_qty <= 0:
            raise CostingError(
                "invalid_purchases",
                "Purchase quantities must sum to a positive value",
                {"material_id": material.id},
            )
        weighted = sum(p.quantity * p.unit_price for p in material.purchases) / total_qty
        return InputCostResolution(unit_cost=float(weighted), method_label=METHOD_WEIGHTED_AVG)

    if material.last_purchase_price is not None:
        return InputCostResolution(
            unit_cost=float(material.last_purchase_price),
            method_label=METHOD_LIST_LAST,
        )
    return InputCostResolution(
        unit_cost=float(material.list_price),
        method_label=METHOD_LIST_LAST,
    )


def unit_cost_from_total(total_material_cost: float, yield_qty: float) -> float:
    """unit_cost = total material cost / yield (yield > 0)."""
    if yield_qty <= 0:
        raise CostingError(
            "invalid_yield",
            "Recipe yield must be greater than 0",
            {"yield": yield_qty},
        )
    return float(total_material_cost) / float(yield_qty)


def recommended_sell_price(unit_cost: float, target_margin: float) -> float:
    """DEC-01 / DEC-16: margin on selling price; zero unit cost → numeric 0."""
    if target_margin < 0 or target_margin >= 1:
        raise CostingError(
            "invalid_margin",
            "target_margin must satisfy 0 ≤ target_margin < 1 (reject margin ≥ 100%)",
            {"target_margin": target_margin},
        )
    if unit_cost == 0:
        return 0.0
    return float(unit_cost) / (1.0 - float(target_margin))


def compute_costing_snapshot(
    recipe: Recipe,
    materials_by_id: dict[str, Material],
    *,
    grounding_timestamp: datetime | None = None,
) -> dict[str, Any]:
    """Build authoritative costing JSON for one recipe (FR-CST, FR-PRC)."""
    if recipe.yield_qty <= 0:
        raise CostingError(
            "invalid_yield",
            "Recipe yield must be greater than 0",
            {"recipe_id": recipe.id, "yield": recipe.yield_qty},
        )

    lines_out: list[dict[str, Any]] = []
    total_material_cost = 0.0
    method_labels: set[str] = set()

    for line in recipe.lines:
        material = materials_by_id.get(line.material_id)
        if material is None:
            raise CostingError(
                "material_not_found",
                f"Material {line.material_id} not found for recipe line",
                {"material_id": line.material_id, "recipe_id": recipe.id},
            )
        if line.uom != material.uom:
            raise CostingError(
                "uom_mismatch",
                "Recipe line UoM must equal the material UoM",
                {
                    "material_id": material.id,
                    "line_uom": line.uom,
                    "material_uom": material.uom,
                },
            )

        resolved = resolve_input_unit_cost(material)
        method_labels.add(resolved.method_label)
        line_cost = float(line.quantity) * float(resolved.unit_cost)
        total_material_cost += line_cost
        lines_out.append(
            {
                "material_id": material.id,
                "material_name": material.name,
                "quantity": float(line.quantity),
                "uom": line.uom,
                "input_unit_cost": resolved.unit_cost,
                "line_cost": line_cost,
                "contribution_pct": 0.0,  # filled after total known
                "input_unit_cost_method": resolved.method_label,
            }
        )

    for row in lines_out:
        if total_material_cost > 0:
            row["contribution_pct"] = (row["line_cost"] / total_material_cost) * 100.0
        else:
            row["contribution_pct"] = 0.0

    unit_cost = unit_cost_from_total(total_material_cost, recipe.yield_qty)
    price = recommended_sell_price(unit_cost, recipe.target_margin)
    ts = grounding_timestamp or datetime.now(timezone.utc)

    if len(method_labels) == 1:
        method_label = next(iter(method_labels)) if method_labels else METHOD_LIST_LAST
    elif METHOD_WEIGHTED_AVG in method_labels:
        method_label = METHOD_WEIGHTED_AVG
    else:
        method_label = METHOD_LIST_LAST

    return {
        "recipe_id": recipe.id,
        "recipe_name": recipe.name,
        "finished_product_sku": recipe.finished_product_sku,
        "yield": float(recipe.yield_qty),
        "target_margin": float(recipe.target_margin),
        "total_material_cost": float(total_material_cost),
        "unit_cost": float(unit_cost),
        "recommended_sell_price": float(price),
        "recommended_price_label": ZERO_COST_PRICE_LABEL if unit_cost == 0 else None,
        "input_unit_cost_method": method_label,
        "lines": lines_out,
        "grounding_timestamp": ts.isoformat(),
    }
