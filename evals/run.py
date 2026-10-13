"""
Week 3 eval runner — EC-001, EC-002, EC-004, EC-005, EC-016, EC-017.

Usage (repo root, venv active):
  .\\.venv\\Scripts\\python.exe evals\\run.py
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from evals.checks.code_checks import (  # noqa: E402
    CheckResult,
    check_ec001_contribution,
    check_ec002_price,
    check_ec004_produce_deferred,
    check_ec005_envelope,
    check_ec016_uom,
    check_ec017_zero_cost,
)


def _load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def _material(data: dict):
    from app.domain.models import Material

    return Material(
        id=data["id"],
        name=data["name"],
        uom=data["uom"],
        list_price=float(data["list_price"]),
    )


def _recipe(data: dict):
    from app.domain.models import Recipe, RecipeLine

    return Recipe(
        id=data["id"],
        name=data["name"],
        yield_qty=float(data["yield"]),
        target_margin=float(data.get("target_margin", 0.0)),
        lines=[
            RecipeLine(
                material_id=ln["material_id"],
                quantity=float(ln["quantity"]),
                uom=ln["uom"],
            )
            for ln in data["lines"]
        ],
    )


def run_costing_dataset(path: Path) -> list[CheckResult]:
    from app.domain.engine import CostingError, compute_costing_snapshot, recommended_sell_price

    results: list[CheckResult] = []
    for item in _load_jsonl(path):
        item_id = item["id"]
        kind = item.get("kind")

        if kind == "margin_reject":
            raised = False
            try:
                recommended_sell_price(item["unit_cost"], item["target_margin"])
            except CostingError as exc:
                raised = exc.code == "invalid_margin"
            results.append(
                check_ec002_price(
                    item_id,
                    item["unit_cost"],
                    item["target_margin"],
                    0.0,
                    expect_reject=True,
                    reject_raised=raised,
                )
            )
            continue

        if kind == "uom_mismatch":
            mat = _material(item["material"])
            recipe = _recipe(item["recipe"])
            code = None
            try:
                compute_costing_snapshot(recipe, {mat.id: mat})
            except CostingError as exc:
                code = exc.code
            results.append(check_ec016_uom(item_id, error_code=code, converted=False))
            continue

        materials: dict = {}
        if "material" in item:
            m = _material(item["material"])
            materials[m.id] = m
        for row in item.get("materials") or []:
            m = _material(row)
            materials[m.id] = m
        recipe = _recipe(item["recipe"])
        snap = compute_costing_snapshot(recipe, materials)
        expect = item["expect"]

        if "EC-001" in item["ec"]:
            results.append(
                check_ec001_contribution(
                    item_id,
                    snap,
                    expect["unit_cost"],
                    expect["contributions"],
                )
            )
        if "EC-002" in item["ec"]:
            results.append(
                check_ec002_price(
                    item_id,
                    snap["unit_cost"],
                    recipe.target_margin,
                    snap["recommended_sell_price"],
                )
            )
        if "EC-017" in item["ec"]:
            results.append(
                check_ec017_zero_cost(
                    item_id,
                    snap["unit_cost"],
                    snap["recommended_sell_price"],
                    snap.get("recommended_price_label"),
                )
            )
    return results


def run_copilot_dataset(path: Path) -> list[CheckResult]:
    import os

    os.environ["SECRET_KEY"] = ""
    os.environ["OPENAI_API_KEY"] = ""

    from fastapi.testclient import TestClient

    from app.deps import get_repository
    from app.main import create_app
    from app.repository.memory import build_default_repository
    from app.settings import get_settings

    get_settings.cache_clear()
    get_repository.cache_clear()
    app = create_app()
    repo = build_default_repository()
    app.dependency_overrides[get_repository] = lambda: repo
    results: list[CheckResult] = []

    with TestClient(app) as client:
        for item in _load_jsonl(path):
            item_id = item["id"]
            entity_ids = list(item["context"]["entity_ids"])

            if item.get("setup") == "zero_cost_via_api":
                mat = client.post(
                    "/materials",
                    json={
                        "id": "mat-zero-eval-001",
                        "name": "Free scrap eval",
                        "uom": "kg",
                        "list_price": 0.0,
                        "reorder_point": 0,
                    },
                )
                assert mat.status_code == 201, mat.text
                recipe = client.post(
                    "/recipes",
                    json={
                        "id": entity_ids[0],
                        "name": "Zero Cost Eval",
                        "yield": 5.0,
                        "target_margin": 0.25,
                        "lines": [
                            {
                                "material_id": "mat-zero-eval-001",
                                "quantity": 1.0,
                                "uom": "kg",
                            }
                        ],
                    },
                )
                assert recipe.status_code == 201, recipe.text
                costing = client.get(f"/recipes/{entity_ids[0]}/costing").json()
                if "EC-017" in item["ec"]:
                    results.append(
                        check_ec017_zero_cost(
                            item_id,
                            costing["unit_cost"],
                            costing["recommended_sell_price"],
                            costing.get("recommended_price_label"),
                        )
                    )

            res = client.post(
                "/copilot/chat",
                json={
                    "message": item["message"],
                    "context": {
                        "screen": item["context"]["screen"],
                        "entity_ids": entity_ids,
                    },
                },
            )
            assert res.status_code == 200, res.text
            body = res.json()
            if "EC-005" in item["ec"]:
                results.append(
                    check_ec005_envelope(
                        item_id,
                        body,
                        expected_agent=item.get("expect_agent", "costing_analyst"),
                    )
                )

        # API-level UoM (EC-016) fixture
        uom_res = client.post(
            "/recipes",
            json={
                "name": "Bad UoM Eval",
                "yield": 10.0,
                "target_margin": 0.4,
                "lines": [
                    {"material_id": "mat-flour-001", "quantity": 5.0, "uom": "g"},
                ],
            },
        )
        code = None
        if uom_res.status_code == 400:
            code = uom_res.json().get("error", {}).get("code")
        results.append(
            check_ec016_uom("api-uom-mismatch", error_code=code, converted=False)
        )

    app.dependency_overrides.clear()
    get_repository.cache_clear()
    get_settings.cache_clear()
    return results


def summarize(results: list[CheckResult]) -> dict[str, dict[str, int]]:
    summary: dict[str, dict[str, int]] = defaultdict(
        lambda: {"pass": 0, "fail": 0, "deferred": 0}
    )
    for r in results:
        if r.passed is True:
            summary[r.ec_id]["pass"] += 1
        elif r.passed is False:
            summary[r.ec_id]["fail"] += 1
        else:
            summary[r.ec_id]["deferred"] += 1
    return dict(summary)


def main() -> int:
    dataset_dir = ROOT / "evals" / "dataset"
    results: list[CheckResult] = []
    results.extend(run_costing_dataset(dataset_dir / "week3_costing.jsonl"))
    results.extend(run_copilot_dataset(dataset_dir / "week3_copilot.jsonl"))
    results.append(check_ec004_produce_deferred())

    summary = summarize(results)
    print("Week 3 eval results (crewai)")
    print("-" * 40)
    for r in results:
        status = (
            "PASS"
            if r.passed is True
            else ("FAIL" if r.passed is False else "DEFERRED")
        )
        print(f"[{status}] {r.ec_id} {r.item_id}: {r.detail}")
    print("-" * 40)
    for ec_id in sorted(summary):
        s = summary[ec_id]
        print(
            f"{ec_id}: pass={s['pass']} fail={s['fail']} deferred={s['deferred']}"
        )

    hard_fail = any(r.passed is False for r in results)
    out_path = ROOT / "project-context" / "2.build" / "logs" / "week3-evals-last-run.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "summary": summary,
        "results": [
            {
                "ec_id": r.ec_id,
                "item_id": r.item_id,
                "passed": r.passed,
                "detail": r.detail,
            }
            for r in results
        ],
    }
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {out_path}")
    return 1 if hard_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
