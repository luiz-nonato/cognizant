# BusinessFlow — QA Report (Week 3 Slice)

Persona: `@qa.eng` (`qa-eng`)  
Actions: `test-unit`, `test-integration`, `qa` / `verify-flow`, `log-defects`  
Artifact: `project-context/2.build/qa.md`  
Resolved runtime: **`crewai`**  
Scope: Week 3 smoke path + eval criteria **EC-001, EC-002, EC-004, EC-005, EC-016, EC-017** only

---

## 1. Scope under test

Smoke path validated: **material → recipe with yield → engine figures → recipe-screen copilot (`costing_analyst`)**.

| In scope | Out of scope (not failing Week 3) |
| --- | --- |
| Costing engine goldens (unit cost, contribution %, recommended price) | Full P0 inventory / orders / dashboard |
| UoM mismatch (engine + `POST /recipes`) | Produce / ship inventory transitions (EC-004) |
| Zero-cost recommended price (DEC-16 / EC-017) | Live LLM kickoff (no `OPENAI_API_KEY` in this run) |
| Copilot four-field envelope + grounding (fallback) | Browser FE↔BE live servers (operator optional) |
| FastAPI TestClient integration / smoke | EC-003, EC-006–EC-015, EC-018–EC-020 |

Config prefs honored (`aamad.config.yml` `testing`): unit + integration required; AC/EC mapping below.

---

## 2. Unit

Command:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_engine.py -q
```

| Test | Result | EC / AC |
| --- | --- | --- |
| `test_unit_cost_total_over_yield_helper` | Pass | DEC-02 |
| `test_unit_cost_when_yield_not_one` | Pass | DEC-02 (costing yield ≠ 1; not produce) |
| `test_recommended_price_margin_on_sell_ec002` | Pass | EC-002 |
| `test_reject_margin_gte_one` | Pass | EC-002 |
| `test_zero_cost_recommended_price_and_label` | Pass | EC-017 |
| `test_line_contribution_pct_ec001` | Pass | EC-001 |
| `test_input_cost_list_price_when_no_purchases` | Pass | DEC-03 / EC-001 |
| `test_input_cost_weighted_average_of_purchases` | Pass | DEC-03 / EC-001 |
| `test_snapshot_seed_recipe_golden` | Pass | EC-001, EC-002 |
| `test_uom_mismatch_rejected` | Pass | EC-016 |

**Unit verdict:** Pass (10/10 in `test_engine.py`).

---

## 3. Integration

Command:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_api_smoke.py -q
```

| Test | Result | EC / AC |
| --- | --- | --- |
| `test_health` | Pass | Runtime smoke (`crewai`, memory, open_local) |
| `test_week3_smoke_material_recipe_costing_copilot` | Pass | Smoke path; EC-001/002/005 |
| `test_materials_and_recipe_costing` | Pass | EC-001, EC-002 |
| `test_copilot_recipe_fallback_envelope_ec005` | Pass | EC-005 |
| `test_create_recipe_uom_mismatch_ec016` | Pass | EC-016 |
| `test_zero_cost_recipe_via_api_ec017` | Pass | EC-017 |
| `test_produce_endpoints_absent_ec004_deferred` | Pass (documents absence) | EC-004 deferred evidence |
| `test_copilot_unsupported_screen` | Pass | Week 3 screen gate |

**Fix applied during QA:** TestClient `get_repository` override previously called `build_default_repository` per request (creates discarded). Switched to a shared repo instance in `backend/tests/conftest.py` so material/recipe creates persist across requests.

**Integration verdict:** Pass (8/8 in `test_api_smoke.py`).

---

## 4. Smoke / verify-flow

Aligned with `integration.md` FE↔BE contract; executed via FastAPI `TestClient` (no uvicorn required; `llm_configured=false` → grounded copilot fallback).

| Step | Result | Evidence |
| --- | --- | --- |
| `GET /health` | Pass | `runtime=crewai`, `storage=memory`, `auth_mode=open_local` |
| `GET /materials` | Pass | Seed `mat-flour-001` Flour / kg |
| `GET /recipes` | Pass | Seed `rcp-bread-001`, `yield=10`, margin `0.4` |
| `GET /recipes/{id}/costing` | Pass | `unit_cost=1.0`, `recommended_sell_price≈1.666…`, line contribution 100% |
| `POST /copilot/chat` (recipe) | Pass | Four fields; `agent=costing_analyst`; reply numbers ⊆ citations |
| Unsupported screen | Pass | `400` `screen_not_implemented` |
| Produce APIs | N/A | `404` on `/orders/produce`, `/inventory/produce`, `/produce` |

