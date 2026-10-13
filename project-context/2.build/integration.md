# Nexo Custo — Integration (Week 3 + Sprint 4)

Persona: `@integration.eng` (`integration-eng`)  
Actions: `integrate-api`, `verify-messageflow`, `log-integration`  
Artifact: `project-context/2.build/integration.md`  
Resolved runtime: **`crewai`** (`AAMAD_TARGET_RUNTIME` unset → adapter-registry / config default)  
Copilot mode: **non-streaming** JSON (`POST /copilot/chat`)  
Integration pattern: **REST** (lesson Pattern 1); HITL: **FastAPI + React approval UI** (lesson Pattern 3)

---

## 1. Scope

| Item | Status |
| --- | --- |
| `createLiveApiClient(baseUrl)` via `fetch` | Done |
| Env-gated client: live when `VITE_API_BASE_URL` set | Done |
| Mock fallback when base URL unset or `VITE_USE_MOCK=true` | Done |
| Error envelope `{ error: { code, message, details? } }` | Done (`ApiClientError`) |
| Optional Bearer (`VITE_API_BEARER_TOKEN` ↔ backend `SECRET_KEY`) | Done |
| Materials / Recipes / Costing / Copilot | Done (Week 3) |
| Inventory + Orders list views | Done (Sprint 4) |
| HITL propose → approve/reject for writes | Done (Sprint 4) |
| External Open Food Facts lookup | Done (Sprint 4) |
| Week 4 bonus: Crew `planning` + agent `planning_config` artifacts on copilot JSON | Done (no SSE) |
| SSE / WebSockets / CrewAI Flows `@persist` / `@human_feedback` | Deferred |

---

## 2. What was wired

### Client (`frontend/src/api/client.ts`)

| Method | Path | Notes |
| --- | --- | --- |
| `getMaterials` / `getMaterial` | `GET /materials` | Seed material |
| `getRecipes` / `getRecipe` | `GET /recipes` | JSON `yield` → `Recipe.yield` |
| `getRecipeCosting` | `GET /recipes/{id}/costing` | Cost stack + DEC-16 labels |
| `postCopilotChat` | `POST /copilot/chat` | Recipe screen; non-streaming |
| `getInventory` | `GET /inventory` | On-hand list |
| `getOrders` | `GET /orders` | Order list |
| `createHitlProposal` | `POST /hitl/proposals` | Queue write for human |
| `listHitlProposals` | `GET /hitl/proposals?status=` | Pending queue |
| `approveHitlProposal` | `POST /hitl/proposals/{id}/approve` | Executes domain mutation |
| `rejectHitlProposal` | `POST /hitl/proposals/{id}/reject` | Feedback required; no mutation |
| `searchFoodProducts` | `GET /external/food-products?q=` | Open Food Facts via BE |

Switch logic unchanged:

1. `VITE_USE_MOCK=true` → mock  
2. Else non-empty `VITE_API_BASE_URL` → live  
3. Else mock  

UI nav: Materials, Recipes, Inventory, Orders. Demo writes use HITL only (direct `/inventory/adjustments` and `/orders/*/produce|ship` remain for API tests).

### HITL contract

| Action | Payload keys | On approve |
| --- | --- | --- |
| `inventory_adjust` | `item_type`, `sku`, `delta`, `reason` | Manual adjust (DEC-15) |
| `order_create` | `recipe_id`, `quantity`, optional `sell_price` | Create pending order |
| `order_produce` | `order_id` | pending → in_progress |
| `order_ship` | `order_id` | in_progress → completed |

Agents still have no mutation tools (DEC-11).

### External API

| Env name | Role |
| --- | --- |
| `OPEN_FOOD_FACTS_BASE_URL` | Default `https://world.openfoodfacts.org` |
| `EXTERNAL_HTTP_TIMEOUT_SECONDS` | Default `10` |

Backend wraps OFF with `httpx` (timeout + error envelope). FE Materials view searches; suggestions are advisory (no auto-write).

