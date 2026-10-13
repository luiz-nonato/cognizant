from typing import Literal

from pydantic import BaseModel, Field

# PRD DEC-24 curated UoM set (P0). Free-text deferred with FR-UOM (P1).
CuratedUom = Literal["kg", "g", "L", "ml", "unit", "pack"]
CURATED_UOMS: tuple[str, ...] = ("kg", "g", "L", "ml", "unit", "pack")


class MaterialCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    uom: CuratedUom
    list_price: float = Field(ge=0)
    reorder_point: float = Field(default=0.0, ge=0)
    last_purchase_price: float | None = Field(default=None, ge=0)
    id: str | None = None


class MaterialOut(BaseModel):
    id: str
    name: str
    uom: str
    list_price: float
    reorder_point: float
    last_purchase_price: float | None = None
    supplier_id: str | None = None
