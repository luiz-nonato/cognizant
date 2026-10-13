from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.errors import error_payload
from app.auth import require_auth_if_configured
from app.deps import get_app_settings, get_repository
from app.domain.engine import CostingError
from app.repository.memory import InMemoryRepository
from app.schemas.copilot import CopilotChatRequest, CopilotChatResponse
from app.services.copilot import run_costing_copilot
from app.services.costing import costing_snapshot_for_recipe, resolve_recipe_id_for_copilot
from app.settings import Settings

router = APIRouter(
    prefix="/copilot",
    tags=["copilot"],
    dependencies=[Depends(require_auth_if_configured)],
)

WEEK3_SUPPORTED_SCREENS = {"recipe"}


@router.post("/chat", response_model=CopilotChatResponse)
async def copilot_chat(
    body: CopilotChatRequest,
    repo: InMemoryRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> CopilotChatResponse | JSONResponse:
    screen = body.context.screen
    if screen not in WEEK3_SUPPORTED_SCREENS:
        return JSONResponse(
            status_code=400,
            content=error_payload(
                "unknown_screen" if screen not in {
                    "recipe", "inventory", "orders", "dashboard"
                } else "screen_not_implemented",
                (
                    f"Unknown screen '{screen}'"
                    if screen not in {"recipe", "inventory", "orders", "dashboard"}
                    else f"Screen '{screen}' is not wired in Week 3; only 'recipe' → costing_analyst"
                ),
                {"screen": screen, "week3_supported": sorted(WEEK3_SUPPORTED_SCREENS)},
            ),
        )

    try:
        recipe_id = resolve_recipe_id_for_copilot(repo, body.context.entity_ids)
        engine_payload = costing_snapshot_for_recipe(repo, recipe_id)
    except CostingError as exc:
        status_code = 404 if exc.code in {"recipe_not_found", "material_not_found", "no_recipe"} else 400
        return JSONResponse(
            status_code=status_code,
            content=error_payload(exc.code, exc.message, exc.details),
        )

    try:
        return run_costing_copilot(body.message, engine_payload, settings)
    except TimeoutError as exc:
        return JSONResponse(
            status_code=504,
            content=error_payload(
                "copilot_timeout",
                str(exc),
                {"timeout_seconds": settings.copilot_timeout_seconds},
            ),
        )
