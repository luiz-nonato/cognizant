from typing import Any

from pydantic import BaseModel, Field


class RecipeLineIn(BaseModel):
    material_id: str
    quantity: float = Field(gt=0)
    uom: str = Field(min_length=1, max_length=32)


class RecipeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    yield_qty: float = Field(gt=0, alias="yield")
    target_margin: float = Field(ge=0, lt=1, default=0.0)
    finished_product_sku: str | None = None
    lines: list[RecipeLineIn] = Field(min_length=1)
    id: str | None = None

    model_config = {"populate_by_name": True}


class RecipeLineOut(BaseModel):
    material_id: str
    quantity: float
    uom: str


class RecipeOut(BaseModel):
    id: str
    name: str
    yield_qty: float = Field(serialization_alias="yield")
    target_margin: float
    finished_product_sku: str | None = None
    lines: list[RecipeLineOut]

    model_config = {"populate_by_name": True}


class CostingSnapshotOut(BaseModel):
    """Engine JSON shape returned by GET /recipes/{id}/costing."""

    recipe_id: str
    recipe_name: str
    finished_product_sku: str | None = None
    yield_qty: float = Field(serialization_alias="yield", validation_alias="yield")
    target_margin: float
    total_material_cost: float
    unit_cost: float
    recommended_sell_price: float
    recommended_price_label: str | None = None
    input_unit_cost_method: str
    lines: list[dict[str, Any]]
    grounding_timestamp: str

    model_config = {"populate_by_name": True, "extra": "allow"}
