"""Dashboard aggregate schemas (FR-DSH / DEC-20)."""

from __future__ import annotations

from pydantic import BaseModel


class OrderPipelineCounts(BaseModel):
    pending: int
    in_progress: int
    completed: int


class ProductProfitRow(BaseModel):
    fg_sku: str
    name: str
    revenue: float
    cogs: float
    profit: float
    margin_pct: float | None


class LowStockAlert(BaseModel):
    item_type: str
    sku: str
    name: str
    on_hand: float
    reorder_point: float
    uom: str


class DashboardSnapshot(BaseModel):
    period: str = "all_time"
    revenue: float
    cogs: float
    profit: float
    margin_pct: float | None
    low_stock_count: int
    low_stock_alerts: list[LowStockAlert]
    orders: OrderPipelineCounts
    top_products: list[ProductProfitRow]
