# BusinessFlow — Build Setup (Week 3 Foundation)

Persona: `@project.mgr` (`project-mgr`)  
Actions: `setup-project`, `install-dependencies`, `configure-env`, `document-setup`  
Artifact: `project-context/2.build/setup.md`

---

## 1. Purpose

Prepare a lean monorepo foundation so `@backend.eng` and `@frontend.eng` can implement the **Week 3 slice** only (SAD Implementation Guidance). No domain engine, API routes, CrewAI agent logic, or product UI were implemented in this setup pass.

---

## 2. Resolved runtime

| Field | Value |
| --- | --- |
| Resolved `AAMAD_TARGET_RUNTIME` | `crewai` |
| Resolution | Operator stack pin + `aamad.config.yml` `runtime.target: crewai` + adapter-registry default |
| Adapter rule | `.cursor/rules/adapter-crewai.mdc` |
| Operator stack decisions | FastAPI; React + Vite + TypeScript (**closes SAD-Q1**); PostgreSQL Compose default (**closes SAD-Q4**); CrewAI |

---

## 3. Pinned versions

| Component | Pin | Notes |
| --- | --- | --- |
| Python | **3.12.10** (`requires-python >=3.12,<3.14`) | Installed via winget on this workstation. CrewAI 1.15.x requires `>=3.10,<3.14`. Do not use system Python 3.8 or 3.14 for this project. |
| Node.js | **22.14.0** | Already on PATH (npm 10.9.2) |
| FastAPI | **0.143.0** | Backend API framework |
| Uvicorn | **0.54.0** | ASGI server (`uvicorn[standard]`) |
| SQLAlchemy | **2.0.44** | ORM / DB access (engine implementation deferred) |
| psycopg | **3.3.6** | Postgres driver (`psycopg[binary]`) |
| Pydantic | **2.12.5** | Constrained by CrewAI (`>=2.11.9,<2.13`) |
| pydantic-settings | **2.15.0** | Settings loader |
| python-dotenv | **1.2.4** | Env loading |
| CrewAI | **1.15.27** | Advisory runtime (YAML + `crew.py` stubs only) |
| React | **19.3.0** | Frontend UI library |
| React DOM | **19.3.0** | |
| Vite | **6.4.4** | Bundler / dev server (create-vite@6 react-ts template) |
| TypeScript | **5.8.3** | Frontend type checking |
| @vitejs/plugin-react | **4.7.0** | Vite React plugin |
| PostgreSQL (Compose image) | **16.10-alpine** | Compose service `db` only |

Supporting pins (dev): `pytest==8.4.2`, `httpx==0.28.1`, `ruff==0.14.0`.

---

## 4. Folder structure (Week 3–oriented monorepo)

```
.
├── aamad.config.yml              # Project prefs; libraries approved for pinned stack
├── aamad.config.example.yml
├── .env.example                  # Variable NAMES only
├── docker-compose.yml            # Postgres service (db)
├── .venv/                        # Python 3.12 virtualenv (gitignored)
├── backend/
│   ├── requirements.txt          # Pinned Python deps
│   ├── pyproject.toml
│   ├── crew.py                   # Entrypoint stub (no kickoff logic)
│   ├── config/
│   │   ├── agents.yaml           # Header stub only
│   │   └── tasks.yaml            # Header stub only
│   ├── app/                      # Empty package dir for @backend.eng
│   └── README.md
├── frontend/                     # Vite + React + TypeScript skeleton
│   ├── package.json              # Exact pins for react/vite/typescript
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── src/                      # Default entry; no Week 3 product UI
└── project-context/
    ├── 1.define/                 # prd.md, sad.md (inputs)
    ├── 2.build/
    │   ├── setup.md              # This file
    │   └── logs/                 # Reserved for CrewAI / Prompt Trace (adapter-crewai)
    └── 3.deliver/
```

---

## 5. Config created

| File | Action |
| --- | --- |
| `aamad.config.yml` | Copied from example; set `runtime.target: crewai`, `language.secondary: [typescript]`, `libraries.approved` to FastAPI / React / Vite / TypeScript / PostgreSQL / CrewAI (+ supporting libs) |
| `.env.example` | Env **names** for DB, LLM, auth, currency, runtime, CORS, Vite API base, CrewAI storage, copilot timeout |
| `docker-compose.yml` | Single `db` service; credentials via local `.env` (`env_file`), not hardcoded secrets |
| `backend/config/agents.yaml`, `tasks.yaml`, `crew.py` | Adapter-required names; stubs only |

---

## 6. How to install dependencies

### Backend (Python 3.12)