Full suite:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
# → 18 passed
```

**Smoke verdict:** Pass for Week 3 path.

---

## 5. Pass / fail per evaluation criterion

| EC | Metric (SAD §9) | Result | Evidence |
| --- | --- | --- | --- |
| EC-001 | Golden recipes match unit cost + contribution % (100%) | **Pass** | Engine goldens + seed costing API |
| EC-002 | Price = `unit_cost / (1 − margin)`; margin ≥ 1 rejected (100%) | **Pass** | Engine + seed API; reject test |
| EC-004 | Produce/ship yield formula on fixtures (100%) | **Deferred / N/A** | Produce not in Week 3 build; 404 evidence; yield used for costing only |
| EC-005 | Four-field envelope; agent=screen specialist; 0 reply/citation disagreements | **Pass** | Copilot fallback envelope + number parse |
| EC-016 | `uom_mismatch`, no conversion (100%) | **Pass** | Engine + `POST /recipes` |
| EC-017 | Unit cost 0 → recommended price numeric 0 (100%) | **Pass** | Engine + API create zero-cost recipe |

---

## 6. Defects (`*log-defects`)

| ID | Severity | Status | Description |
| --- | --- | --- | --- |
| QA-W3-001 | Low (test infra) | **Fixed** | TestClient repository override rebuilt seed every request; broke create→read flows. Fixed in `conftest.py` (and eval runner). |
| QA-W3-002 | Info / gap | Open (accepted for Week 3) | EC-004 produce/ship inventory transitions not implemented — deferred to later build module per SAD Implementation Guidance. |
| QA-W3-003 | Info | Open | Copilot grading this run uses deterministic grounded fallback (no `OPENAI_API_KEY`). Real CrewAI kickoff path not exercised; citations still forced to engine JSON when LLM is used (backend.md). |
| QA-W3-004 | Info | Open | Live browser smoke (uvicorn + Vite with `VITE_API_BASE_URL`) not re-run in this QA session; contract covered by TestClient + prior `integration.md` verification. |

No Week 3 P0 costing/copilot defects remain open that fail EC-001, EC-002, EC-005, EC-016, or EC-017.

---

## 7. Known gaps

- Postgres / Docker path unused (memory repository).
- Non-recipe specialists YAML-only; inventory/orders/dashboard APIs absent.
- Prompt Trace file persistence under `project-context/2.build/logs` still thin (eval run JSON written; full CrewAI step callbacks deferred).
- FE zero-cost demo toggle still uses local fixture; live seed has no zero-cost recipe until created via API (API path verified).

---

## 8. Future Work (`*future-work`)

- Implement and test EC-004 produce/ship fixtures when inventory/orders module lands.
- Eval with live LLM (`OPENAI_API_KEY`) for EC-005 kickoff path (still force citations).
- Operator browser smoke: uvicorn `:8000` + Vite `:5173` with live banner.
- Remaining SAD §9 ECs (alerts, latency p95, safety tool probes, cost-at-sale, etc.) after P0 APIs exist.
- Frontend unit/component tests if operator expands FE test policy.

---

## Sources

- `project-context/1.define/prd.md`, `project-context/1.define/sad.md` §9 Evaluation Criteria
- `project-context/2.build/frontend.md`, `backend.md`, `integration.md`, `setup.md`
- `aamad.config.yml` (`testing.*`, `security.require_security_assessment`)
- `.cursor/skills/run-evals/SKILL.md`
- Code: `backend/tests/`, `backend/app/domain/engine.py`, `backend/app/services/copilot.py`, `evals/`

## Assumptions

- Week 3 QA gate is satisfied by engine unit tests + TestClient integration/smoke without live browser.
- EC-004 is correctly treated as deferred/N/A until produce/ship exist (SAD Module 2 guidance vs Week 3 FE slice).
- Copilot fallback is a valid EC-005 subject for this environment when LLM key is unset (backend.md documented behavior).
- Thresholds taken only from SAD §9 table; no invented SLAs.

## Open Questions

- Should Deliver treat EC-004 deferred as an accepted MVP gap, or is produce required before `@devops.eng`?
- Operator confirmation of browser live path (optional) — see `integration.md` Open Questions.
- When LLM key is available, should CI run a separate EC-005 kickoff job (non-blocking) vs fallback-only?

## Audit

| Field | Value |
| --- | --- |
| persona | `@qa.eng` |
| action | `test-unit`, `test-integration`, `qa` / `verify-flow`, `log-defects` |
| timestamp | `2026-10-13T13:05:00-03:00` |
| resolved_runtime | `crewai` |
| commands | `pytest backend/tests -q` → **18 passed**; see also `evals.md` |
| prompt_trace | Omitted — QA verification and artifact write; no LLM-authored product content |
