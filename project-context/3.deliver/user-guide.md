# BusinessFlow — User Guide (Week 3 MVP)

Persona: `@devops.eng` (`devops-eng`)  
Action: `document-user-guide`  
Artifact: `project-context/3.deliver/user-guide.md`  
Resolved runtime: **`crewai`**

---

### 1. Product Overview

BusinessFlow helps small makers understand **material cost**, **recipe yield**, and **recommended sell price** from deterministic engine formulas, then ask a **recipe-screen copilot** for grounded explanations. Numbers come from the costing engine; the Week 3 agent (`costing_analyst`) narrates but does not change inventory, prices, or recipes.

**Who it is for:** Capstone / demo users and instructors exercising the Week 3 maker loop on a **local machine**.

**MVP limitations / known gaps:**

- Localhost demo only — not production hosting or production AuthN
- No produce/ship inventory transitions (EC-004 deferred)
- No Dashboard, Inventory, or Orders product screens (nav shows Future Work stubs)
- Copilot works without an LLM key via a grounded fallback; live CrewAI needs `OPENAI_API_KEY`
- In-memory data: creating materials/recipes via API does not persist across API restarts

---

### 2. Prerequisites

| Item | Requirement |
| --- | --- |
| OS | Windows 10/11 (PowerShell) or equivalent with Python/Node |
| Python | **3.12.x** (not 3.14+); project uses `.venv` |
| Node.js | **22.x** with npm |
| Browser | Current Chrome, Edge, or Firefox |
| Docker | Optional — Compose stack; may be missing on some workstations |
| Env file | Copy `.env.example` → `.env` (never commit `.env`) |

**Env var names you may set** (values only in local `.env`):

- API: `API_HOST`, `API_PORT`, `CORS_ORIGINS`, `CURRENCY_CODE`, `OPENAI_API_KEY`, `LLM_MODEL`, `COPILOT_TIMEOUT_SECONDS`, `SECRET_KEY` (optional)
- UI: `VITE_API_BASE_URL`, `VITE_CURRENCY_CODE`, `VITE_USE_MOCK`, `VITE_API_BEARER_TOKEN` (local MVP only if `SECRET_KEY` is set — **not** production login)

---

### 3. Installation

#### 3.1 One-time setup

```powershell
# Repo root
Copy-Item .env.example .env
# Recommended Week 3 defaults in .env:
#   API_HOST=127.0.0.1
#   API_PORT=8000
#   CORS_ORIGINS=http://localhost:5173
#   VITE_API_BASE_URL=http://127.0.0.1:8000
#   VITE_CURRENCY_CODE=USD
# Leave SECRET_KEY empty for open local demo on loopback only.

py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

cd frontend
npm install
cd ..
```

Optional: also put `VITE_API_BASE_URL=http://127.0.0.1:8000` in `frontend/.env` if Vite does not load the repo-root `.env`.

#### 3.2 Start the app (primary path)

```powershell
# Terminal A — API (loopback)
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# Terminal B — UI
cd frontend
npm run dev
# Open http://localhost:5173 — banner should show live API when VITE_API_BASE_URL is set
```

#### 3.3 Verify health / smoke

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
# Expect runtime=crewai, storage=memory (typical Week 3)

.\.venv\Scripts\python.exe -m pytest backend\tests -q
# Expect 18 passed
```

Optional Compose (if Docker is installed): see `project-context/3.deliver/deploy.md` — UI on `http://127.0.0.1:8080`, API on `http://127.0.0.1:8000`.

---

### 4. Getting Started (Week 3 path)

Primary demo path: **material → recipe → costing → copilot**.

1. Open the UI at `http://localhost:5173` with the API running.
2. Confirm the banner indicates **live API** (not mock). If you see mock data, set `VITE_API_BASE_URL` and restart Vite.
3. Open **Material** — seed flour (`mat-flour-001`): name, UoM (kg), list/last price.
4. Open **Recipe** — seed bread (`rcp-bread-001`) with explicit **yield** (10).
5. Review the **cost stack**: unit cost, line contribution %, recommended sell price from the engine.
6. Optional: use the zero-cost **demo toggle** on the recipe screen to see the **“n/a / zero cost”** label (fixture path; live seed has no zero-cost recipe until you create one via API).
7. In the **Copilot** panel on the recipe screen, ask a costing question (for example, unit cost or recommended price).
8. Expect a response with `reply`, grounded citations (engine JSON), a grounding timestamp, and `agent` = `costing_analyst`.

