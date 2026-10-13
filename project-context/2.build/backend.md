# Nexo Custo — Backend

Persona: `@backend.eng` (`backend-eng`)  
Actions: `develop-be`, `define-agents`, `implement-endpoint`, `document-backend`  
Artifact: `project-context/2.build/backend.md`  
Resolved runtime: **`crewai`** (`AAMAD_TARGET_RUNTIME` unset → adapter-registry / `aamad.config.yml` default)

Scope: Week 3 materials/recipes/costing/recipe-copilot **plus** Module 2 P0 inventory balances, manual adjust (DEC-15 / ADR-11), and orders produce/ship (DEC-05 / ADR-16).

---

## 1. Architecture summary

Hybrid MVP backend:

| Layer | Role |
| --- | --- |
| **Domain engine** (`app/domain/engine.py`) | Costing formulas (DEC-01–DEC-03, DEC-16) and produce consumption helper (DEC-05 / ADR-16). |
| **Inventory service** (`app/services/inventory.py`) | Manual adjust (on-hand only), order create/produce/ship; never rewrites WA / list / last purchase / recipe unit cost. |
| **Repository** (`app/repository/`) | Protocol + **in-memory** implementation: materials, recipes, stock balances, adjustment audit, orders. Swappable later for Postgres via `DATABASE_URL`. |
| **FastAPI** (`app/main.py`, `app/api/`) | Materials, recipes + costing, inventory + adjustments, orders + produce/ship, health, `POST /copilot/chat`. |
| **CrewAI** (`config/agents.yaml`, `config/tasks.yaml`, `crew.py` / `app/crew_runtime.py`) | Screen `recipe` → `costing_analyst` only; sequential validate → narrate; `output_pydantic` = four-field envelope. |

Agents remain **read-only** (no inventory/order/price/recipe write tools). Numbers in copilot `citations` are engine JSON; the HTTP handler overwrites `citations` with the server-built snapshot after kickoff.

---

## 2. Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | none | Liveness; reports runtime, storage=`memory`, auth mode, LLM configured |
| `GET` | `/health/auth-check` | bearer if configured | Smoke for auth dependency |
| `GET` | `/materials` | optional bearer | List materials |
| `GET` | `/materials/{id}` | optional bearer | Get one material |
| `POST` | `/materials` | optional bearer | Create/upsert material |
| `GET` | `/recipes` | optional bearer | List recipes |
| `GET` | `/recipes/{id}` | optional bearer | Get one recipe |
| `GET` | `/recipes/{id}/costing` | optional bearer | Live costing snapshot (engine JSON) |
| `POST` | `/recipes` | optional bearer | Create recipe (UoM must match material; else `uom_mismatch`) |
| `GET` | `/inventory` | optional bearer | List RM + FG on-hand balances |
| `GET` | `/inventory/adjustments` | optional bearer | Manual-adjust audit log |
| `POST` | `/inventory/adjustments` | optional bearer | Manual adjust (reason required; on-hand only) |
| `GET` | `/orders` | optional bearer | List orders |
| `GET` | `/orders/{id}` | optional bearer | Get one order |
| `POST` | `/orders` | optional bearer | Create `pending` order (qty FG units; sell price defaults to recommended) |
| `POST` | `/orders/{id}/produce` | optional bearer | `pending` → `in_progress` (consume RM by yield formula; FG += qty) |
| `POST` | `/orders/{id}/ship` | optional bearer | `in_progress` → `completed` (decrement FG; write cost-at-sale) |
| `POST` | `/copilot/chat` | optional bearer | Recipe screen → `costing_analyst` |

Copilot screens `inventory`, `orders`, `dashboard` still return `400` with `screen_not_implemented` (YAML stubs only). Truly invalid screens are rejected by request validation / `unknown_screen` path.

Error envelope (domain and copilot):

```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```

Stock-block errors use `insufficient_stock` and name short SKUs in `details.short_skus` (DEC-06).

---

## 3. Schemas

### Material (create / out)

- `id?`, `name`, `uom`, `list_price` (≥ 0), `reorder_point`, `last_purchase_price?`

### Recipe (create / out)

