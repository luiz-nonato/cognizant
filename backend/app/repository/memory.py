"""In-memory repository (no Postgres / Docker required)."""

from __future__ import annotations

import copy
import uuid

from app.domain.models import (
    AdjustmentAudit,
    ItemType,
    Material,
    Order,
    Recipe,
    RecipeLine,
    StockBalance,
)


class InMemoryRepository:
    def __init__(self) -> None:
        self._materials: dict[str, Material] = {}
        self._recipes: dict[str, Recipe] = {}
        self._stock: dict[tuple[str, str], StockBalance] = {}
        self._adjustments: list[AdjustmentAudit] = []
        self._orders: dict[str, Order] = {}

    def list_materials(self) -> list[Material]:
        return [copy.deepcopy(m) for m in self._materials.values()]

    def get_material(self, material_id: str) -> Material | None:
        material = self._materials.get(material_id)
        return copy.deepcopy(material) if material else None

    def upsert_material(self, material: Material) -> Material:
        if not material.id:
            material.id = str(uuid.uuid4())
        self._materials[material.id] = copy.deepcopy(material)
        # Keep RM stock metadata in sync without changing on-hand.
        key = ("RM", material.id)
        existing = self._stock.get(key)
        on_hand = existing.on_hand if existing else 0.0
        self._stock[key] = StockBalance(
            item_type="RM",
            sku=material.id,
            on_hand=on_hand,
            name=material.name,
            uom=material.uom,
            reorder_point=material.reorder_point,
        )
        return copy.deepcopy(material)

    def list_recipes(self) -> list[Recipe]:
        return [copy.deepcopy(r) for r in self._recipes.values()]

    def get_recipe(self, recipe_id: str) -> Recipe | None:
        recipe = self._recipes.get(recipe_id)
        return copy.deepcopy(recipe) if recipe else None

    def upsert_recipe(self, recipe: Recipe) -> Recipe:
        if not recipe.id:
            recipe.id = str(uuid.uuid4())
        self._recipes[recipe.id] = copy.deepcopy(recipe)
        if recipe.finished_product_sku:
            key = ("FG", recipe.finished_product_sku)
            existing = self._stock.get(key)
            on_hand = existing.on_hand if existing else 0.0
            self._stock[key] = StockBalance(
                item_type="FG",
                sku=recipe.finished_product_sku,
                on_hand=on_hand,
                name=recipe.name,
                uom="unit",
                reorder_point=existing.reorder_point if existing else 0.0,
            )
        return copy.deepcopy(recipe)

    def list_stock(self) -> list[StockBalance]:
        return [copy.deepcopy(b) for b in self._stock.values()]

    def get_stock(self, item_type: ItemType, sku: str) -> StockBalance | None:
        balance = self._stock.get((item_type, sku))
        return copy.deepcopy(balance) if balance else None

    def set_stock(self, balance: StockBalance) -> StockBalance:
        self._stock[(balance.item_type, balance.sku)] = copy.deepcopy(balance)
        return copy.deepcopy(balance)

    def list_adjustments(self) -> list[AdjustmentAudit]:
        return [copy.deepcopy(r) for r in self._adjustments]

    def append_adjustment(self, row: AdjustmentAudit) -> AdjustmentAudit:
        if not row.id:
            row.id = str(uuid.uuid4())
        self._adjustments.append(copy.deepcopy(row))
        return copy.deepcopy(row)

    def list_orders(self) -> list[Order]:
        return [copy.deepcopy(o) for o in self._orders.values()]

    def get_order(self, order_id: str) -> Order | None:
        order = self._orders.get(order_id)
        return copy.deepcopy(order) if order else None

    def upsert_order(self, order: Order) -> Order:
        if not order.id:
            order.id = str(uuid.uuid4())
        self._orders[order.id] = copy.deepcopy(order)
        return copy.deepcopy(order)


def build_default_repository() -> InMemoryRepository:
    """Seed flour + bread recipe + enough RM on-hand for produce smoke."""
    repo = InMemoryRepository()
    flour = Material(
        id="mat-flour-001",
        name="Flour",
        uom="kg",
        list_price=2.0,
        reorder_point=5.0,
    )
    recipe = Recipe(
        id="rcp-bread-001",
        name="Simple Bread",
        yield_qty=10.0,
        target_margin=0.4,
        finished_product_sku="FG-BREAD-001",
        lines=[RecipeLine(material_id=flour.id, quantity=5.0, uom="kg")],
    )
    repo.upsert_material(flour)
    repo.upsert_recipe(recipe)
    # Opening RM stock for produce tests (DEC-15 / PA13 opening path also via adjust).
    repo.set_stock(
        StockBalance(
            item_type="RM",
            sku=flour.id,
            on_hand=100.0,
            name=flour.name,
            uom=flour.uom,
            reorder_point=flour.reorder_point,
        )
    )
    return repo
