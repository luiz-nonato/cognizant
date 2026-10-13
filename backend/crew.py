"""
CrewAI entrypoint — Week 3 (adapter-crewai).

Kickoff factory attaches costing_analyst only for context.screen=recipe.
Other specialists remain YAML stubs (ADR-15).
"""

from app.crew_runtime import build_costing_crew, kickoff_costing_analyst

__all__ = ["build_costing_crew", "kickoff_costing_analyst"]


if __name__ == "__main__":
    # Local smoke helper (deterministic path when no API key).
    from app.repository.memory import build_default_repository
    from app.services.copilot import run_costing_copilot
    from app.services.costing import costing_snapshot_for_recipe
    from app.settings import get_settings

    repo = build_default_repository()
    recipe = repo.list_recipes()[0]
    payload = costing_snapshot_for_recipe(repo, recipe.id)
    settings = get_settings()
    response = run_costing_copilot("Why is this unit cost?", payload, settings)
    print(response.model_dump_json(indent=2))
