# BusinessFlow — Deploy Runbook (Week 3 MVP Slice)

Persona: `@devops.eng` (`devops-eng`)  
Actions: `prepare-release`, `define-deploy`, `configure-cicd`, `document-deploy`  
Artifact: `project-context/3.deliver/deploy.md`  
Resolved runtime: **`crewai`** (`AAMAD_TARGET_RUNTIME` unset → adapter-registry / `aamad.config.yml` default)  
Release: **`0.3.0-week3`** (localhost packaging only)  
Deployment status: **Config + runbook only** — live cloud/shared deploy **not authorized**

---

## 1. Release readiness (`*prepare-release`)

### Gate check

| Gate | Source | Status |
| --- | --- | --- |
| QA MVP verification | `project-context/2.build/qa.md` | **Pass** — unit 10/10, integration 8/8, full `pytest backend/tests` **18 passed**; smoke path material → recipe → costing → recipe copilot |
| EC-004 | qa.md / evals.md | **Deferred / accepted Week 3 gap** — produce/ship inventory not in build; documented 404 evidence |
| Evals | `project-context/2.build/evals.md` | **Present** — EC-001/002/005/016/017 Pass; EC-004 Deferred; Production Monitoring Recommendations consumed below |
| Security | `project-context/2.build/security.md` | **CONDITIONAL — Deliver cleared for localhost-only packaging**; SEC-H1/H2 **operator-accepted** 2026-10-13 |
| Config | `aamad.config.yml` | `security.require_security_assessment: true` satisfied by security.md; `documentation.require_user_guide: true` → `user-guide.md` |

### Release scope (Week 3)

- In-memory FastAPI API + React/Vite UI + CrewAI `costing_analyst` (recipe screen)
- Costing engine (unit cost, contribution %, recommended price, UoM reject, zero-cost)
- Non-streaming `POST /copilot/chat` (grounded fallback without `OPENAI_API_KEY`)
- Compose: `db` + optional `api`/`web`; CI lint/test/build only

### Explicitly out of release

- Produce/ship (EC-004), inventory/orders/dashboard APIs, FR-AUTH product login
- Cloud/VM shared hosting, TLS beyond localhost, production AuthN
- Live deploy / promotion pipelines

---

## 2. Hosting constraints (Week 3 localhost)

| Rule | Detail |
| --- | --- |
| Bind | API and published Compose ports **must** use **127.0.0.1 / loopback** only |
| Audience | Developer laptop demo (SAD §5, ADR-08); instructors / local demo users |
| Forbidden | Presenting this package as production; exposing ports on `0.0.0.0` / LAN / tunnel without fail-closed auth |
| AuthN | `VITE_API_BEARER_TOKEN` is **not** production AuthN (SEC-H2). Open local without `SECRET_KEY` is **loopback demo only** (SEC-H1) |
| Health | `GET http://127.0.0.1:8000/health` |
| Primary run path | Native **uvicorn + Vite** (works without Docker) |
| Optional path | `docker compose` `api`/`web`/`db` when Docker Desktop is installed |

**Workstation note:** Setup recorded Docker CLI **not detected**. Prefer native run; Compose is scaffolding for when Docker is available.

---

## 3. How to run locally (primary — no Docker)

```powershell
# From repo root — one-time
Copy-Item .env.example .env
# Edit .env: set API_HOST=127.0.0.1, API_PORT=8000, CORS_ORIGINS=http://localhost:5173
# Optional: OPENAI_API_KEY for live CrewAI; leave SECRET_KEY empty for open_local (localhost only)
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend; npm install; cd ..

# Terminal A — API
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# Terminal B — UI (set VITE_API_BASE_URL=http://127.0.0.1:8000 in frontend/.env or root .env)
cd frontend
npm run dev
# → http://localhost:5173
```

Smoke:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```

---

## 4. Optional Compose stack (`*define-deploy`)

Artifacts:

| File | Role |
| --- | --- |
| `docker-compose.yml` | `db`, `api`, `web` — host ports bound to `127.0.0.1` |
| `backend/Dockerfile` | Python 3.12 + uvicorn |
| `frontend/Dockerfile` | Node build + nginx static |
| `frontend/nginx.conf` | SPA static serve |

```powershell
# Requires Docker Desktop / Engine + Compose
docker compose up -d --build api web
# Optional Postgres foundation (Week 3 API still uses memory repository):
docker compose up -d db

