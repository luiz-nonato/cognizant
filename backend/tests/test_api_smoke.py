"""API smoke / integration without Postgres or LLM key (Week 3 ECs)."""

from __future__ import annotations

import re
from typing import Any


def _citation_numeric_values(citations: dict[str, Any]) -> list[float]:
    """Collect floats from engine citation fields used in grounded replies."""
    keys = (
        "total_material_cost",
        "yield",
        "unit_cost",
        "target_margin",
        "recommended_sell_price",
    )
    values: list[float] = []
    for key in keys:
        raw = citations.get(key)
        if isinstance(raw, (int, float)):
            values.append(float(raw))
    for line in citations.get("lines") or []:
        for key in ("line_cost", "contribution_pct", "input_unit_cost", "quantity"):
            raw = line.get(key)
            if isinstance(raw, (int, float)):
                values.append(float(raw))
    return values


def _reply_numbers_agree_with_citations(reply: str, citations: dict[str, Any]) -> list[str]:
    """EC-005: every number token in reply must match a citation float (approx)."""
    cited = _citation_numeric_values(citations)
    disagreements: list[str] = []
    for token in re.findall(r"-?\d+(?:\.\d+)?", reply):
        number = float(token)
        if any(abs(number - c) < 1e-9 for c in cited):
            continue
        # Allow truncated forms (e.g. reply "1" for unit_cost 1.0).
        if any(abs(number - c) < 1e-6 or abs(number - round(c, 6)) < 1e-6 for c in cited):
            continue
        # Ignore message echo fragments that are not cost figures (rare).
        disagreements.append(token)
    return disagreements


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["runtime"] == "crewai"
    assert body["storage"] == "memory"
    assert body["auth_mode"] == "open_local"


def test_week3_smoke_material_recipe_costing_copilot(client):
    """Smoke path: material → recipe+yield → engine figures → costing_analyst."""
    mats = client.get("/materials")
    assert mats.status_code == 200
    materials = mats.json()
    assert len(materials) >= 1
    flour = materials[0]
    assert flour["id"] == "mat-flour-001"
    assert flour["name"] == "Flour"
    assert flour["uom"] == "kg"

    recipes = client.get("/recipes")
    assert recipes.status_code == 200
    recipe = recipes.json()[0]
    assert recipe["id"] == "rcp-bread-001"
    assert recipe["yield"] == 10.0
    assert recipe["target_margin"] == 0.4

    costing = client.get(f"/recipes/{recipe['id']}/costing")
    assert costing.status_code == 200
    snap = costing.json()
    assert snap["unit_cost"] == 1.0
    assert snap["recommended_sell_price"] == 1.0 / 0.6
    assert snap["lines"][0]["line_cost"] == 10.0
    assert snap["lines"][0]["contribution_pct"] == 100.0

    copilot = client.post(
        "/copilot/chat",
        json={
            "message": "Explain this recipe unit cost",
            "context": {"screen": "recipe", "entity_ids": [recipe["id"]]},
        },
    )
    assert copilot.status_code == 200
    body = copilot.json()
    assert set(body.keys()) == {"reply", "citations", "grounding_timestamp", "agent"}
    assert body["agent"] == "costing_analyst"
    assert body["citations"]["unit_cost"] == snap["unit_cost"]
    assert body["citations"]["recommended_sell_price"] == snap["recommended_sell_price"]
    assert _reply_numbers_agree_with_citations(body["reply"], body["citations"]) == []


def test_materials_and_recipe_costing(client):
    mats = client.get("/materials")
    assert mats.status_code == 200
    materials = mats.json()
    assert len(materials) >= 1
    assert materials[0]["name"] == "Flour"

    recipes = client.get("/recipes")
    assert recipes.status_code == 200
    recipe_id = recipes.json()[0]["id"]

    costing = client.get(f"/recipes/{recipe_id}/costing")
    assert costing.status_code == 200
    snap = costing.json()
    assert snap["unit_cost"] == 1.0
    assert snap["recommended_sell_price"] == 1.0 / 0.6
    assert snap["lines"][0]["line_cost"] == 10.0


def test_copilot_recipe_fallback_envelope_ec005(client):
    res = client.post(
        "/copilot/chat",
        json={
            "message": "Explain this recipe unit cost",
            "context": {"screen": "recipe", "entity_ids": ["rcp-bread-001"]},
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"reply", "citations", "grounding_timestamp", "agent"}
    assert body["agent"] == "costing_analyst"
    assert body["grounding_timestamp"]
    assert body["citations"]["unit_cost"] == 1.0
    assert body["citations"]["recommended_sell_price"] == 1.0 / 0.6
    disagreements = _reply_numbers_agree_with_citations(body["reply"], body["citations"])
    assert disagreements == [], f"EC-005 reply/citation disagreements: {disagreements}"


def test_create_recipe_uom_mismatch_ec016(client):
    """EC-016: API rejects mismatched line UoM without converting."""
    res = client.post(
        "/recipes",
        json={
            "name": "Bad UoM Bread",
            "yield": 10.0,
            "target_margin": 0.4,
            "lines": [
                {"material_id": "mat-flour-001", "quantity": 5.0, "uom": "g"},
            ],
        },
    )
    assert res.status_code == 400
    err = res.json()["error"]
    assert err["code"] == "uom_mismatch"
    assert err["details"]["line_uom"] == "g"
    assert err["details"]["material_uom"] == "kg"


def test_zero_cost_recipe_via_api_ec017(client):
    """EC-017: unit_cost 0 → recommended_sell_price numeric 0 (+ DEC-16 label)."""
    mat = client.post(
        "/materials",
        json={
            "id": "mat-zero-001",
            "name": "Free scrap",
            "uom": "kg",
            "list_price": 0.0,
            "reorder_point": 0,
        },
    )
    assert mat.status_code == 201, mat.text

    recipe = client.post(
        "/recipes",
        json={
            "id": "rcp-zero-001",
            "name": "Zero Cost Batch",
            "yield": 5.0,
            "target_margin": 0.25,
            "lines": [
                {"material_id": "mat-zero-001", "quantity": 1.0, "uom": "kg"},
            ],
        },
    )
    assert recipe.status_code == 201, recipe.text

    costing = client.get("/recipes/rcp-zero-001/costing")
    assert costing.status_code == 200
    snap = costing.json()
    assert snap["unit_cost"] == 0.0
    assert snap["recommended_sell_price"] == 0.0
    assert snap["recommended_price_label"] == "n/a / zero cost"


def test_inventory_and_orders_routes_present(client):
    """Inventory/orders Module 2 routes exist (EC-004 covered in test_inventory_orders)."""
    assert client.get("/inventory").status_code == 200
    assert client.get("/orders").status_code == 200
    assert client.get("/inventory/adjustments").status_code == 200


def test_copilot_unsupported_screen(client):
    res = client.post(
        "/copilot/chat",
        json={
            "message": "What is low stock?",
            "context": {"screen": "inventory"},
        },
    )
    assert res.status_code == 400
    err = res.json()["error"]
    assert err["code"] == "screen_not_implemented"
