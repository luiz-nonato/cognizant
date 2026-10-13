"""Build costing snapshots from repository state via the domain engine."""

from __future__ import annotations

from typing import Any

from app.domain.engine import CostingError, compute_costing_snapshot
from app.repository.base import Repository


def costing_snapshot_for_recipe(repo: Repository, recipe_id: str) -> dict[str, Any]:
    recipe = repo.get_recipe(recipe_id)
    if recipe is None:
        raise CostingError(
            "recipe_not_found",
            f"Recipe {recipe_id} not found",
            {"recipe_id": recipe_id},
        )
    materials = {m.id: m for m in repo.list_materials()}
    return compute_costing_snapshot(recipe, materials)


def resolve_recipe_id_for_copilot(
    repo: Repository, entity_ids: list[str] | None
) -> str:
    if entity_ids:
        return entity_ids[0]
    recipes = repo.list_recipes()
    if not recipes:
        raise CostingError(
            "no_recipe",
            "No recipe available for costing explanation",
            {},
        )
    return recipes[0].id
