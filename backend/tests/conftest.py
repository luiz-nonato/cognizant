import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    # Ensure open local auth and no LLM for API smoke.
    monkeypatch.setenv("SECRET_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    from app.settings import get_settings
    from app.services.hitl import reset_hitl_store

    get_settings.cache_clear()
    reset_hitl_store()

    from app.deps import get_repository
    from app.main import create_app
    from app.repository.memory import build_default_repository

    get_repository.cache_clear()
    app = create_app()
    # One shared seed repo for the whole TestClient session (creates must persist).
    repo = build_default_repository()
    app.dependency_overrides[get_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    get_repository.cache_clear()
    get_settings.cache_clear()
    reset_hitl_store()
