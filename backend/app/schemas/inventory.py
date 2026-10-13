from typing import Literal

from pydantic import BaseModel, Field


ItemType = Literal["RM", "FG"]


class InventoryItemOut(BaseModel):
    item_type: ItemType
    sku: str
    name: str
    uom: str
    on_hand: float
    reorder_point: float
    unit_cost: float | None = None


class AdjustmentCreate(BaseModel):
    item_type: ItemType
    sku: str = Field(min_length=1, max_length=64)
    delta: float
    reason: str = Field(min_length=1, max_length=500)


class AdjustmentOut(BaseModel):
    id: str
    item_type: ItemType
    sku: str
    delta: float
    reason: str
    resulting_on_hand: float
    created_at: str
    actor: str | None = None
    on_hand: float | None = None
