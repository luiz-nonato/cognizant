"""Domain entities for materials, recipes, inventory, and orders (storage-agnostic)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


ItemType = Literal["RM", "FG"]
OrderStatus = Literal["pending", "in_progress", "completed"]


@dataclass
class PurchaseLot:
    """Optional purchase record for weighted-average input cost (DEC-03)."""

    quantity: float
    unit_price: float


@dataclass
class Material:
    id: str
    name: str
    uom: str
    list_price: float
    reorder_point: float = 0.0
    last_purchase_price: float | None = None
    purchases: list[PurchaseLot] = field(default_factory=list)
    supplier_id: str | None = None


@dataclass
class RecipeLine:
    material_id: str
    quantity: float
    uom: str


@dataclass
class Recipe:
    id: str
    name: str
    yield_qty: float
    lines: list[RecipeLine]
    target_margin: float = 0.0
    finished_product_sku: str | None = None


@dataclass
class StockBalance:
    """On-hand balance for a raw material (RM) or finished-goods SKU (FG)."""

    item_type: ItemType
    sku: str
    on_hand: float = 0.0
    name: str = ""
    uom: str = ""
    reorder_point: float = 0.0


@dataclass
class AdjustmentAudit:
    """Manual inventory adjustment audit row (DEC-15 / ADR-11)."""

    id: str
    item_type: ItemType
    sku: str
    delta: float
    reason: str
    resulting_on_hand: float
    created_at: datetime
    actor: str | None = None


PaymentMethod = Literal["cash", "card", "pix", "bank_transfer", "other"]


@dataclass
class Order:
    """Customer/FG order with produce-then-ship state machine (DEC-05)."""

    id: str
    recipe_id: str
    fg_sku: str
    quantity: float
    sell_price: float
    status: OrderStatus = "pending"
    cost_at_sale: float | None = None
    revenue: float | None = None
    payment_method: PaymentMethod | None = None
    created_at: datetime = field(default_factory=utc_now)
    completed_at: datetime | None = None
