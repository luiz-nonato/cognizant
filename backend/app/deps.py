"""FastAPI dependencies (repository singleton, settings)."""

from __future__ import annotations

from functools import lru_cache

from app.repository.memory import InMemoryRepository, build_default_repository
from app.settings import Settings, get_settings


@lru_cache
def get_repository() -> InMemoryRepository:
    """Week 3: in-memory seed. Swap implementation when DATABASE_URL + Docker available."""
    return build_default_repository()


def get_app_settings() -> Settings:
    return get_settings()
