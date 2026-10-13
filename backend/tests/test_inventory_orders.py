"""EC-004 produce/ship (ADR-16) and EC-018 manual adjust (ADR-11 / DEC-15)."""

from __future__ import annotations

import pytest

from app.domain.engine import (
    METHOD_WEIGHTED_AVG,
    resolve_input_unit_cost,
    rm_consumed_for_produce,
)
from app.domain.models import PurchaseLot
from app.repository.memory import build_default_repository
from app.services import inventory as inventory_svc


def _stock_by_sku(client, sku: str) -> dict:
    rows = client.get("/inventory").json()
    match = next((r for r in rows if r["sku"] == sku), None)
    assert match is not None, f"SKU {sku} missing from inventory: {rows}"
    return match


def test_rm_consumed_formula_helpers():
    """ADR-16 helpers: seed bread line and SAD worked fixture."""
    # Seed recipe: line 5 kg, yield 10, order 5 FG → consume 2.5
    assert rm_consumed_for_produce(5.0, 5.0, 10.0) == pytest.approx(2.5)
    # SAD worked: line 2 kg, yield 10, order 5 → consume 1
    assert rm_consumed_for_produce(2.0, 5.0, 10.0) == pytest.approx(1.0)


def test_ec004_produce_yield_not_one_and_ship(client):
    """EC-004: produce with yield≠1 on seed recipe; ship; no negative on-hand."""
    inv_before = _stock_by_sku(client, "mat-flour-001")
    flour_before = float(inv_before["on_hand"])
    assert flour_before >= 2.5

    create = client.post(
        "/orders",
        json={"recipe_id": "rcp-bread-001", "quantity": 5.0},
    )
    assert create.status_code == 201, create.text
    order = create.json()
    assert order["status"] == "pending"
    assert order["fg_sku"] == "FG-BREAD-001"
    assert order["sell_price"] == pytest.approx(1.0 / 0.6)
    # pending has no stock effect
    assert _stock_by_sku(client, "mat-flour-001")["on_hand"] == pytest.approx(flour_before)
    assert _stock_by_sku(client, "FG-BREAD-001")["on_hand"] == pytest.approx(0.0)

    produce = client.post(f"/orders/{order['id']}/produce")
    assert produce.status_code == 200, produce.text
    assert produce.json()["status"] == "in_progress"

    # flour consume = 5 × (5/10) = 2.5; FG += 5
    assert _stock_by_sku(client, "mat-flour-001")["on_hand"] == pytest.approx(
        flour_before - 2.5
    )
    assert _stock_by_sku(client, "FG-BREAD-001")["on_hand"] == pytest.approx(5.0)
    assert _stock_by_sku(client, "mat-flour-001")["on_hand"] >= 0
    assert _stock_by_sku(client, "FG-BREAD-001")["on_hand"] >= 0

    ship = client.post(f"/orders/{order['id']}/ship")
    assert ship.status_code == 200, ship.text
    shipped = ship.json()
    assert shipped["status"] == "completed"
    assert shipped["cost_at_sale"] == pytest.approx(1.0)
    assert shipped["revenue"] == pytest.approx(5.0 * (1.0 / 0.6))
    assert _stock_by_sku(client, "FG-BREAD-001")["on_hand"] == pytest.approx(0.0)
    assert _stock_by_sku(client, "mat-flour-001")["on_hand"] == pytest.approx(
        flour_before - 2.5
    )


def test_ec004_sad_worked_fixture_line_2kg(client):
    """SAD worked fixture: yield 10, line 2 kg, order 5 → consume 1 kg; FG += 5."""
    mat = client.post(
        "/materials",
        json={
            "id": "mat-flour-sad",
            "name": "SAD Flour",
            "uom": "kg",
            "list_price": 2.0,
            "reorder_point": 0,
        },
    )
    assert mat.status_code == 201, mat.text
    recipe = client.post(
        "/recipes",
        json={
            "id": "rcp-sad-yield",
            "name": "SAD Yield Bread",
            "yield": 10.0,
            "target_margin": 0.4,
            "finished_product_sku": "FG-SAD-001",
            "lines": [
                {"material_id": "mat-flour-sad", "quantity": 2.0, "uom": "kg"},
            ],
        },
    )
    assert recipe.status_code == 201, recipe.text

    adj = client.post(
        "/inventory/adjustments",
        json={
            "item_type": "RM",
            "sku": "mat-flour-sad",
            "delta": 10.0,
            "reason": "Opening stock for SAD fixture",
        },
    )
    assert adj.status_code == 201, adj.text

    order = client.post(
        "/orders",
        json={"recipe_id": "rcp-sad-yield", "quantity": 5.0, "sell_price": 3.0},
    ).json()
    produce = client.post(f"/orders/{order['id']}/produce")
    assert produce.status_code == 200, produce.text
    assert _stock_by_sku(client, "mat-flour-sad")["on_hand"] == pytest.approx(9.0)
    assert _stock_by_sku(client, "FG-SAD-001")["on_hand"] == pytest.approx(5.0)


