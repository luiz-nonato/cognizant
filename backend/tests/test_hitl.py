"""Sprint 4 HITL propose → approve/reject gates."""

from __future__ import annotations

import pytest

from app.services.hitl import reset_hitl_store


@pytest.fixture(autouse=True)
def _clean_hitl():
    reset_hitl_store()
    yield
    reset_hitl_store()


def _stock(client, sku: str) -> float:
    rows = client.get("/inventory").json()
    match = next(r for r in rows if r["sku"] == sku)
    return float(match["on_hand"])


def test_hitl_adjust_propose_approve(client):
    before = _stock(client, "mat-flour-001")
    create = client.post(
        "/hitl/proposals",
        json={
            "action": "inventory_adjust",
            "summary": "Add opening flour for demo",
            "payload": {
                "item_type": "RM",
                "sku": "mat-flour-001",
                "delta": 5.0,
                "reason": "HITL demo opening stock",
            },
        },
    )
    assert create.status_code == 201, create.text
    proposal = create.json()
    assert proposal["status"] == "pending"
    assert _stock(client, "mat-flour-001") == pytest.approx(before)

    pending = client.get("/hitl/proposals", params={"status": "pending"})
    assert pending.status_code == 200
    assert any(p["id"] == proposal["id"] for p in pending.json())

    approve = client.post(f"/hitl/proposals/{proposal['id']}/approve")
    assert approve.status_code == 200, approve.text
    body = approve.json()
    assert body["status"] == "approved"
    assert body["result"]["resulting_on_hand"] == pytest.approx(before + 5.0)
    assert _stock(client, "mat-flour-001") == pytest.approx(before + 5.0)


def test_hitl_reject_requires_feedback_and_no_mutation(client):
    before = _stock(client, "mat-flour-001")
    create = client.post(
        "/hitl/proposals",
        json={
            "action": "inventory_adjust",
            "summary": "Should be rejected",
            "payload": {
                "item_type": "RM",
                "sku": "mat-flour-001",
                "delta": -1.0,
                "reason": "mistake",
            },
        },
    )
    pid = create.json()["id"]

    empty = client.post(
        f"/hitl/proposals/{pid}/reject",
        json={"feedback": ""},
    )
    assert empty.status_code == 422

    whitespace = client.post(
        f"/hitl/proposals/{pid}/reject",
        json={"feedback": "   "},
    )
    assert whitespace.status_code == 400
    assert whitespace.json()["error"]["code"] == "feedback_required"

    reject = client.post(
        f"/hitl/proposals/{pid}/reject",
        json={"feedback": "Not needed for this demo"},
    )
    assert reject.status_code == 200
    assert reject.json()["status"] == "rejected"
    assert _stock(client, "mat-flour-001") == pytest.approx(before)


def test_hitl_order_create_produce_ship_via_approvals(client):
    create_prop = client.post(
        "/hitl/proposals",
        json={
            "action": "order_create",
            "summary": "Create bread order qty 5",
            "payload": {"recipe_id": "rcp-bread-001", "quantity": 5.0},
        },
    )
    assert create_prop.status_code == 201
    approved_create = client.post(
        f"/hitl/proposals/{create_prop.json()['id']}/approve"
    )
    assert approved_create.status_code == 200
    assert approved_create.json()["status"] == "approved"
    order_id = approved_create.json()["result"]["id"]
    assert approved_create.json()["result"]["status"] == "pending"

    produce_prop = client.post(
        "/hitl/proposals",
        json={
            "action": "order_produce",
            "summary": f"Produce order {order_id}",
            "payload": {"order_id": order_id},
        },
    )
    produced = client.post(f"/hitl/proposals/{produce_prop.json()['id']}/approve")
    assert produced.status_code == 200
    assert produced.json()["result"]["status"] == "in_progress"

    ship_prop = client.post(
        "/hitl/proposals",
        json={
            "action": "order_ship",
            "summary": f"Ship order {order_id}",
            "payload": {"order_id": order_id},
        },
    )
    shipped = client.post(f"/hitl/proposals/{ship_prop.json()['id']}/approve")
    assert shipped.status_code == 200
    assert shipped.json()["result"]["status"] == "completed"


def test_hitl_invalid_payload_on_create(client):
    res = client.post(
        "/hitl/proposals",
        json={
            "action": "order_produce",
            "summary": "Missing order id",
            "payload": {},
        },
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_payload"