# UI (Compose web): http://127.0.0.1:8080
# API: http://127.0.0.1:8000/health
docker compose ps
docker compose down
```

Compose `web` build **omits** `VITE_API_BEARER_TOKEN` by design (SEC-H2).

---

## 5. Environment variable matrix (names only)

Values live only in local `.env` (gitignored). See `.env.example`.

| Name | Component | Required Week 3 | Notes |
| --- | --- | --- | --- |
| `AAMAD_TARGET_RUNTIME` | API | No (default `crewai`) | Recorded in Audit |
| `CURRENCY_CODE` | API | No (default `USD`) | `USD` or `BRL` (ADR-14) |
| `API_HOST` | API | Yes for native | Must be `127.0.0.1` for Week 3 |
| `API_PORT` | API | No (8000) | |
| `CORS_ORIGINS` | API | Yes for live FE | Include Vite `http://localhost:5173` and/or Compose web `http://127.0.0.1:8080` |
| `SECRET_KEY` | API | No for open_local | If set, Bearer required; localhost only until FR-AUTH |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | API | Unused Week 3 | FR-AUTH not implemented |
| `OPENAI_API_KEY` | API | No | Unset → grounded copilot fallback |
| `OPENAI_API_BASE` | API | No | Org gateway optional |
| `LLM_MODEL` | API | No | CrewAI model pin |
| `COPILOT_TIMEOUT_SECONDS` | API | No (60) | |
| `CREWAI_STORAGE_DIR` | API | No | memory=false MVP |
| `DATABASE_URL` | API | No Week 3 | Memory repo; Postgres later |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | Compose `db` | Only if starting `db` | |
| `VITE_API_BASE_URL` | FE | Yes for live UI | e.g. `http://127.0.0.1:8000` |
| `VITE_API_BEARER_TOKEN` | FE | Local-MVP only | Mirror `SECRET_KEY` if auth on; **not production AuthN** |
| `VITE_USE_MOCK` | FE | No | `true` forces fixtures |
| `VITE_CURRENCY_CODE` | FE | No | Display symbol |

---

## 6. Access control (policy)

| Surface | Week 3 policy |
| --- | --- |
| Mutating API (`POST /materials`, `/recipes`, `/copilot/chat`) | Unauthenticated when `SECRET_KEY` empty — **loopback only** (accepted SEC-H1) |
| Optional Bearer | When `SECRET_KEY` set; FE may send `VITE_API_BEARER_TOKEN` — **local MVP only** (accepted SEC-H2); never document as production AuthN |
| Secrets | Env var names only in repo; no secret values in artifacts, CI logs, or Prompt Trace |
| LLM keys | Operator-supplied `OPENAI_API_KEY` in local `.env` only |
| Least privilege | Agents `tools: []`; no inventory/price writes (DEC-11) |
| Enterprise IAM / SSO / network segmentation | **Future Work** |

---

## 7. CI/CD (`*configure-cicd`)

| Path | Stages |
| --- | --- |
| `.github/workflows/ci.yml` | **lint**, **test**, **build** only — no deploy/publish job |

| Job | Steps |
| --- | --- |
| Backend | `ruff check` → `pytest backend/tests` → `evals/run.py` |
| Frontend | `npm ci` → `npm run lint` → `npm run build` (no `VITE_API_BEARER_TOKEN`) |

Manual promotion: not applicable until operator authorizes a non-local target. Rollback below covers local packaging only.

**SEC-M6 note:** Re-run `pip-audit` (or org SCA) in CI when PyPI/OSV is reachable; advisory incomplete on assessment workstation.

---

## 8. Rollback (local)

| Scenario | Steps |
| --- | --- |
| Bad local code / UI | `git checkout` / revert to last known good SHA; restart uvicorn + Vite |
| Compose stack unhealthy | `docker compose down`; restore prior image tags or rebuild from known SHA; `docker compose up -d --build` |
| Bad env | Restore `.env` from operator backup; never commit secrets |
| Data | Week 3 API is **in-memory** — process restart loses runtime creates; seed reloads. Compose `db` volume `businessflow_pgdata` unused by Week 3 API — document local data-loss risk (SAD §5) |

---

## 9. Monitoring / observability (from evals.md)

Baseline for local demo and future production (placeholders until operator sets SLAs):

### Request-level trace fields

- `runtime` / adapter (`crewai`), `llm_model` or `fallback`, kickoff vs fallback
- Token counts when LLM used; stop reason / timeout
- Latency for `GET /recipes/{id}/costing` and `POST /copilot/chat`
- Copilot: `agent`, `grounding_timestamp`, citation `recipe_id`, tool-call count (expect 0 writes)
- `error.code` (`uom_mismatch`, `screen_not_implemented`, timeout, …)

