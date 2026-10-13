"""All-time dashboard aggregates (FR-DSH / DEC-20)."""

from __future__ import annotations

from typing import Any

from app.repository.memory import InMemoryRepository
from app.services import inventory as inventory_svc


def build_dashboard(repo: InMemoryRepository) -> dict[str, Any]:
    orders = repo.list_orders()
    pending = sum(1 for o in orders if o.status == "pending")
    in_progress = sum(1 for o in orders if o.status == "in_progress")
    completed_orders = [o for o in orders if o.status == "completed"]
    completed = len(completed_orders)

    revenue = 0.0
    cogs = 0.0
    by_sku: dict[str, dict[str, Any]] = {}

    for order in completed_orders:
        rev = float(order.revenue if order.revenue is not None else 0.0)
        unit_cost = float(order.cost_at_sale if order.cost_at_sale is not None else 0.0)
        line_cogs = unit_cost * float(order.quantity)
        revenue += rev
        cogs += line_cogs
        row = by_sku.setdefault(
            order.fg_sku,
            {
                "fg_sku": order.fg_sku,
                "name": order.fg_sku,
                "revenue": 0.0,
                "cogs": 0.0,
            },
        )
        row["revenue"] += rev
        row["cogs"] += line_cogs

    # Resolve FG display names from recipes when available.
    for recipe in repo.list_recipes():
        if recipe.finished_product_sku and recipe.finished_product_sku in by_sku:
            by_sku[recipe.finished_product_sku]["name"] = recipe.name

    top_products: list[dict[str, Any]] = []
    for row in by_sku.values():
        profit = float(row["revenue"]) - float(row["cogs"])
        rev = float(row["revenue"])
        margin = (profit / rev) if rev > 0 else None
        top_products.append(
            {
                "fg_sku": row["fg_sku"],
                "name": row["name"],
                "revenue": rev,
                "cogs": float(row["cogs"]),
                "profit": profit,
                "margin_pct": margin,
            }
        )
    top_products.sort(key=lambda r: r["profit"], reverse=True)

    alerts: list[dict[str, Any]] = []
    for item in inventory_svc.list_inventory_rows(repo):
        on_hand = float(item["on_hand"])
        reorder = float(item["reorder_point"])
        # Reorder point 0 means "no threshold configured" for MVP dashboard.
        if reorder > 0 and on_hand <= reorder:
            alerts.append(
                {
                    "item_type": item["item_type"],
                    "sku": item["sku"],
                    "name": item["name"],
                    "on_hand": on_hand,
                    "reorder_point": reorder,
                    "uom": item["uom"],
                }
            )

    profit = revenue - cogs
    margin_pct = (profit / revenue) if revenue > 0 else None

    return {
        "period": "all_time",
        "revenue": revenue,
        "cogs": cogs,
        "profit": profit,
        "margin_pct": margin_pct,
        "low_stock_count": len(alerts),
        "low_stock_alerts": alerts,
        "orders": {
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
        },
        "top_products": top_products,
    }
