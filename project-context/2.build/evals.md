# BusinessFlow — Evaluation Strategy & Results (Week 3)

Persona: `@qa.eng` (`qa-eng`)  
Action: `run-evals`  
Artifact: `project-context/2.build/evals.md`  
Resolved runtime: **`crewai`**

## Input Requirements

**PRD**: `project-context/1.define/prd.md`  
**SAD** (section 9 criteria table): `project-context/1.define/sad.md`  
**backend.md / integration.md**: `project-context/2.build/backend.md`, `integration.md`  
**Selected Runtime**: `crewai`

---

### 1. Eval Strategy

Week 3 behaviors only (SAD Implementation Guidance item 5):

1. **Costing accuracy** — material unit costs, line contribution %, recommended sell price (EC-001, EC-002).
2. **Yield in costing** — `unit_cost = total_material_cost / yield` when yield ≠ 1 (supports EC-001/002; not produce).
3. **UoM hard reject** — mismatch returns `uom_mismatch` without conversion (EC-016).
4. **Zero-cost price** — unit cost 0 → recommended price numeric 0 + DEC-16 label (EC-017).
5. **Recipe copilot grounding** — four-field `output_pydantic` envelope; `agent=costing_analyst`; reply numbers agree with citations (EC-005).
6. **Produce/ship (EC-004)** — documented deferred: not implemented in Week 3 build.

Dimensions covered in this pass: **accuracy** (primary). Latency, safety tool probes, security secret scans, and cost ceilings are out of Week 3 EC set (see Future Work).

Grading: **code-based only** (SAD methods for these ECs). No LLM-as-judge (thresholds unambiguous).

---

### 2. Success Criteria and Thresholds

Copied from SAD §9 — no invented thresholds. Step 2 gap check skipped for these rows because the SAD table already settles metric, threshold, and grading method.

| ID | Dimension | Metric | Threshold | Grading Method | Source | Week 3 result |
|----|-----------|--------|-----------|----------------|--------|---------------|
| EC-001 | Accuracy | Golden recipes match material unit cost and contribution % | 100% match | Code-based | NFR-A1; DEC-02; DEC-03; PRD §7; SAD §9 | **Pass** (3/3 items) |
| EC-002 | Accuracy | Recommended price matches `unit_cost / (1 − target_margin)`; margin ≥ 100% rejected | 100% match | Code-based | DEC-01; FR-PRC; SAD §9 | **Pass** (4/4 items) |
| EC-004 | Accuracy | Produce consumes `line_quantity × (order_quantity / yield)` … ship … no negative on-hand | 100% on fixtures | Code-based | NFR-A3; DEC-05; DEC-06; ADR-16; SAD §9 | **Deferred / N/A** |
| EC-005 | Accuracy | Fields `reply`, `citations`, `grounding_timestamp`, `agent` present; agent = screen specialist; 0 reply/citation number disagreements | 0 disagreements | Code-based schema + parse | FR-AGT; ADR-15; PRD §7; SAD §9 | **Pass** (2/2 items) |
| EC-016 | Accuracy | UoM mismatch returns `uom_mismatch` and does not convert | 100% on fixtures | Code-based | DEC-18; FR-RCP; SAD §9 | **Pass** (2/2 items) |
| EC-017 | Accuracy | Unit cost 0 yields recommended price numeric 0 | 100% on fixtures | Code-based | DEC-16; SAD §9 | **Pass** (2/2 items) |

---

### 3. Golden Dataset

Location: `evals/dataset/`

| File | Category / failure modes | Items |
| --- | --- | --- |
| `week3_costing.jsonl` | Seed golden; multi-line contributions; yield ≠ 1; margin reject; zero-cost; engine UoM mismatch | 6 |
| `week3_copilot.jsonl` | Seed recipe grounding; zero-cost recipe via API + grounding | 2 |

Provenance: **synthetic**, shaped to SAD seed fixture (`mat-flour-001` / `rcp-bread-001`) and DEC formulas — not production logs (none exist yet).

Adversarial / edge coverage included: margin ≥ 1, UoM mismatch (`g` vs `kg`), zero list price, yield ≠ 1.

EC-004 has no golden produce fixtures (feature absent).

---

### 4. Grading Methods

**Code-based** (`evals/checks/code_checks.py`):

| Function | EC |
| --- | --- |
| `check_ec001_contribution` | EC-001 |
| `check_ec002_price` | EC-002 |
| `check_ec004_produce_deferred` | EC-004 (records deferred) |
| `check_ec005_envelope` | EC-005 |
| `check_ec016_uom` | EC-016 |
| `check_ec017_zero_cost` | EC-017 |

**LLM-as-judge:** none (not required for these ECs).  
**Human review:** none for Week 3 automated gate; optional operator browser smoke remains outside this suite.

---

### 5. Implementation

| Path | Role |
| --- | --- |
| `evals/dataset/*.jsonl` | Golden inputs / expected values |
| `evals/checks/code_checks.py` | Graders |
| `evals/run.py` | Runner (engine + TestClient); writes JSON summary |
| `backend/tests/test_engine.py` | Unit gate mirroring EC-001/002/016/017 |
| `backend/tests/test_api_smoke.py` | Integration/smoke + EC-005/016/017 API |

**Runtime instrumentation (crewai):**