### Dashboard metrics

- Costing API p50/p95 (SAD EC-006 target ≤ 500 ms local when measured)
- Copilot p50/p95 and timeout rate (EC-009 ≤ 60 s)
- Task success rate: 2xx copilot with complete four-field envelope
- Error rate by `error.code`
- Cost per copilot request (USD/BRL display per ADR-14; EC-013 ceilings TBD)

### Threshold alerts (placeholders)

- Copilot error rate > 5% over 15 minutes
- Copilot p95 crossing 60 s or timeout spike
- Costing API p95 crossing 500 ms on demo volume
- Cost per request > 150% of 7-day average once EC-013 ceilings exist

### Change attribution

- Tag releases with git SHA + `LLM_MODEL`
- Separate model/prompt drift from formula/data drift via citation vs engine recompute

### Business-KPI mapping

| Technical metric | Business signal |
| --- | --- |
| EC-001/002 pass on goldens | Trustworthy SKU unit cost and price |
| EC-005 disagreement count = 0 | Grounded copilot explanations |
| EC-016/017 fixture pass | No silent UoM conversion; honest zero-cost pricing |
| Copilot success rate | Usable on-demand costing Q&A |
| Latency p95 | Interactive recipe-screen feel |

Crew / eval logs: `project-context/2.build/logs` (redact secrets).

---

## 10. Future Work

- Fail-closed auth + FR-AUTH before any non-localhost hosting (expire SEC-H1/H2 acceptance)
- Replace Bearer-via-Vite with session cookie or BFF (SEC-H2)
- Postgres-backed repository + Compose `db` as primary storage
- Production TLS, backups, HA, multi-region, autoscaling, advanced APM (NFR-R4–R6)
- CI `pip-audit` / SCA gate when network allows (SEC-M6)
- Live deploy pipeline only after explicit operator authorization
- EC-004 produce/ship monitoring when inventory/orders land
- Strip `/health` recon fields for non-local (SEC-L2)

---

## Sources

- `project-context/1.define/prd.md`, `project-context/1.define/sad.md` (§5 DevOps & Deployment; ADR-08)
- `project-context/2.build/qa.md`, `evals.md`, `security.md`, `backend.md`, `frontend.md`, `integration.md`, `setup.md`
- `aamad.config.yml`, `.env.example`, `.cursor/rules/delivery-workflow.mdc`, `.cursor/rules/adapter-crewai.mdc`
- Deploy config: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `.github/workflows/ci.yml`

## Assumptions

- QA Pass + EC-004 deferred is an accepted Week 3 Deliver gap (operator intent via Week 3 slice scope).
- **Operator acceptance (2026-10-13):** **SEC-H1** (open_local mutating APIs without `SECRET_KEY`) and **SEC-H2** (`VITE_API_BEARER_TOKEN` in browser) are accepted **only for localhost/loopback Week 3 demo**. Expiry: before any non-localhost or shared hosting — require fail-closed auth and non-Vite session/token. Bearer-via-Vite must **not** be presented as production AuthN.
- Live cloud deploy remains unauthorized; this artifact is config + runbook only.
- Docker may be absent on the operator workstation; native uvicorn + Vite is the supported primary path.
- Week 3 storage remains in-memory; Compose `db` is foundation only until a Postgres repository lands.
- No secret values were written into this artifact or generated deploy configs.

## Open Questions

1. When will Docker Desktop be installed so Compose `api`/`web` can be verified on this workstation?
2. Preferred production AuthN after SEC-H1/H2 expiry: session cookie vs opaque token vs reverse-proxy auth?
3. Should `evals/run.py` remain a blocking CI step, or advisory-only?
4. Operator EC-013 USD/BRL LLM spend ceilings for production alerts?

## Audit

| Field | Value |
| --- | --- |
| persona_id | `@devops.eng` / `devops-eng` |
| action | `prepare-release`, `define-deploy`, `configure-cicd`, `document-deploy` |
| timestamp | `2026-10-13T13:20:00-03:00` |
| resolved_runtime | `crewai` (`AAMAD_TARGET_RUNTIME` unset → default; `aamad.config.yml` `runtime.target: crewai`) |
| release | `0.3.0-week3` |
| deployment_status | Config + runbook only; live deploy unauthorized |
| prompt_trace | Omitted — packaging/docs only; no LLM-authored product content; no secrets recorded |
| application_logic_modified | No |