def test_ec004_produce_blocks_short_rm(client):
    """DEC-06: produce blocked when RM would go negative; short SKU named."""
    # Drain flour almost to zero via adjust, then try a large order.
    flour = _stock_by_sku(client, "mat-flour-001")
    drain = client.post(
        "/inventory/adjustments",
        json={
            "item_type": "RM",
            "sku": "mat-flour-001",
            "delta": -float(flour["on_hand"]),
            "reason": "Drain for short-stock test",
        },
    )
    assert drain.status_code == 201, drain.text

    order = client.post(
        "/orders",
        json={"recipe_id": "rcp-bread-001", "quantity": 5.0},
    ).json()
    produce = client.post(f"/orders/{order['id']}/produce")
    assert produce.status_code == 400
    err = produce.json()["error"]
    assert err["code"] == "insufficient_stock"
    assert "mat-flour-001" in err["details"]["short_skus"]
    assert _stock_by_sku(client, "mat-flour-001")["on_hand"] == pytest.approx(0.0)
    assert client.get(f"/orders/{order['id']}").json()["status"] == "pending"


def test_ec018_adjust_reason_audit_no_negative_wa_unchanged(client):
    """EC-018: reason required; audit; no negative; WA / list / last price unchanged."""
    # Establish purchase lots so WA is defined and can be checked after adjust.
    from app.deps import get_repository

    repo = client.app.dependency_overrides[get_repository]()
    material = repo.get_material("mat-flour-001")
    assert material is not None
    material.purchases = [
        PurchaseLot(quantity=10.0, unit_price=2.0),
        PurchaseLot(quantity=10.0, unit_price=4.0),
    ]
    material.last_purchase_price = 4.0
    material.list_price = 2.0
    repo.upsert_material(material)

    wa_before = resolve_input_unit_cost(repo.get_material("mat-flour-001")).unit_cost
    assert wa_before == pytest.approx(3.0)  # (10*2 + 10*4) / 20
    list_before = repo.get_material("mat-flour-001").list_price
    last_before = repo.get_material("mat-flour-001").last_purchase_price
    purchases_before = [
        (p.quantity, p.unit_price)
        for p in repo.get_material("mat-flour-001").purchases
    ]
    recipe_unit_before = client.get("/recipes/rcp-bread-001/costing").json()["unit_cost"]

    # Empty reason → validation or domain rejection
    empty = client.post(
        "/inventory/adjustments",
        json={
            "item_type": "RM",
            "sku": "mat-flour-001",
            "delta": 1.0,
            "reason": "",
        },
    )
    assert empty.status_code in {400, 422}

    whitespace = client.post(
        "/inventory/adjustments",
        json={
            "item_type": "RM",
            "sku": "mat-flour-001",
            "delta": 1.0,
            "reason": "   ",
        },
    )
    assert whitespace.status_code == 400
    assert whitespace.json()["error"]["code"] == "reason_required"

    on_hand = _stock_by_sku(client, "mat-flour-001")["on_hand"]
    negative = client.post(
        "/inventory/adjustments",
        json={
            "item_type": "RM",
            "sku": "mat-flour-001",
            "delta": -(float(on_hand) + 1.0),
            "reason": "Would go negative",
        },
    )
    assert negative.status_code == 400
    assert negative.json()["error"]["code"] == "insufficient_stock"
    assert _stock_by_sku(client, "mat-flour-001")["on_hand"] == pytest.approx(on_hand)

    ok = client.post(
        "/inventory/adjustments",
        json={
            "item_type": "RM",
            "sku": "mat-flour-001",
            "delta": 5.0,
            "reason": "Opening balance correction",
        },
    )
    assert ok.status_code == 201, ok.text
    body = ok.json()
    assert body["reason"] == "Opening balance correction"
    assert body["resulting_on_hand"] == pytest.approx(float(on_hand) + 5.0)

    audits = client.get("/inventory/adjustments")
    assert audits.status_code == 200
    assert any(a["id"] == body["id"] for a in audits.json())

    after = repo.get_material("mat-flour-001")
    assert after.list_price == list_before
    assert after.last_purchase_price == last_before
    assert [(p.quantity, p.unit_price) for p in after.purchases] == purchases_before
    wa_after = resolve_input_unit_cost(after).unit_cost
    assert wa_after == pytest.approx(wa_before)
    assert resolve_input_unit_cost(after).method_label == METHOD_WEIGHTED_AVG
    recipe_unit_after = client.get("/recipes/rcp-bread-001/costing").json()["unit_cost"]
    assert recipe_unit_after == pytest.approx(recipe_unit_before)


def test_list_inventory_includes_rm_and_fg(client):
    inv = client.get("/inventory")
    assert inv.status_code == 200
    rows = inv.json()
    skus = {r["sku"] for r in rows}
    assert "mat-flour-001" in skus
    assert "FG-BREAD-001" in skus
    flour = next(r for r in rows if r["sku"] == "mat-flour-001")
    assert flour["item_type"] == "RM"
    assert flour["on_hand"] == pytest.approx(100.0)


def test_produce_consumption_plan_service_unit():
    """Domain produce plan on in-memory seed without HTTP."""
    repo = build_default_repository()
    recipe = repo.get_recipe("rcp-bread-001")
    assert recipe is not None
    from app.domain.engine import produce_consumption_plan

    plan = produce_consumption_plan(recipe, 5.0)
    assert len(plan) == 1
    assert plan[0]["material_id"] == "mat-flour-001"
    assert plan[0]["consumed"] == pytest.approx(2.5)

    order = inventory_svc.create_order(repo, recipe_id="rcp-bread-001", quantity=5.0)
    produced = inventory_svc.produce_order(repo, order.id)
    assert produced.status == "in_progress"
    flour = repo.get_stock("RM", "mat-flour-001")
    assert flour is not None
    assert flour.on_hand == pytest.approx(97.5)
    fg = repo.get_stock("FG", "FG-BREAD-001")
    assert fg is not None
    assert fg.on_hand == pytest.approx(5.0)