- This pass runs with `OPENAI_API_KEY` unset → grounded fallback (no CrewAI kickoff events).
- Last-run machine summary: `project-context/2.build/logs/week3-evals-last-run.json` (no secrets).
- Full step-callback / Prompt Trace persistence for live kickoffs remains a known gap (backend.md).

**How to re-run:**

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
.\.venv\Scripts\python.exe evals\run.py
```

---

### 6. Results

Executed: `2026-10-13` (local) via `evals/run.py` (exit 0) and `pytest backend/tests` (**18 passed**).

| EC | pass | fail | deferred | Verdict |
| --- | ---: | ---: | ---: | --- |
| EC-001 | 3 | 0 | 0 | Pass |
| EC-002 | 4 | 0 | 0 | Pass |
| EC-004 | 0 | 0 | 1 | Deferred (accepted Week 3 gap) |
| EC-005 | 2 | 0 | 0 | Pass (fallback path) |
| EC-016 | 2 | 0 | 0 | Pass |
| EC-017 | 2 | 0 | 0 | Pass |

**Deliver impact:** Week 3 accuracy ECs in scope do not block on hard fails. EC-004 deferred should be listed as an accepted gap unless the operator requires produce before Deliver. Remaining SAD ECs are out of this slice.

---

### 7. Production Monitoring Recommendations

Handoff to `@devops.eng` for Deliver (`deploy.md`):

**Request-level trace fields**

- `runtime` / adapter (`crewai`), `llm_model` (or `fallback`), kickoff vs fallback flag
- Input/output token counts when LLM used; stop reason / timeout
- Latency wall-clock for `GET /recipes/{id}/costing` and `POST /copilot/chat`
- Copilot: `agent`, `grounding_timestamp`, citation `recipe_id`, tool-call count (expect 0 writes)
- Error envelope `error.code` (`uom_mismatch`, `screen_not_implemented`, timeout, etc.)

**Dashboard metrics**

- Costing API p50/p95 latency (SAD EC-006 target ≤ 500 ms local when measured)
- Copilot p50/p95 and timeout rate (EC-009 ≤ 60 s)
- Task success rate: 2xx copilot with complete four-field envelope
- Error rate by `error.code`
- Cost per copilot request (USD and BRL display per ADR-14; ceilings still TBD — EC-013)

**Threshold alerts (placeholders until operator sets production SLAs)**

- Copilot error rate > 5% over 15 minutes
- Copilot p95 crossing 60 s or timeout spike
- Costing API p95 crossing 500 ms on demo volume (local baseline)
- Cost per request > 150% of 7-day average once EC-013 ceilings exist

**Change attribution**

- Distinguish **model/prompt drift** (LLM path) vs **formula/data drift** (engine JSON / seed data) by comparing citation snapshots to engine recomputation
- Tag releases with git SHA + `LLM_MODEL` so model-update effects are separable from recipe/material edits

**Business-KPI translation**

| Technical metric | Business signal |
| --- | --- |
| EC-001/002 pass rate on goldens | Trustworthy SKU unit cost and price |
| EC-005 disagreement count = 0 | Copilot explanations stay grounded (maker trust) |
| EC-016/017 fixture pass | No silent UoM conversion; honest zero-cost pricing |
| Copilot success rate | On-demand costing Q&A usable in demo loop |
| Latency p95 | Interactive recipe screen feel |

---

### 8. Future Work

- EC-004 produce/ship golden dataset when inventory/orders land
- Live CrewAI kickoff EC-005 job + step-callback traces under `project-context/2.build/logs`
- EC-003, EC-006–EC-015, EC-018–EC-020 per SAD §9 after P0 APIs
- Calibrated LLM judge only if interpretive ECs (e.g. EC-011) enter scope
- Operator answers for EC-013 USD/BRL ceilings (still TBD in SAD)

---

## Sources

- `project-context/1.define/sad.md` §9 Evaluation Criteria (authoritative thresholds)
- `project-context/1.define/prd.md` (§5, §7, DEC-01/02/03/16/18, FR-AGT, FR-PRC, FR-RCP)
- `project-context/2.build/backend.md`, `integration.md`, `qa.md`
- `.cursor/skills/run-evals/SKILL.md`, `reference.md`
- `.cursor/templates/evals-template.md`
- `evals/` suite + `project-context/2.build/logs/week3-evals-last-run.json`

## Assumptions

- SAD §9 supplies all thresholds for the six in-scope ECs; Step 2 operator gap check not required for these rows.
- Grounded copilot fallback is an acceptable EC-005 evaluation subject when `OPENAI_API_KEY` is unset (documented in backend.md).
- EC-004 deferred/N/A is the correct Week 3 outcome (produce formula not implemented); not scored as Fail.
- Synthetic goldens are sufficient until real maker logs exist.
- No secret values recorded in traces or this artifact.

## Open Questions

- Accept EC-004 as a Deliver-known gap, or block Deliver until produce/ship exist?
- Operator: set EC-013 USD and BRL ceilings when LLM spend monitoring is required (SAD TBD).
- Should CI run `evals/run.py` on every PR for Week 3, or only pytest?

## Audit

| Field | Value |
| --- | --- |
| persona | `@qa.eng` (`qa-eng`) |
| action | `run-evals` |
| timestamp | `2026-10-13T13:05:00-03:00` |
| resolved_runtime | `crewai` (`AAMAD_TARGET_RUNTIME` unset → config/adapter default) |
| prompt_trace | Omitted — code-based evals only; no judge model |