- `id?`, `name`, `yield` (> 0), `target_margin` (`0 ≤ m < 1`), `finished_product_sku?`, `lines[]` with `material_id`, `quantity`, `uom`

### Inventory item (out)

- `item_type` (`RM` \| `FG`), `sku`, `name`, `uom`, `on_hand`, `reorder_point`, `unit_cost?` (RM: WA/list-last; FG: live recipe unit cost)

### Manual adjustment (create / out)

- Create: `item_type`, `sku`, `delta`, `reason` (required, non-empty after trim)
- Out: `id`, same fields, `resulting_on_hand`, `created_at`, `actor?`, `on_hand?`

### Order (create / out)

- Create: `recipe_id`, `quantity` (> 0 FG units), `sell_price?` (default = recommended)
- Out: `id`, `recipe_id`, `fg_sku`, `quantity`, `sell_price`, `status`, `cost_at_sale?`, `revenue?`, `created_at`, `completed_at?`

### Costing snapshot (engine JSON / citations)

- `recipe_id`, `recipe_name`, `finished_product_sku`, `yield`, `target_margin`
- `total_material_cost`, `unit_cost`, `recommended_sell_price`
- `recommended_price_label` — `"n/a / zero cost"` when unit cost is 0; else `null`
- `input_unit_cost_method` — `"weighted average of purchases"` or `"registered list/last price (no purchases)"`
- `lines[]` — `material_id`, `material_name`, `quantity`, `uom`, `input_unit_cost`, `line_cost`, `contribution_pct`, `input_unit_cost_method`
- `grounding_timestamp` — ISO-8601

### Copilot request / response

Unchanged Week 3 four-field envelope for `screen=recipe` → `costing_analyst`. Non-streaming. Wall-clock cap from `COPILOT_TIMEOUT_SECONDS` (default **60**).

---

## 4. Agent / task mapping

| `context.screen` | Agent | Tasks (sequential) | Status |
| --- | --- | --- | --- |
| `recipe` | `costing_analyst` | `validate_costing` → `explain_costing` | **Wired** |
| `inventory` | `inventory_analyst` | `explain_inventory` | YAML stub only |
| `orders` | `order_analyst` | `explain_orders` | YAML stub only |
| `dashboard` | `insights_analyst` | `explain_dashboard` | YAML stub only |

Controls (costing path):

- `Process.sequential` for the two steps of the same specialist only
- `memory=false`, `allow_delegation=false`
- `max_iter` ≤ **8** for `costing_analyst`
- `max_rpm` crew pin: **10** (`Settings.crew_max_rpm`)
- `max_execution_time` aligned to `COPILOT_TIMEOUT_SECONDS`
- Tools: empty list (snapshot injected into task description; DEC-11)

YAML paths: `backend/config/agents.yaml`, `backend/config/tasks.yaml`. Factory: `backend/crew.py` → `app/crew_runtime.py`.

### Copilot LLM vs fallback

| Condition | Behavior |
| --- | --- |
| `OPENAI_API_KEY` set | Real CrewAI kickoff; response normalized to four fields; `citations` forced to engine JSON |
| Key missing, timeout, or LLM failure | **Deterministic grounded fallback** — reply built from engine numbers; same four-field envelope |

---

## 5. Formulas (engine / inventory service)

| Rule | Formula / behavior | Trace |
| --- | --- | --- |
| Unit cost | `unit_cost = total_material_cost / yield` (`yield > 0`) | DEC-02, PA11 |
| Line cost | `quantity × current_input_unit_cost` (material COGS only) | DEC-02 |
| Input unit cost | Qty-weighted average of purchases if any; else list/last price | DEC-03 |
| Recommended price | `unit_cost / (1 − target_margin)` with `0 ≤ target_margin < 1`; reject ≥ 1 | DEC-01 |
| Zero cost | If `unit_cost == 0` → recommended price numeric **0**, label **n/a / zero cost** | DEC-16 |
| UoM | Line UoM must equal material UoM; else `uom_mismatch` | DEC-18 |
| Produce consume | `RM consumed = line_quantity × (order_quantity / yield)`; FG `+= order_quantity` | DEC-05, ADR-16 |
| Ship | FG `-= order_quantity`; write immutable `cost_at_sale` (= live unit cost), `revenue = qty × sell_price` | DEC-04, DEC-05 |
| Blocks | No negative RM on produce; no negative FG on ship; short SKUs in `details` | DEC-06 |
| Manual adjust | On-hand only; reason required; audit row; resulting on-hand ≥ 0; does **not** rewrite WA, last purchase price, purchase lots, list price, or recipe unit cost | DEC-15, ADR-11 |

