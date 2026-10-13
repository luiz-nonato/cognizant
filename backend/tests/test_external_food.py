"""Sprint 4 Open Food Facts external API (mocked HTTP)."""

from __future__ import annotations

import httpx
import pytest

from app.services.open_food_facts import ExternalApiError, search_food_products


def test_search_food_products_normalizes(monkeypatch):
    sample = {
        "products": [
            {
                "product_name": "Organic Flour",
                "brands": "Demo Brand",
                "code": "123456",
                "quantity": "1 kg",
            },
            {"product_name": "", "code": "skip"},
            {
                "product_name_en": "Wheat Flour",
                "brands": "",
                "code": "999",
            },
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert "search.pl" in str(request.url)
        assert "flour" in str(request.url)
        return httpx.Response(200, json=sample)

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as client:
        rows = search_food_products("flour", client=client)

    assert len(rows) == 2
    assert rows[0]["name"] == "Organic Flour"
    assert rows[0]["brands"] == "Demo Brand"
    assert rows[0]["barcode"] == "123456"
    assert rows[0]["source"] == "open_food_facts"
    assert rows[1]["name"] == "Wheat Flour"


def test_search_food_products_empty_query():
    with pytest.raises(ExternalApiError) as exc:
        search_food_products("  ")
    assert exc.value.code == "query_required"


def test_external_food_products_endpoint(client, monkeypatch):
    def fake_search(query, **kwargs):
        return [
            {
                "name": f"Mock {query}",
                "brands": "Test",
                "barcode": "1",
                "quantity_label": "500 g",
                "source": "open_food_facts",
            }
        ]

    monkeypatch.setattr(
        "app.api.external.search_food_products",
        fake_search,
    )
    res = client.get("/external/food-products", params={"q": "flour"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["query"] == "flour"
    assert body["products"][0]["name"] == "Mock flour"


def test_external_food_products_timeout_maps_504(client, monkeypatch):
    def boom(query, **kwargs):
        raise ExternalApiError("external_timeout", "timed out", {"query": query})

    monkeypatch.setattr("app.api.external.search_food_products", boom)
    res = client.get("/external/food-products", params={"q": "flour"})
    assert res.status_code == 504
    assert res.json()["error"]["code"] == "external_timeout"