```powershell
# From repo root — use Python 3.12 only
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Verified on this workstation: FastAPI 0.143.0, CrewAI 1.15.27, and companion pins import successfully under Python 3.12.10.

### Frontend (Node 22)

```powershell
cd frontend
npm install
```

Verified: `react@19.3.0`, `vite@6.4.4`, `typescript@5.8.3`, `@vitejs/plugin-react@4.7.0`.

### Local env file

```powershell
# From repo root — fill values locally; never commit .env
Copy-Item .env.example .env
```

---

## 7. How to run Postgres via Compose

**Prerequisite:** Docker Desktop (or Docker Engine + Compose plugin) must be installed and running. **Not detected on this workstation** during setup — see Open Questions / Blockers.

```powershell
# After .env has POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB set
docker compose up -d db
docker compose ps
# Health: pg_isready inside the container (Compose healthcheck configured)
```

Example `DATABASE_URL` shape (values only in local `.env`):

`postgresql+psycopg://<POSTGRES_USER>:<POSTGRES_PASSWORD>@127.0.0.1:<POSTGRES_PORT>/<POSTGRES_DB>`

Stop:

```powershell
docker compose down
```

Note: Compose currently defines **db only**. Full `web` + `api` + `db` stack is for `@devops.eng` in Deliver (SAD §5). Local Week 3 API/UI run via uvicorn + Vite after implementation agents add code.

---

## 8. Environment variable names (`.env.example`)

Names only — no secret values in this artifact (NFR-S1, aamad-core).

| Name | Purpose |
| --- | --- |
| `AAMAD_TARGET_RUNTIME` | Adapter selection; `crewai` |
| `CURRENCY_CODE` | `USD` or `BRL` (ADR-14) |
| `POSTGRES_USER` | Compose Postgres user |
| `POSTGRES_PASSWORD` | Compose Postgres password |
| `POSTGRES_DB` | Compose database name |
| `POSTGRES_PORT` | Host port (default 5432) |
| `DATABASE_URL` | API connection string |
| `SECRET_KEY` | Session / token signing |
| `AUTH_USERNAME` | Optional single-owner bootstrap |
| `AUTH_PASSWORD` | Optional single-owner bootstrap |
| `OPENAI_API_KEY` | LLM provider key |
| `OPENAI_API_BASE` | Optional org gateway URL |
| `LLM_MODEL` | Optional model pin for CrewAI |
| `API_HOST` / `API_PORT` | Local API bind |
| `CORS_ORIGINS` | Allowed frontend origins |
| `VITE_API_BASE_URL` | Frontend → API base |
| `CREWAI_STORAGE_DIR` | Project-scoped CrewAI storage path (memory=false for MVP) |
| `COPILOT_TIMEOUT_SECONDS` | Wall-clock cap (SAD default 60; SAD-Q2) |

---

## 9. Week 3 slice boundary vs deferred P0

### In scope for next Build agents (Week 3)

1. One raw material  
2. One recipe with explicit yield  
3. Engine JSON for that recipe: unit cost, line contributions, recommended price, zero-cost case (numeric `0`, UI label **“n/a / zero cost”**)  
4. `POST /copilot/chat` with `context.screen="recipe"` → `costing_analyst` only; `output_pydantic` fields `reply`, `citations`, `grounding_timestamp`, `agent`  
5. Frontend shows material, recipe yield, engine figures, and that copilot response  

### Explicitly deferred (not foundation, not this setup)

- Remaining P0 screens: inventory/alerts, suppliers, customers, purchases, full order state machine, dashboard, reports, CSV export, FR-AUTH product UI  
- Other specialists kickoffs (`inventory_analyst`, `order_analyst`, `insights_analyst`) beyond YAML stubs  
- Nested BOM, what-if, UoM conversion, FX, RBAC, connectors (P1/P2 / A20)  
- Compose `web`/`api` services and CI live deploy (Deliver / `@devops.eng`)  

---

## 10. Next steps for downstream agents

### `@backend.eng`

- Implement FastAPI app under `backend/app/` (health, materials, recipes, costing engine JSON, `POST /copilot/chat`).  
- Fill `config/agents.yaml` / `config/tasks.yaml` and `crew.py` kickoff factory: Week 3 path attaches **`costing_analyst` only** (ADR-15).  
- Persist to Postgres; apply DEC-01–DEC-03, DEC-16; yield in unit cost; no agent write tools.  
- Record details in `project-context/2.build/backend.md`.  

### `@frontend.eng`

- Replace skeleton `App` with Week 3 views: material, recipe + yield, engine figures (incl. zero-cost label), copilot panel for recipe screen.  
- Honor ADR-09 UI prefs (`system` theme, minimal, `prefer_modals: false`); English only; currency symbol from `CURRENCY_CODE`.  
- Call API via `VITE_API_BASE_URL`; typed client contracts for Week 3 only.  
- Record in `project-context/2.build/frontend.md`.  