Seeded smoke fixture:

- Material `mat-flour-001` Flour, `kg`, list price `2.0`, seed RM on-hand **100**
- Recipe `rcp-bread-001` Simple Bread, yield `10`, margin `0.4`, FG SKU `FG-BREAD-001`, line `5 kg` flour  
- → total `10`, unit cost `1.0`, recommended `1 / 0.6 ≈ 1.666…`, method list/last (no purchases)
- Produce order qty `5`: flour consume `5 × (5/10) = 2.5` kg; FG += 5

Manual-adjust shape: **delta** on current on-hand (not absolute set). Opening balances via adjust and/or seed (PA13).

---

## 6. How to run

Prerequisites: Python **3.12** venv from `setup.md` (`.\.venv`), deps from `backend/requirements.txt`. **Postgres/Docker not required**.

```powershell
# Install (from repo root)
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# Run API
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# Tests (engine + API smoke + inventory/orders)
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```

### Test coverage

| Test focus | Where | Trace |
| --- | --- | --- |
| `unit_cost = total / yield` when **yield ≠ 1** | `test_unit_cost_when_yield_not_one` | DEC-02 |
| Zero cost → price `0`, label **n/a / zero cost** | `test_zero_cost_recommended_price_and_label` | DEC-16 / EC-017 |
| Line contribution % (multi-line golden) | `test_line_contribution_pct_ec001` | EC-001 |
| Margin formula, UoM reject, seed golden, weighted avg helper | `test_engine.py` | DEC-01, DEC-03, DEC-18 |
| Materials/recipe costing + copilot fallback envelope | `test_api_smoke.py` | ADR-15 |
| Produce yield≠1 + ship; SAD line-2kg fixture; short RM block | `test_inventory_orders.py` | EC-004 / ADR-16 / DEC-06 |
| Adjust reason/audit/no-negative; WA/list/last unchanged | `test_inventory_orders.py` | EC-018 / ADR-11 / DEC-15 |

Optional env (names only; copy `.env.example` → `.env` locally):

| Name | Use |
| --- | --- |
| `SECRET_KEY` | If set → require `Authorization: Bearer <SECRET_KEY>`; if unset → **open local** mode |
| `OPENAI_API_KEY` | Enables real CrewAI kickoff; else grounded fallback |
| `LLM_MODEL` | Default `gpt-4o-mini` |
| `COPILOT_TIMEOUT_SECONDS` | Default `60` |
| `CORS_ORIGINS` | Default `http://localhost:5173` |
| `CURRENCY_CODE` | `USD` / `BRL` (display later; not used in formulas) |
| `DATABASE_URL` | Reserved for Postgres swap; unused in memory repo |

Example produce path:

```powershell
# Adjust opening RM (optional; seed already has 100 kg flour)
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/inventory/adjustments -ContentType 'application/json' -Body '{"item_type":"RM","sku":"mat-flour-001","delta":10,"reason":"Opening balance"}'

# Create order → produce → ship
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/orders -ContentType 'application/json' -Body '{"recipe_id":"rcp-bread-001","quantity":5}'
```

---

## 7. Gaps (explicit)

