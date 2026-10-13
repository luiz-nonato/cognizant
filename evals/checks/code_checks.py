"""Code-based EC graders (Week 3 slice: EC-001, 002, 004, 005, 016, 017)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass
class CheckResult:
    ec_id: str
    passed: bool | None  # None = deferred / N/A
    detail: str
    item_id: str = ""


def approx_equal(a: float, b: float, tol: float = 1e-9) -> bool:
    return abs(float(a) - float(b)) <= tol


def check_ec001_contribution(
    item_id: str,
    snap: dict[str, Any],
    expected_unit_cost: float,
    expected_contributions: dict[str, float],
) -> CheckResult:
    """Golden recipes: unit cost + line contribution % match."""
    if not approx_equal(snap["unit_cost"], expected_unit_cost):
        return CheckResult(
            "EC-001",
            False,
            f"unit_cost {snap['unit_cost']} != {expected_unit_cost}",
            item_id,
        )
    by_id = {row["material_id"]: row for row in snap["lines"]}
    for material_id, expected_pct in expected_contributions.items():
        actual = by_id[material_id]["contribution_pct"]
        if not approx_equal(actual, expected_pct):
            return CheckResult(
                "EC-001",
                False,
                f"{material_id} contribution_pct {actual} != {expected_pct}",
                item_id,
            )
    return CheckResult("EC-001", True, "unit cost and contributions match", item_id)


def check_ec002_price(
    item_id: str,
    unit_cost: float,
    target_margin: float,
    recommended: float,
    *,
    expect_reject: bool = False,
    reject_raised: bool = False,
) -> CheckResult:
    """Recommended price = unit_cost / (1 - margin); margin >= 1 rejected."""
    if expect_reject:
        if reject_raised:
            return CheckResult("EC-002", True, "margin >= 1 rejected", item_id)
        return CheckResult("EC-002", False, "expected invalid_margin rejection", item_id)
    expected = unit_cost / (1.0 - target_margin)
    if approx_equal(recommended, expected):
        return CheckResult("EC-002", True, f"price matches {expected}", item_id)
    return CheckResult(
        "EC-002",
        False,
        f"recommended {recommended} != {expected}",
        item_id,
    )


def check_ec004_produce_deferred(item_id: str = "produce-absent") -> CheckResult:
    """Produce/ship inventory formula not in Week 3 build — deferred with evidence."""
    return CheckResult(
        "EC-004",
        None,
        "Deferred: no produce/ship inventory APIs; yield used only for costing "
        "(unit_cost = total / yield). Evidence: POST /orders/produce, "
        "/inventory/produce, /produce -> 404; backend.md Gaps.",
        item_id,
    )


def citation_numeric_values(citations: dict[str, Any]) -> list[float]:
    keys = (
        "total_material_cost",
        "yield",
        "unit_cost",
        "target_margin",
        "recommended_sell_price",
    )
    values: list[float] = []
    for key in keys:
        raw = citations.get(key)
        if isinstance(raw, (int, float)):
            values.append(float(raw))
    for line in citations.get("lines") or []:
        for key in ("line_cost", "contribution_pct", "input_unit_cost", "quantity"):
            raw = line.get(key)
            if isinstance(raw, (int, float)):
                values.append(float(raw))
    return values


def check_ec005_envelope(
    item_id: str,
    body: dict[str, Any],
    *,
    expected_agent: str = "costing_analyst",
) -> CheckResult:
    """Four-field envelope; agent specialist; reply numbers agree with citations."""
    required = {"reply", "citations", "grounding_timestamp", "agent"}
    if set(body.keys()) != required:
        return CheckResult(
            "EC-005",
            False,
            f"fields {set(body.keys())} != {required}",
            item_id,
        )
    if body.get("agent") != expected_agent:
        return CheckResult(
            "EC-005",
            False,
            f"agent {body.get('agent')!r} != {expected_agent!r}",
            item_id,
        )
    if not body.get("grounding_timestamp"):
        return CheckResult("EC-005", False, "empty grounding_timestamp", item_id)

    cited = citation_numeric_values(body["citations"])
    disagreements: list[str] = []
    for token in re.findall(r"-?\d+(?:\.\d+)?", body["reply"]):
        number = float(token)
        if any(approx_equal(number, c, tol=1e-6) for c in cited):
            continue
        disagreements.append(token)
    if disagreements:
        return CheckResult(
            "EC-005",
            False,
            f"reply/citation disagreements: {disagreements}",
            item_id,
        )
    return CheckResult("EC-005", True, "envelope + grounding OK", item_id)


def check_ec016_uom(
    item_id: str,
    *,
    error_code: str | None,
    converted: bool = False,
) -> CheckResult:
    """UoM mismatch returns uom_mismatch and does not convert."""
    if converted:
        return CheckResult("EC-016", False, "UoM was converted (forbidden)", item_id)
    if error_code == "uom_mismatch":
        return CheckResult("EC-016", True, "uom_mismatch without conversion", item_id)
    return CheckResult(
        "EC-016",
        False,
        f"expected uom_mismatch, got {error_code!r}",
        item_id,
    )


def check_ec017_zero_cost(
    item_id: str,
    unit_cost: float,
    recommended: float,
    label: str | None,
) -> CheckResult:
    """Unit cost 0 → recommended price numeric 0 (DEC-16 label expected)."""
    if not approx_equal(unit_cost, 0.0):
        return CheckResult(
            "EC-017",
            False,
            f"fixture unit_cost {unit_cost} is not 0",
            item_id,
        )
    if not approx_equal(recommended, 0.0):
        return CheckResult(
            "EC-017",
            False,
            f"recommended {recommended} != 0",
            item_id,
        )
    if label != "n/a / zero cost":
        return CheckResult(
            "EC-017",
            False,
            f"label {label!r} != 'n/a / zero cost'",
            item_id,
        )
    return CheckResult("EC-017", True, "zero-cost price and label OK", item_id)
