"""Dashboard aggregate endpoint (FR-DSH)."""

from fastapi import APIRouter, Depends

from app.auth import require_auth_if_configured
from app.deps import get_repository
from app.repository.memory import InMemoryRepository
from app.schemas.dashboard import DashboardSnapshot
from app.services import dashboard as dashboard_svc

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_auth_if_configured)],
)


@router.get("", response_model=DashboardSnapshot)
async def get_dashboard(
    repo: InMemoryRepository = Depends(get_repository),
) -> DashboardSnapshot:
    return DashboardSnapshot(**dashboard_svc.build_dashboard(repo))
