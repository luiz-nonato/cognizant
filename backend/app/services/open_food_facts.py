"""Open Food Facts REST client (Sprint 4 external API integration)."""

from __future__ import annotations

from typing import Any

import httpx


class ExternalApiError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


DEFAULT_BASE_URL = "https://world.openfoodfacts.org"


def search_food_products(
    query: str,
    *,
    base_url: str = DEFAULT_BASE_URL,
    timeout_seconds: float = 10.0,
    page_size: int = 5,
    client: httpx.Client | None = None,
) -> list[dict[str, Any]]:
    """Search Open Food Facts; return normalized product suggestions."""
    q = query.strip()
    if not q:
        raise ExternalApiError(
            "query_required",
            "Food product search requires a non-empty query",
            {},
        )

    root = base_url.rstrip("/")
    url = f"{root}/cgi/search.pl"
    params = {
        "search_terms": q,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": max(1, min(int(page_size), 20)),
    }

    owns_client = client is None
    http = client or httpx.Client(timeout=timeout_seconds)
    try:
        response = http.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except httpx.TimeoutException as exc:
        raise ExternalApiError(
            "external_timeout",
            "Open Food Facts request timed out",
            {"query": q},
        ) from exc
    except httpx.HTTPError as exc:
        raise ExternalApiError(
            "external_http_error",
            "Open Food Facts request failed",
            {"query": q, "error": str(exc)},
        ) from exc
    except ValueError as exc:
        raise ExternalApiError(
            "external_invalid_json",
            "Open Food Facts returned invalid JSON",
            {"query": q},
        ) from exc
    finally:
        if owns_client:
            http.close()

    products_raw = data.get("products") if isinstance(data, dict) else None
    if not isinstance(products_raw, list):
        return []

    out: list[dict[str, Any]] = []
    for raw in products_raw:
        if not isinstance(raw, dict):
            continue
        name = (
            raw.get("product_name")
            or raw.get("product_name_en")
            or raw.get("generic_name")
            or ""
        )
        name = str(name).strip()
        if not name:
            continue
        brands = str(raw.get("brands") or "").strip() or None
        code = str(raw.get("code") or raw.get("_id") or "").strip() or None
        quantity = str(raw.get("quantity") or "").strip() or None
        out.append(
            {
                "name": name,
                "brands": brands,
                "barcode": code,
                "quantity_label": quantity,
                "source": "open_food_facts",
            }
        )
    return out
