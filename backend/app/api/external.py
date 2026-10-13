"""External REST integrations (Open Food Facts)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.errors import error_payload
from app.auth import require_auth_if_configured
from app.deps import get_app_settings
from app.schemas.external import FoodProductSearchResponse, FoodProductSuggestion
from app.services.open_food_facts import ExternalApiError, search_food_products
from app.settings import Settings

router = APIRouter(
    prefix="/external",
    tags=["external"],
    dependencies=[Depends(require_auth_if_configured)],
)


@router.get("/food-products", response_model=FoodProductSearchResponse)
async def lookup_food_products(
    q: str = Query(..., min_length=1, max_length=120, description="Search terms"),
    settings: Settings = Depends(get_app_settings),
) -> FoodProductSearchResponse:
    try:
        products = search_food_products(
            q,
            base_url=settings.open_food_facts_base_url,
            timeout_seconds=float(settings.external_http_timeout_seconds),
        )
    except ExternalApiError as exc:
        code = (
            status.HTTP_504_GATEWAY_TIMEOUT
            if exc.code == "external_timeout"
            else status.HTTP_502_BAD_GATEWAY
        )
        if exc.code == "query_required":
            code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=code,
            detail=error_payload(exc.code, exc.message, exc.details),
        ) from exc

    return FoodProductSearchResponse(
        query=q.strip(),
        products=[FoodProductSuggestion(**p) for p in products],
    )
