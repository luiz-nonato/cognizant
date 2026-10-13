from pydantic import BaseModel, Field


class MaterialCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    uom: str = Field(min_length=1, max_length=32)
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
