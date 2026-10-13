"""Week 4 bonus — planning/reasoning artifact helpers (no live LLM)."""

from __future__ import annotations

from types import SimpleNamespace

from app.crew_runtime import _capture_injected_plan_text
from app.schemas.copilot import CopilotChatResponse


def test_capture_injected_plan_text_suffix():
    originals = ["Base task A", "Base task B"]
    tasks = [
        SimpleNamespace(description="Base task A\n\nStep 1: check fields"),
        SimpleNamespace(description="Base task B\n\nStep 1: narrate costs"),
    ]
    captured = _capture_injected_plan_text(tasks, originals)  # type: ignore[arg-type]
    assert captured is not None
    assert "Task 1" in captured
    assert "check fields" in captured
    assert "narrate costs" in captured


def test_capture_injected_plan_text_none_when_unchanged():
    originals = ["Same"]
    tasks = [SimpleNamespace(description="Same")]
    assert _capture_injected_plan_text(tasks, originals) is None  # type: ignore[arg-type]


def test_copilot_response_optional_plan_fields_default_none():
    body = CopilotChatResponse(
        reply="unit cost is 1.0",
        citations={"unit_cost": 1.0},
        grounding_timestamp="2026-10-13T00:00:00+00:00",
        agent="costing_analyst",
    )
    assert body.crew_plan is None
    assert body.agent_reasoning is None


def test_fallback_copilot_omits_plan_artifacts(client):
    """Deterministic path (no OPENAI_API_KEY) keeps plan fields null."""
    res = client.post(
        "/copilot/chat",
        json={
            "message": "Why is unit cost 1?",
            "context": {"screen": "recipe", "entity_ids": ["rcp-bread-001"]},
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["agent"] == "costing_analyst"
    assert body.get("crew_plan") is None
    assert body.get("agent_reasoning") is None