Without `OPENAI_API_KEY`, replies use a deterministic grounded fallback — still valid for Week 3 demos.

---

### 5. Everyday Use

| Task | Expected outcome |
| --- | --- |
| Browse seed material | Flour / kg and prices from API |
| Browse seed recipe | Yield and lines; UoM must match material |
| Read costing figures | `unit_cost`, contributions, `recommended_sell_price` match engine |
| Ask recipe copilot | Four-field envelope; numbers agree with citations |
| Unsupported screens | Inventory/Orders/Dashboard nav stubs disabled; API returns `screen_not_implemented` for those copilot screens |
| Currency display | `$` (USD) or `R$` (BRL) from `VITE_CURRENCY_CODE` / `CURRENCY_CODE` — one currency per deployment |

**Interpreting agent responses:** Treat citation numbers as authoritative. If the reply tone differs from the numbers, trust the citations / cost stack. Agents cannot write stock or prices in Week 3.

**Common errors:**

| Symptom | Meaning |
| --- | --- |
| `uom_mismatch` | Recipe line UoM ≠ material UoM; no silent conversion |
| `screen_not_implemented` | Copilot screen not wired (only `recipe` in Week 3) |
| Banner shows mock | `VITE_API_BASE_URL` unset or `VITE_USE_MOCK=true` |
| Copilot slow / timeout | Wall-clock capped by `COPILOT_TIMEOUT_SECONDS` (default 60) |

---

### 6. Troubleshooting

| Problem | What to try |
| --- | --- |
| API won’t start | Confirm Python 3.12 venv; `pip install -r backend\requirements.txt` |
| UI can’t reach API | API on `127.0.0.1:8000`; CORS includes `http://localhost:5173`; restart both |
| 401 / auth errors | If `SECRET_KEY` is set, mirror it in `VITE_API_BEARER_TOKEN` for local MVP only — or clear both for open_local loopback |
| Docker compose fails | Docker may be missing — use native uvicorn + Vite (deploy.md) |
| Empty data after restart | Expected for in-memory store; seed reloads |
| LLM “not working” | Unset key → fallback is intentional; set `OPENAI_API_KEY` for live kickoff |

**Logs:** API console (uvicorn); eval/QA summaries under `project-context/2.build/logs`. Do not paste secrets into logs or chat.

---

### 7. Deployment Notes (operators)

- Full runbook, env matrix, access control, rollback, and monitoring: **`project-context/3.deliver/deploy.md`**
- Hosting for this release is **localhost/loopback only**
- CI: `.github/workflows/ci.yml` — lint, test, build only (no live deploy)
- **Rollback (high level):** revert to last good git SHA; restart API/UI; for Compose, `docker compose down` then rebuild known-good images
- Accepted Week 3 security risks (localhost only): open local mutating APIs without `SECRET_KEY` (SEC-H1); Bearer token via Vite env (SEC-H2) — **not** production AuthN

---

## Sources

- `project-context/1.define/prd.md`
- `project-context/2.build/setup.md`, `integration.md`, `frontend.md`, `backend.md`, `qa.md`, `security.md`
- `project-context/3.deliver/deploy.md`
- `.env.example`, `.cursor/templates/user-guide-template.md`

## Assumptions

- Operator runs the Week 3 slice on loopback with Docker optional.
- Seed IDs `mat-flour-001` / `rcp-bread-001` remain the demo fixtures.
- User guide does not invent produce/ship or FR-AUTH flows.

## Open Questions

- Preferred screenshot set for instructor handouts?
- Should the user guide document API `POST` create examples for custom materials/recipes beyond the seed?

## Audit

| Field | Value |
| --- | --- |
| persona_id | `@devops.eng` / `devops-eng` |
| action | `document-user-guide` |
| timestamp | `2026-10-13T13:20:00-03:00` |
| resolved_runtime | `crewai` |
| prompt_trace | Omitted — documentation from artifacts; no secrets |
