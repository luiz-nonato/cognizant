from typing import Literal

from pydantic import BaseModel, Field


OrderStatus = Literal["pending", "in_progress", "completed"]
PaymentMethod = Literal["cash", "card", "pix", "bank_transfer", "other"]


class OrderCreate(BaseModel):
    recipe_id: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    sell_price: float | None = Field(default=None, ge=0)
    payment_method: PaymentMethod | None = None


class OrderOut(BaseModel):
    id: str
    recipe_id: str
    fg_sku: str
    quantity: float
    sell_price: float
    status: OrderStatus
    cost_at_sale: float | None = None
    revenue: float | None = None
    payment_method: PaymentMethod | None = None
    created_at: str
    completed_at: str | None = None