### `@integration.eng`

- Wire FE ↔ BE for Week 3 contracts; CORS, auth header/session as designed by backend.  
- Confirm non-streaming copilot envelope end-to-end.  
- Record in `project-context/2.build/integration.md`.  

### `@qa.eng`

- After Week 3 implementation: unit/integration covering EC-001, EC-002, EC-004 (yield fixtures as applicable), EC-005, EC-016, EC-017.  
- Smoke: material → recipe → engine figures → recipe-screen copilot.  
- Record in `project-context/2.build/qa.md`; later `*run-evals` → `evals.md`.  

---

## Sources

| ID | Source |
| --- | --- |
| PRD | `project-context/1.define/prd.md` |
| SAD | `project-context/1.define/sad.md` (Week 3 Implementation Guidance; ADR-01–ADR-16; SAD-Q1/Q4) |
| Persona | `.cursor/agents/project-mgr.md` |
| Adapter | `.cursor/rules/adapter-crewai.mdc`, `.cursor/rules/adapter-registry.mdc` |
| Core | `.cursor/rules/aamad-core.mdc`, `.cursor/rules/development-workflow.mdc` |
| Config | `aamad.config.example.yml` → created `aamad.config.yml` |
| Operator | Stack pins: FastAPI, React+Vite+TS, PostgreSQL, CrewAI; Week 3 foundation only |

---

## Assumptions

| ID | Assumption | If false |
| --- | --- | --- |
| SU1 | Python **3.12.x** is the supported runtime for this repo (CrewAI rejects 3.14+) | Install a compatible Python and recreate `.venv` |
| SU2 | Vite **6.x** + React **19** satisfies SAD-Q1 (operator asked React+Vite+TS; SAD did not mandate Vite major) | Repin frontend toolchain in a follow-up setup |
| SU3 | Postgres **16** Alpine image is acceptable Compose default (closes SAD-Q4) | Change `docker-compose.yml` image tag and re-document |
| SU4 | Local Compose credentials live only in gitignored `.env`; empty names in `.env.example` are intentional | Operator supplies a secrets manager later |
| SU5 | `OPENAI_API_KEY` is the LLM env name for MVP; org gateway uses optional `OPENAI_API_BASE` | Rename in `.env.example` if org standard differs |
| SU6 | Default `CURRENCY_CODE` example value `USD` is non-secret config; production may choose `BRL` | Align with ADR-14 at deploy time |
| SU7 | Full `web`/`api` Compose services wait for Deliver | Add services earlier if operator requires containerized API/UI in Week 3 |

---

## Open Questions

| ID | Question | Blocks | Notes |
| --- | --- | --- | --- |
| SETUP-Q1 | Install Docker Desktop (or Engine + Compose) on this workstation? | Running Postgres via Compose | CLI `docker` / `docker compose` not found during setup |
| SAD-Q2 | Keep copilot hard timeout at 60 s? | EC-009 | Documented as `COPILOT_TIMEOUT_SECONDS`; confirm or replace |
| SAD-Q3 | Capstone LLM spend ceilings in USD and BRL? | EC-013 | Still operator-owned |
| SAD-Q5 | Simultaneous BRL+USD in one deployment? | FX epic | Out of P0; one active currency |
| SETUP-Q2 | Preferred LLM model string for `LLM_MODEL`? | Copilot quality/cost | Left unset in `.env.example` |

**Closed by this setup:** SAD-Q1 (React + Vite + TypeScript), SAD-Q4 (PostgreSQL Compose default).

---

## Audit

| Field | Value |
| --- | --- |
| Timestamp | 2026-10-13T12:00:00-03:00 |
| Persona id | `project-mgr` / `@project.mgr` |
| Action | `setup-project` (includes `install-dependencies`, `configure-env`, `document-setup`) |
| Resolved `AAMAD_TARGET_RUNTIME` | `crewai` |
| Runtime resolution | Operator pin + `aamad.config.yml` + adapter-registry; environment may still unset — resolved value recorded here |
| Prompt Trace | **Omitted** — setup is scaffolding/documentation only; no LLM kickoff or production-facing agent output was produced. Secrets were not requested or logged. |
| Tools | File create; `py -3.12` venv + pip install; `npm create vite@6` + `npm install`; winget install Python 3.12.10; version verification imports |
| Temperature / determinism | N/A (IDE setup; no generative kickoff) |
| Output path | `project-context/2.build/setup.md` |
| Handoff | `@backend.eng` / `@frontend.eng` for Week 3 implementation; then `@integration.eng` → `@qa.eng` |
