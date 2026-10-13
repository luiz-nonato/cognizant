"""Copilot orchestration: engine JSON → costing_analyst (or deterministic fallback)."""

from __future__ import annotations

import concurrent.futures
from typing import Any

from app.schemas.copilot import CopilotChatResponse
from app.settings import Settings


def build_grounded_fallback_reply(
    message: str,
    engine_payload: dict[str, Any],
) -> CopilotChatResponse:
    """Deterministic reply built only from engine numbers (no LLM)."""
    unit_cost = engine_payload.get("unit_cost")
    recommended = engine_payload.get("recommended_sell_price")
    method = engine_payload.get("input_unit_cost_method")
    label = engine_payload.get("recommended_price_label")
    yield_qty = engine_payload.get("yield")
    total = engine_payload.get("total_material_cost")
    margin = engine_payload.get("target_margin")
    name = engine_payload.get("recipe_name", "recipe")

    price_phrase = (
        f"recommended sell price is {recommended} ({label})"
        if label
        else f"recommended sell price is {recommended}"
    )
    reply = (
        f"For {name}: total material cost is {total}, yield is {yield_qty}, "
        f"unit cost is {unit_cost} (method: {method}), target margin is {margin}, "
        f"and {price_phrase}. "
        f"Response grounded in engine snapshot only (fallback; user asked: {message[:120]})."
    )
    return CopilotChatResponse(
        reply=reply,
        citations=engine_payload,
        grounding_timestamp=str(engine_payload.get("grounding_timestamp", "")),
        agent="costing_analyst",
    )


def run_costing_copilot(
    message: str,
    engine_payload: dict[str, Any],
    settings: Settings,
) -> CopilotChatResponse:
    """Prefer CrewAI kickoff when OPENAI_API_KEY is set; else grounded fallback."""
    if not settings.llm_configured:
        return build_grounded_fallback_reply(message, engine_payload)

    # Import lazily so the API starts without forcing LLM init at import time.
    from app.crew_runtime import kickoff_costing_analyst

    timeout = max(1, int(settings.copilot_timeout_seconds))

    def _run() -> CopilotChatResponse:
        return kickoff_costing_analyst(
            message=message,
            engine_payload=engine_payload,
            settings=settings,
        )

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_run)
            return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError as exc:
        raise TimeoutError(
            f"Copilot exceeded COPILOT_TIMEOUT_SECONDS={timeout}"
        ) from exc
    except Exception:
        # LLM/provider failures must not invent numbers; fall back to grounded text.
        return build_grounded_fallback_reply(message, engine_payload)
