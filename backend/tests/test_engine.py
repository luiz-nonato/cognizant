"""Unit tests for costing formulas (EC-001 / EC-002 / EC-016 / EC-017 style)."""

import pytest

from app.domain.engine import (
    CostingError,
    METHOD_LIST_LAST,
    METHOD_WEIGHTED_AVG,
    compute_costing_snapshot,
    recommended_sell_price,
    resolve_input_unit_cost,
    unit_cost_from_total,
)
from app.domain.models import Material, PurchaseLot, Recipe, RecipeLine


def test_unit_cost_total_over_yield_helper():
    # total 10 / yield 10 → unit cost 1.0
    assert unit_cost_from_total(10.0, 10.0) == 1.0


def test_unit_cost_when_yield_not_one():
    """Operator: yield ≠ 1 → unit_cost = total_material_cost / yield (costing, not produce)."""
    flour = Material(id="mat-flour", name="Flour", uom="kg", list_price=2.0)
    # total = 5 kg × 2.0 = 10; yield = 4 → unit_cost = 2.5
    recipe = Recipe(
        id="rcp-yield-ne-1",
        name="Yield Not One",
        yield_qty=4.0,
        target_margin=0.4,
        lines=[RecipeLine(material_id=flour.id, quantity=5.0, uom="kg")],
    )
    snap = compute_costing_snapshot(recipe, {flour.id: flour})
    assert snap["yield"] == pytest.approx(4.0)
    assert snap["total_material_cost"] == pytest.approx(10.0)
    assert snap["unit_cost"] == pytest.approx(10.0 / 4.0)
    assert snap["recommended_sell_price"] == pytest.approx((10.0 / 4.0) / 0.6)


def test_recommended_price_margin_on_sell_ec002():
    # unit_cost 1.0, margin 40% → 1 / 0.6
    assert recommended_sell_price(1.0, 0.4) == pytest.approx(1.0 / 0.6)


def test_reject_margin_gte_one():
    with pytest.raises(CostingError) as exc:
        recommended_sell_price(1.0, 1.0)
    assert exc.value.code == "invalid_margin"


def test_zero_cost_recommended_price_and_label():
    """Operator / EC-017: unit_cost == 0 → price numeric 0, label n/a / zero cost."""
    assert recommended_sell_price(0.0, 0.4) == 0.0

    zero_mat = Material(id="mat-zero", name="Free scrap", uom="kg", list_price=0.0)
    zero_recipe = Recipe(
        id="rcp-zero",
        name="Zero Cost Batch",
        yield_qty=5.0,
        target_margin=0.25,
        lines=[RecipeLine(material_id=zero_mat.id, quantity=1.0, uom="kg")],
    )
    zero_snap = compute_costing_snapshot(zero_recipe, {zero_mat.id: zero_mat})
    assert zero_snap["unit_cost"] == 0.0
    assert zero_snap["recommended_sell_price"] == 0.0
    assert zero_snap["recommended_price_label"] == "n/a / zero cost"


def test_line_contribution_pct_ec001():
    """EC-001: each line contribution % = (line_cost / total_material_cost) × 100."""
    flour = Material(id="m-flour", name="Flour", uom="kg", list_price=2.0)
    salt = Material(id="m-salt", name="Salt", uom="kg", list_price=1.0)
    # flour line 4×2=8 (80%); salt line 2×1=2 (20%); total 10; yield 5 → unit 2
    recipe = Recipe(
        id="rcp-contrib",
        name="Two-Line Batch",
        yield_qty=5.0,
        target_margin=0.4,
        lines=[
            RecipeLine(material_id=flour.id, quantity=4.0, uom="kg"),
            RecipeLine(material_id=salt.id, quantity=2.0, uom="kg"),
        ],
    )
    snap = compute_costing_snapshot(
        recipe, {flour.id: flour, salt.id: salt}
    )
    assert snap["total_material_cost"] == pytest.approx(10.0)
    assert snap["unit_cost"] == pytest.approx(10.0 / 5.0)
    by_id = {row["material_id"]: row for row in snap["lines"]}
    assert by_id[flour.id]["line_cost"] == pytest.approx(8.0)
    assert by_id[flour.id]["contribution_pct"] == pytest.approx(80.0)
    assert by_id[salt.id]["line_cost"] == pytest.approx(2.0)
    assert by_id[salt.id]["contribution_pct"] == pytest.approx(20.0)
    assert sum(r["contribution_pct"] for r in snap["lines"]) == pytest.approx(100.0)


def test_input_cost_list_price_when_no_purchases():
    material = Material(id="m1", name="Flour", uom="kg", list_price=2.5)
    resolved = resolve_input_unit_cost(material)
    assert resolved.unit_cost == 2.5
    assert resolved.method_label == METHOD_LIST_LAST


def test_input_cost_weighted_average_of_purchases():
    material = Material(
        id="m1",
        name="Flour",
        uom="kg",
        list_price=9.99,
        purchases=[
            PurchaseLot(quantity=2, unit_price=1.0),
            PurchaseLot(quantity=2, unit_price=3.0),
        ],
    )
    resolved = resolve_input_unit_cost(material)
    assert resolved.unit_cost == pytest.approx(2.0)
    assert resolved.method_label == METHOD_WEIGHTED_AVG


def test_snapshot_seed_recipe_golden():
    flour = Material(id="mat-flour-001", name="Flour", uom="kg", list_price=2.0)
    recipe = Recipe(
        id="rcp-bread-001",
        name="Simple Bread",
        yield_qty=10.0,
        target_margin=0.4,
        lines=[RecipeLine(material_id=flour.id, quantity=5.0, uom="kg")],
    )
    snap = compute_costing_snapshot(recipe, {flour.id: flour})
    assert snap["total_material_cost"] == pytest.approx(10.0)
    assert snap["unit_cost"] == pytest.approx(1.0)
    assert snap["recommended_sell_price"] == pytest.approx(1.0 / 0.6)
    assert snap["recommended_price_label"] is None
    assert snap["lines"][0]["contribution_pct"] == pytest.approx(100.0)
    assert snap["input_unit_cost_method"] == METHOD_LIST_LAST


def test_uom_mismatch_rejected():
    flour = Material(id="m1", name="Flour", uom="kg", list_price=2.0)
    recipe = Recipe(
        id="r1",
        name="Bad",
        yield_qty=1.0,
        lines=[RecipeLine(material_id="m1", quantity=1.0, uom="g")],
    )
    with pytest.raises(CostingError) as exc:
        compute_costing_snapshot(recipe, {"m1": flour})
    assert exc.value.code == "uom_mismatch"
