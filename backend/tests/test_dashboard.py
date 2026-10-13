"""FR-DSH all-time dashboard aggregates."""

from __future__ import annotations


def test_dashboard_emptyish_seed(client):
    res = client.get("/dashboard")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["period"] == "all_time"
    assert body["revenue"] == 0.0
    assert body["cogs"] == 0.0
    assert body["profit"] == 0.0
    assert body["margin_pct"] is None
    assert body["orders"] == {"pending": 0, "in_progress": 0, "completed": 0}
    # Seed flour on_hand 100 > reorder 5 → no low stock
    assert body["low_stock_count"] == 0
    assert body["top_products"] == []


def test_dashboard_after_completed_order_and_low_stock(client):
    # Drive flour into low stock via HITL adjust, then complete an order.
    adj = client.post(
        "/hitl/proposals",
        json={
            "action": "inventory_adjust",
            "summary": "Drop flour for alert",
            "payload": {
                "item_type": "RM",
                "sku": "mat-flour-001",
                "delta": -96.0,
                "reason": "dashboard low-stock fixture",
            },
        },
    )
    assert adj.status_code == 201
    assert (
        client.post(f"/hitl/proposals/{adj.json()['id']}/approve").status_code == 200
    )

    create = client.post(
        "/hitl/proposals",
        json={
            "action": "order_create",
            "summary": "Order for dashboard",
            "payload": {"recipe_id": "rcp-bread-001", "quantity": 5.0},
        },
    )
    order_id = client.post(
        f"/hitl/proposals/{create.json()['id']}/approve"
    ).json()["result"]["id"]
    produce = client.post(
        "/hitl/proposals",
        json={
            "action": "order_produce",
            "summary": "produce",
            "payload": {"order_id": order_id},
        },
    )
    client.post(f"/hitl/proposals/{produce.json()['id']}/approve")
    ship = client.post(
        "/hitl/proposals",
        json={
            "action": "order_ship",
            "summary": "ship",
            "payload": {"order_id": order_id},
        },
    )
    shipped = client.post(f"/hitl/proposals/{ship.json()['id']}/approve")
    assert shipped.json()["result"]["status"] == "completed"

    dash = client.get("/dashboard").json()
    assert dash["orders"]["completed"] == 1
    assert dash["revenue"] > 0
    assert dash["cogs"] > 0
    assert dash["profit"] == dash["revenue"] - dash["cogs"]
    assert dash["margin_pct"] is not None
    assert dash["low_stock_count"] >= 1
    assert any(a["sku"] == "mat-flour-001" for a in dash["low_stock_alerts"])
    assert dash["top_products"][0]["fg_sku"] == "FG-BREAD-001"