### Auth / CORS

Unchanged from Week 3: open-local without `SECRET_KEY`; optional Bearer; CORS default `http://localhost:5173`.

---

## 3. How to run FE + BE together

```powershell
# Terminal A — API (repo root)
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# Terminal B — UI
cd frontend
# VITE_API_BASE_URL=http://127.0.0.1:8000 in repo-root or frontend .env
npm run dev
# → http://localhost:5173
```

Demo path: Recipes (costing/copilot) → Inventory (propose adjust → Approve) → Orders (propose create → produce → ship via HITL) → Materials (Open Food Facts search).

---

## 4. Verification results (`*verify-messageflow`)

### Week 3 (retained)

Method: FastAPI `TestClient`; timestamp ~`2026-10-13T13:05:00-03:00`.

| Step | Result |
| --- | --- |
| `GET /health`, materials, recipes, costing, copilot | Pass |
| Error envelope for unimplemented copilot screen | Pass |

### Sprint 4

Method: `pytest backend/tests` + `npm run build`. Timestamp: `2026-10-13T15:40:00-03:00` (approx).

| Step | Result | Evidence |
| --- | --- | --- |
| HITL adjust propose → approve | **Pass** | `test_hitl.py` — stock unchanged until approve |
| HITL reject + feedback | **Pass** | Whitespace/empty feedback rejected; no mutation |
| HITL order create → produce → ship | **Pass** | Full three-state via approvals |
| Open Food Facts service (mocked HTTP) | **Pass** | `test_external_food.py` |
| `GET /external/food-products` (monkeypatched) | **Pass** | 200 + 504 timeout mapping |
| Full backend suite | **Pass** | 33 tests |
| Frontend `npm run build` | **Pass** | `tsc -b && vite build` |

---

## 5. Caveats / blockers

| Item | Severity | Notes |
| --- | --- | --- |
| No `OPENAI_API_KEY` | Info | Copilot grounded fallback still OK |
| HITL store in-process | Caveat | Lost on API restart; fine for MVP demo |
| Open Food Facts network | Caveat | Live lookup needs outbound HTTPS; tests mock HTTP |
| `VITE_API_BEARER_TOKEN` in Vite | Caveat | Local MVP only |
| Postgres / SSE / webhooks | Deferred | Out of Sprint 4 scope |

**Blockers for Sprint 4 integrate-api:** none.

---

## Sources

- Capstone Sprint 4 lessons: Full-Stack Integration (REST), HITL FastAPI+React, External APIs (REST tools)
- `project-context/1.define/prd.md` / `sad.md` (HITL on writes; DEC-11 agent boundary)
- Code: `backend/app/api/hitl.py`, `backend/app/api/external.py`, `frontend/src/components/HitlPanel.tsx`, `InventoryView.tsx`, `OrdersView.tsx`, `MaterialView.tsx`, `frontend/src/api/client.ts`

## Assumptions

- Domain HITL queue (not CrewAI console `human_input`) is the Capstone-appropriate Pattern 3 adaptation for a web UI.
- Open Food Facts satisfies “at least one external data/API integration” without violating ADR-14 (no FX) or agent write bans.
- Direct mutation endpoints remain for engine tests; UI demo path is HITL-only.

## Open Questions

- Should currency display prefer `GET /health` over `VITE_CURRENCY_CODE`?
- Persist HITL proposals when Postgres lands?
- Production auth: replace Bearer-via-Vite before Deliver?

## Audit

| Field | Value |
| --- | --- |
| persona | `@integration.eng` |
| action | `integrate-api` (+ `verify-messageflow`, `log-integration`) — Sprint 4 |
| timestamp | `2026-10-13T15:45:00-03:00` |
| resolved_runtime | `crewai` (non-streaming copilot) |
| prompt_trace | Omitted — integration wiring and pytest/build verification; no LLM artifact generation |
