"""External data integration response schemas (Sprint 4)."""

from __future__ import annotations

from pydantic import BaseModel


class FoodProductSuggestion(BaseModel):
    name: str
    brands: str | None = None
    barcode: str | None = None
    quantity_label: str | None = None
    source: str = "open_food_facts"


class FoodProductSearchResponse(BaseModel):
    query: str
    products: list[FoodProductSuggestion]
