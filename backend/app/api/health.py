from fastapi import APIRouter, Depends

from app.auth import require_auth_if_configured
from app.schemas.common import HealthOut
from app.settings import Settings, get_settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
async def health(settings: Settings = Depends(get_settings)) -> HealthOut:
    """Liveness; no auth required for local smoke."""
    return HealthOut(
        status="ok",
        runtime=settings.resolved_runtime,
        storage="memory",
        auth_mode="bearer" if settings.auth_enabled else "open_local",
        llm_configured=settings.llm_configured,
    )


@router.get("/health/auth-check", dependencies=[Depends(require_auth_if_configured)])
async def health_auth_check() -> dict[str, str]:
    return {"status": "ok", "auth": "passed"}
