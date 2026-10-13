"""CrewAI kickoff factory — one specialist per screen (ADR-15).

Week 4 bonus: optional Crew planning + agent planning_config (reasoning),
with best-effort capture of injected plan text into the copilot response.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import yaml
from crewai import Agent, Crew, Process, Task
from pydantic import ValidationError

from app.schemas.copilot import CopilotChatResponse
from app.services.copilot import build_grounded_fallback_reply
from app.settings import Settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]
AGENTS_YAML = BACKEND_ROOT / "config" / "agents.yaml"
TASKS_YAML = BACKEND_ROOT / "config" / "tasks.yaml"


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Expected mapping in {path}")
    return data


def _build_costing_agent(agents_cfg: dict[str, Any], settings: Settings) -> Agent:
    cfg = dict(agents_cfg["costing_analyst"])
    llm_model = settings.llm_model or "gpt-4o-mini"
    agent_kwargs: dict[str, Any] = {
        "role": cfg["role"],
        "goal": cfg["goal"],
        "backstory": cfg["backstory"],
        "allow_delegation": bool(cfg.get("allow_delegation", False)),
        "max_iter": min(int(cfg.get("max_iter", 8)), 8),
        "verbose": bool(cfg.get("verbose", False)),
        "tools": [],  # DEC-11: no write tools; snapshot injected into task text
        "llm": llm_model,
    }
    if "max_rpm" in cfg:
        agent_kwargs["max_rpm"] = cfg["max_rpm"]

    # Week 4 bonus: agent-level reasoning via PlanningConfig (CrewAI 1.15+).
    # YAML `reasoning: true` maps to planning_config; legacy Agent.reasoning
    # is deprecated but PlanningConfig is the supported path.
    reasoning_on = bool(settings.agent_reasoning_enabled) and bool(
        cfg.get("reasoning", True)
    )
    if reasoning_on:
        from crewai.agent.planning_config import PlanningConfig

        effort = str(cfg.get("reasoning_effort", "low")).strip().lower()
        if effort not in ("low", "medium", "high"):
            effort = "low"
        max_attempts = int(
            cfg.get("max_reasoning_attempts", settings.max_reasoning_attempts)
        )
        agent_kwargs["planning_config"] = PlanningConfig(
            reasoning_effort=effort,  # type: ignore[arg-type]
            max_attempts=max(1, max_attempts),
            max_steps=8,
        )

    return Agent(**agent_kwargs)


def _capture_injected_plan_text(tasks: list[Task], originals: list[str]) -> str | None:
    """CrewAI planning/reasoning appends plan text onto task.description."""
    chunks: list[str] = []
    for idx, (task, original) in enumerate(zip(tasks, originals, strict=False)):
        current = task.description or ""
        if original and current.startswith(original) and len(current) > len(original):
            injected = current[len(original) :].strip()
            if injected:
                chunks.append(f"### Task {idx + 1}\n{injected}")
        elif current and current != original and original:
            # Fallback: description changed but not a simple suffix append.
            chunks.append(f"### Task {idx + 1}\n{current}")
    if not chunks:
        return None
    return "\n\n".join(chunks)


def build_costing_crew(
    message: str,
    engine_payload: dict[str, Any],
    settings: Settings,
) -> Crew:
    """Process.sequential: validate_costing → explain_costing for costing_analyst only."""
    agents_cfg = _load_yaml(AGENTS_YAML)
    tasks_cfg = _load_yaml(TASKS_YAML)

    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
    if settings.openai_api_base:
        os.environ.setdefault("OPENAI_API_BASE", settings.openai_api_base)

    agent = _build_costing_agent(agents_cfg, settings)
    engine_json = json.dumps(engine_payload, default=str)

    validate_cfg = tasks_cfg["validate_costing"]
    explain_cfg = tasks_cfg["explain_costing"]

    validate_task = Task(
        description=validate_cfg["description"].format(
            engine_json=engine_json,
            user_message=message,
        ),
        expected_output=validate_cfg["expected_output"],
        agent=agent,
    )
    explain_task = Task(
        description=explain_cfg["description"].format(
            engine_json=engine_json,
            user_message=message,
        ),
        expected_output=explain_cfg["expected_output"],
        agent=agent,
        context=[validate_task],
        output_pydantic=CopilotChatResponse,
    )

    crew_kwargs: dict[str, Any] = {
        "agents": [agent],
        "tasks": [validate_task, explain_task],
        "process": Process.sequential,
        "memory": False,
        "max_rpm": settings.crew_max_rpm,
        "max_execution_time": max(1, int(settings.copilot_timeout_seconds)),
        "planning": bool(settings.crew_planning_enabled),
    }
    if settings.crew_planning_enabled:
        planner = (settings.crew_planning_llm or settings.llm_model or "").strip()
        if planner:
            crew_kwargs["planning_llm"] = planner

    return Crew(**crew_kwargs)


def _to_response(
    *,
    reply: str,
    engine_payload: dict[str, Any],
    grounding_timestamp: str,
    crew_plan: str | None,
    agent_reasoning: str | None,
) -> CopilotChatResponse:
    return CopilotChatResponse(
        reply=reply,
        citations=engine_payload,
        grounding_timestamp=grounding_timestamp,
        agent="costing_analyst",
        # Runtime-owned artifacts — ignore any model-supplied plan fields.
        crew_plan=crew_plan,
        agent_reasoning=agent_reasoning,
    )


def kickoff_costing_analyst(
    message: str,
    engine_payload: dict[str, Any],
    settings: Settings,
) -> CopilotChatResponse:
    """Run recipe copilot; normalize output to CopilotChatResponse + plan artifacts."""
    crew = build_costing_crew(message, engine_payload, settings)
    originals = [t.description or "" for t in crew.tasks]
    result = crew.kickoff()

    injected = _capture_injected_plan_text(list(crew.tasks), originals)
    crew_plan = injected if settings.crew_planning_enabled else None
    agent_reasoning = None
    if settings.agent_reasoning_enabled:
        if injected:
            agent_reasoning = (
                "Agent planning_config ran before task execution. "
                "CrewAI injects plan/reasoning text into task descriptions; "
                "captured content is mirrored in crew_plan."
            )
        else:
            agent_reasoning = (
                "Agent reasoning enabled; no separate reasoning text was "
                "captured from this run."
            )

    grounding = str(engine_payload.get("grounding_timestamp", ""))

    pydantic_out = getattr(result, "pydantic", None)
    if isinstance(pydantic_out, CopilotChatResponse):
        return _to_response(
            reply=pydantic_out.reply,
            engine_payload=engine_payload,
            grounding_timestamp=grounding or pydantic_out.grounding_timestamp,
            crew_plan=crew_plan,
            agent_reasoning=agent_reasoning,
        )

    raw = getattr(result, "json_dict", None) or getattr(result, "raw", None)
    if isinstance(raw, dict):
        try:
            parsed = CopilotChatResponse.model_validate(raw)
            return _to_response(
                reply=parsed.reply,
                engine_payload=engine_payload,
                grounding_timestamp=grounding or parsed.grounding_timestamp,
                crew_plan=crew_plan,
                agent_reasoning=agent_reasoning,
            )
        except ValidationError:
            pass

    fallback = build_grounded_fallback_reply(message, engine_payload)
    return _to_response(
        reply=fallback.reply,
        engine_payload=engine_payload,
        grounding_timestamp=fallback.grounding_timestamp,
        crew_plan=crew_plan,
        agent_reasoning=agent_reasoning,
    )