- **Postgres / Docker deferred** — in-memory repository remains active. Interface (`Repository` protocol) is ready for SQLAlchemy + `DATABASE_URL`.
- **FR-AUTH product login** — temporary open local mode when `SECRET_KEY` unset; thin Bearer check when set. No session UI / owner bootstrap flow yet.
- **Purchases API (FR-PUR)** — engine supports purchase lots for WA; no HTTP purchase endpoint yet (lots injectable in tests/repo only).
- **Order cancel** — FR-ORD cancel-from-`pending` not exposed yet (P0 remaining).
- **Alerts / suggested reorder** — `/alerts` and DEC-19 advisory qty deferred.
- **Suppliers, customers, dashboard, CSV, finished-product master CRUD** — not implemented.
- **Other specialist kickoffs** — YAML stubs only; non-recipe copilot screens return clear errors.
- **CrewAI Prompt Trace persistence** — directory `project-context/2.build/logs` reserved; full trace file writes deferred.
- **LLM dependency** — without `OPENAI_API_KEY`, copilot uses deterministic fallback (documented Assumption below).
- **Frontend** — unchanged in this Module 2 pass (domain/API only).

---

## 8. Storage design (swap path)

```
Repository (Protocol)
  ├── InMemoryRepository   ← active (seeded materials/recipes/stock/orders)
  └── (future) PostgresRepository via DATABASE_URL + SQLAlchemy
```

Formulas stay in `app/domain/engine.py` / `app/services/inventory.py` and never depend on storage. Costing and inventory transitions load state through the protocol.

---

## Sources

- `project-context/1.define/prd.md` (DEC-01–DEC-06, DEC-11, DEC-15–DEC-18, FR-MAT, FR-RCP, FR-CST, FR-PRC, FR-INV, FR-ORD, FR-AGT)
- `project-context/1.define/sad.md` (ADR-11, ADR-15, ADR-16, §4 API table, Produce formula, Manual adjustment, EC-004, EC-018)
- `project-context/2.build/setup.md`
- `.cursor/rules/adapter-crewai.mdc`, `.cursor/rules/aamad-core.mdc`, `.cursor/rules/adapter-registry.mdc`
- `aamad.config.yml` (`runtime.target: crewai`)
- `.env.example` (variable names only)

## Assumptions

- `AAMAD_TARGET_RUNTIME` unset resolves to **`crewai`** (registry default + config).
- In-memory storage is acceptable for local Module 2 until Docker + `.env` Postgres credentials exist.
- Open local auth when `SECRET_KEY` is empty is acceptable for local development; production must set the secret (Gap: FR-AUTH).
- When `OPENAI_API_KEY` is missing, the grounded fallback satisfies the four-field envelope and citation contract for local smoke; it is not a substitute for EC-005 LLM grounding evals in QA.
- Seed data (flour + bread recipe + 100 kg RM on-hand + FG SKU row at 0) is the default demo path.
- Manual adjust uses **delta** semantics (SAD allows delta or absolute; backend.md locks delta).
- Crew `max_rpm=10` is an implementation budget pin, not a product KPI.

## Open Questions

- Confirm preferred Bearer secret name for integration (`SECRET_KEY` vs a dedicated `AUTH_BEARER_TOKEN`) before hardening FR-AUTH.
- When Postgres becomes available, should seed migration create the same `mat-flour-001` / `rcp-bread-001` / `FG-BREAD-001` IDs for frontend continuity?
- SAD-Q2: keep `COPILOT_TIMEOUT_SECONDS=60` or operator override for demo hardware?
- Should order cancel-from-`pending` land in the next inventory slice or with customers/orders UI?

## Audit

| Field | Value |
| --- | --- |
| persona | `@backend.eng` / `backend-eng` |
| action | `develop-be` (+ `implement-endpoint`, `document-backend`) — Module 2 inventory/orders |
| timestamp | `2026-10-13T16:32:17.563064+00:00` |
| resolved_runtime | `crewai` |
| runtime_resolution | `AAMAD_TARGET_RUNTIME` unset → default `crewai`; `aamad.config.yml` `runtime.target: crewai` |
| verification | `pytest backend/tests` — **25 passed** (Week 3 suite green + EC-004 produce/ship + EC-018 adjust); no Postgres / LLM key required |
| prompt_trace | Omitted; agents still read-only with no inventory write tools; secrets not logged |
| module2_scope | Stock balances RM/FG; `POST /inventory/adjustments` (ADR-11); orders produce/ship (ADR-16); `GET /inventory`; CrewAI Week 3 path intact |
