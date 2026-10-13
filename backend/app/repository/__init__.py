"""Storage abstraction — Week 3 uses in-memory; Postgres swappable later."""

from app.repository.base import Repository
from app.repository.memory import InMemoryRepository, build_default_repository

__all__ = ["Repository", "InMemoryRepository", "build_default_repository"]
