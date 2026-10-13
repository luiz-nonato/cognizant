"""CrewAI kickoff factory — one specialist per screen (ADR-15)."""

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
    # temperature kept low for grounded narration
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
    return Agent(**agent_kwargs)


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

    return Crew(
        agents=[agent],
        tasks=[validate_task, explain_task],
        process=Process.sequential,
        memory=False,
        max_rpm=settings.crew_max_rpm,
        max_execution_time=max(1, int(settings.copilot_timeout_seconds)),
    )


def kickoff_costing_analyst(
    message: str,
    engine_payload: dict[str, Any],
    settings: Settings,
) -> CopilotChatResponse:
    """Run Week 3 recipe copilot; normalize output to CopilotChatResponse."""
    crew = build_costing_crew(message, engine_payload, settings)
    result = crew.kickoff()

    pydantic_out = getattr(result, "pydantic", None)
    if isinstance(pydantic_out, CopilotChatResponse):
        # Force citations to engine JSON so the model cannot substitute numbers.
        return CopilotChatResponse(
            reply=pydantic_out.reply,
            citations=engine_payload,
            grounding_timestamp=str(
                engine_payload.get("grounding_timestamp")
                or pydantic_out.grounding_timestamp
            ),
            agent="costing_analyst",
        )

    raw = getattr(result, "json_dict", None) or getattr(result, "raw", None)
    if isinstance(raw, dict):
        try:
            parsed = CopilotChatResponse.model_validate(raw)
            return CopilotChatResponse(
                reply=parsed.reply,
                citations=engine_payload,
                grounding_timestamp=str(
                    engine_payload.get("grounding_timestamp") or parsed.grounding_timestamp
                ),
                agent="costing_analyst",
            )
        except ValidationError:
            pass

    # Last resort: grounded fallback (still four-field envelope).
    return build_grounded_fallback_reply(message, engine_payload)
