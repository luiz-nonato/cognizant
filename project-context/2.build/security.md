# BusinessFlow — Security Assessment (Week 3 MVP Slice)

Persona: `@security.eng` (`security-eng`)  
Actions: `assess-security`, `scan-secrets`, `review-deps`, `document-security`  
Artifact: `project-context/2.build/security.md`  
Resolved runtime: **`crewai`** (`AAMAD_TARGET_RUNTIME` unset → default `crewai` per adapter-registry; `aamad.config.yml` `runtime.target: crewai`)  
Config: `aamad.config.yml` — `security.require_security_assessment: true`, `forbid_committed_secrets: true`, `dependency_audit: true`

---

## 1. Executive summary / gate recommendation

**Gate status: CONDITIONAL — Deliver cleared for localhost-only packaging**

Week 3 local MVP security posture is acceptable for **localhost-only** demo (default `API_HOST=127.0.0.1`, in-memory store, optional Bearer). It does **not** meet production AuthN against NFR-S2 / FR-AUTH.

| Metric | Result |
| --- | --- |
| Critical findings | **0** |
| High findings | **2** — **operator-accepted** as localhost-only (SEC-H1, SEC-H2; see Assumptions) |
| Committed secrets (NFR-S1) | **Pass** — none found; `.env` gitignored; `.env.example` names only |
| Agent write boundary (NFR-S3 / DEC-11) | **Pass** for Week 3 — `tools: []`, citations overwritten with engine JSON |
| Dependency audit (NFR-S6) | **Partial** — npm clean; pip advisory incomplete (network) |

**Handoff:** Operator accepted SEC-H1/H2 as localhost-only Week 3 risks (2026-10-13). `@devops.eng` may draft deploy/runbook with those constraints (loopback bind; no production Bearer-via-Vite). Remaining Medium items proceed in parallel via owning personas.

---

## 2. Prerequisites confirmed

| Input | Present |
| --- | --- |
| `project-context/2.build/qa.md` | Yes |
| `project-context/2.build/evals.md` | Yes (preferred) |
| `project-context/2.build/backend.md` | Yes |
| `project-context/2.build/frontend.md` | Yes |
| `project-context/2.build/integration.md` | Yes |
| `project-context/2.build/setup.md` | Yes |
| `project-context/1.define/prd.md` | Yes |
| `project-context/1.define/sad.md` (§8 Security; NFR-S1–S8) | Yes |
| `aamad.config.yml` | Yes |

No application or agent business logic was modified in this assessment.

---

## 3. Severity-ranked findings

### Critical

_None._

### High

#### SEC-H1 — Open local mode leaves mutating APIs unauthenticated (NFR-S2, FR-AUTH, DEC-09)

- **Evidence:** `backend/app/auth.py` (`require_auth_if_configured`), `backend/app/settings.py` (`auth_enabled` only when `SECRET_KEY` non-empty). Routers `materials`, `recipes`, `copilot` depend on that guard (`backend/app/api/materials.py`, `recipes.py`, `copilot.py`). When unset, `POST /materials`, `POST /recipes`, `POST /copilot/chat` succeed without credentials (QA/integration ran `auth_mode=open_local`).
- **Risk:** Any non-localhost bind or tunnel exposes create/mutate and LLM-backed chat without AuthN.
- **Mitigation:** Require `SECRET_KEY` (or fail closed) outside explicit local profile; implement FR-AUTH session/login before Deliver; bind API to loopback until auth enabled.
- **Owner:** `@backend.eng` (auth fail-closed + Bearer); `@product.mgr` / `@frontend.eng` (FR-AUTH UX); `@devops.eng` (deploy env matrix — after acceptance).
- **Trace:** NFR-S2, FR-AUTH, DEC-09, SAD §8 AuthN.

#### SEC-H2 — Shared secret in Vite client env (`VITE_API_BEARER_TOKEN`)

- **Evidence:** `frontend/src/api/client.ts` (`resolveBearerToken` → `import.meta.env.VITE_API_BEARER_TOKEN`); `.env.example` documents mirroring `SECRET_KEY`; `integration.md` notes browser-visible caveat.
- **Risk:** Any production or shared build embeds the Bearer secret in the JS bundle; equivalent to public credential.
- **Mitigation:** Do not ship Bearer-via-Vite beyond local MVP. Prefer httpOnly session cookie or BFF pattern; never put long-lived server secrets in `VITE_*`.
- **Owner:** `@frontend.eng` + `@integration.eng` (client contract); `@backend.eng` (session/token design).
- **Trace:** NFR-S2, DEC-09, SAD §8 AuthN / Secrets.

### Medium

#### SEC-M1 — Free-text copilot message injected into Crew prompts with length limit only (NFR-S4, R8)

- **Evidence:** `CopilotChatRequest.message` max 4000 chars (`backend/app/schemas/copilot.py`, `MessageLimit`); `crew_runtime.py` formats `{user_message}` into task descriptions; no sanitize/strip of instruction-like content. Order/customer notes not in Week 3 surface yet; copilot free-text is the active injection vector.
- **Risk:** Prompt injection can steer narration tone/content; write path still blocked by empty tools + citation overwrite, but policy/UX abuse remains.
- **Mitigation:** Treat user text as untrusted data (delimiters, strip control patterns, optional lower max length); keep “notes are data” when ORD/CUS notes land; retain tools=[] and citations overwrite.
- **Owner:** `@backend.eng` (sanitize/truncation); `@qa.eng` (EC-011 fixtures when notes exist).
- **Trace:** NFR-S4, R8, SAD §4 Validation / §8 Prompt injection.

#### SEC-M2 — Bearer compare is not constant-time

- **Evidence:** `backend/app/auth.py` uses `token != expected`.
- **Risk:** Theoretical timing side-channel on local shared secret.
- **Mitigation:** Use `hmac.compare_digest` (or equivalent) on UTF-8 bytes.
- **Owner:** `@backend.eng`.

#### SEC-M3 — CORS allows credentials with broad methods/headers

- **Evidence:** `backend/app/main.py` — `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`; origins from `CORS_ORIGINS` (default `http://localhost:5173`).
- **Risk:** Acceptable for local Vite; risky if origins widen to `*` or untrusted hosts with credentials.
- **Mitigation:** Keep explicit origin allow-list; tighten methods/headers to those used; never combine `*` origins with credentials.
- **Owner:** `@backend.eng` / `@integration.eng`.

#### SEC-M4 — Validation error envelope may leak request schema internals

- **Evidence:** `main.py` validation handler returns `exc.errors()` under `error.details`.
- **Risk:** Field paths/types aid attackers probing API shape (low impact locally).
- **Mitigation:** Return stable validation codes; log full pydantic errors server-side only.
- **Owner:** `@backend.eng`.

#### SEC-M5 — Safe 500 handler defined but not registered

- **Evidence:** `backend/app/api/errors.py` defines `unhandled_exception_handler`; `create_app()` does not `add_exception_handler(Exception, ...)`.
- **Risk:** Framework default may expose stack traces depending on run mode.
- **Mitigation:** Register the generic handler; keep message generic (no secrets).
- **Owner:** `@backend.eng`.

#### SEC-M6 — Python dependency advisory incomplete (NFR-S6)

- **Evidence:** See §5 Dependency review. `pip_audit` could not complete advisory fetch (DNS failure to `pypi.org`). Versions are pinned in `backend/pyproject.toml`.
- **Risk:** Unknown CVEs in transitive Python graph until re-audit succeeds.
- **Mitigation:** Re-run `pip-audit` (or org SCA) when network available; fix High/Critical advisories before production image.
- **Owner:** `@devops.eng` (CI audit stage) with `@backend.eng` for upgrades.

### Low

#### SEC-L1 — FR-AUTH product login not implemented; `AUTH_USERNAME` / `AUTH_PASSWORD` unused

- **Evidence:** `.env.example` names; `settings.py` loads them; no `/auth/*` routes (SAD table).
- **Mitigation:** Implement owner signup/login per DEC-09 or remove unused env names until then.
- **Owner:** `@backend.eng` + `@frontend.eng`.
- **Trace:** FR-AUTH, DEC-09.

#### SEC-L2 — `/health` discloses auth mode and LLM configuration

- **Evidence:** `backend/app/api/health.py` → `auth_mode`, `llm_configured`.
- **Risk:** Recon aid; acceptable for local smoke.
- **Mitigation:** Strip or gate details behind auth for non-local deploys.
- **Owner:** `@backend.eng` / `@devops.eng`.

#### SEC-L3 — Grounded fallback echoes truncated user message into reply

- **Evidence:** `backend/app/services/copilot.py` `build_grounded_fallback_reply` includes `message[:120]`.
- **Risk:** Reflected content in UI (React text binding mitigates HTML XSS); still untrusted content in transcript.
- **Mitigation:** Omit raw user echo or escape/normalize for display contracts.
- **Owner:** `@backend.eng`.

### Info

#### SEC-I1 — Secrets scan (NFR-S1 / EC-012) — pass

- No committed `.env` (only `.env.example` with empty value placeholders).
- `.gitignore` ignores `.env` / `.env.*` with `!.env.example`.
- Pattern scan (repo excluding `.venv` / `node_modules`): no high-confidence committed API keys, Bearer literals, or password assignments.
- `docker-compose.yml` uses `${POSTGRES_*}` from env_file — no hardcoded credentials.
- Prompt Trace omitted in backend scaffold; eval/QA logs under `project-context/2.build/logs` checked for secret-like strings — none found. Redaction policy: keep secrets out of traces (aamad-core).

#### SEC-I2 — Agent boundary (NFR-S3, DEC-11) — pass for Week 3

- `backend/app/crew_runtime.py`: `tools: []`; `memory=False`; citations forced to `engine_payload` after kickoff.
- YAML agents (`backend/config/agents.yaml`) document no write tools; Week 3 wires `costing_analyst` only.
- Residual risk is narration/injection (SEC-M1), not ledger mutation via tools.

#### SEC-I3 — Frontend XSS rendering of copilot reply — low residual

- `frontend/src/components/CopilotPanel.tsx` renders `{response.reply}` as React text children (no `dangerouslySetInnerHTML`). Default escaping applies.
- Mock vs live: `VITE_USE_MOCK` / unset `VITE_API_BASE_URL` uses fixtures (`client.ts`) — no network secret exposure in mock mode.

#### SEC-I4 — Input validation baseline — positive

- Pydantic bounds on materials/recipes (non-negative prices, margin `< 1`, yield `> 0`, UoM mismatch rejected in API). Message length capped at 4000.

#### SEC-I5 — PCI / GDPR (NFR-S7, NFR-S8)

- No card data paths observed. Demo seed data only; do not load real personal data until Q1 privacy posture is decided.

---

## 4. Mitigations summary (by owner)

| ID | Severity | Owner persona | Action |
| --- | --- | --- | --- |
| SEC-H1 | High | `@backend.eng` | Fail closed when not local; require auth on mutating routes |
| SEC-H1 | High | `@frontend.eng` / `@product.mgr` | FR-AUTH login journey |
| SEC-H2 | High | `@frontend.eng` / `@integration.eng` | Remove production reliance on `VITE_API_BEARER_TOKEN` |
| SEC-M1 | Medium | `@backend.eng` | Sanitize/truncate free-text before LLM task format |
| SEC-M2 | Medium | `@backend.eng` | Constant-time Bearer compare |
| SEC-M3 | Medium | `@backend.eng` / `@integration.eng` | Tighten CORS for non-local |
| SEC-M4 | Medium | `@backend.eng` | Sanitize validation error details |
| SEC-M5 | Medium | `@backend.eng` | Register generic 500 handler |
| SEC-M6 | Medium | `@devops.eng` | Re-run pip advisory in CI when network available |
| SEC-L1–L3 | Low | `@backend.eng` (+ FE for L1) | FR-AUTH, health hardening, fallback echo |

---

## 5. Dependency review (*review-deps*, NFR-S6)

### Frontend (npm)

- **Method:** `npm audit` in `frontend/` (lockfile present).
- **Result:** `found 0 vulnerabilities` (2026-10-13 run).
- **Pinned direct deps (sample):** `react`/`react-dom` 19.3.0, `vite` 6.4.4 (`frontend/package.json`).

### Backend (pip)

- **Declared pins:** `backend/pyproject.toml` — e.g. `fastapi==0.143.0`, `uvicorn[standard]==0.54.0`, `crewai==1.15.27`, `pydantic==2.12.5`, `sqlalchemy==2.0.44`, `psycopg[binary]==3.3.6`.
- **Method attempted:**
  1. `python -m pip_audit -r backend/pyproject.toml` — **failed** (pip-audit expects a requirements-style file, not PEP 621 `[project]`).
  2. `python -m pip_audit` against project `.venv` — **failed** with `NameResolutionError` for `pypi.org` (no advisory data retrieved).
- **CVE inventory:** None asserted. Do not invent CVEs. Re-run when PyPI/OSV reachable; prefer exporting a lock/requirements freeze for CI.
- **Note:** Local venv showed version skew warnings for `tomli` / `tomli-w` vs `crewai` pins during pip-audit install — track as supply-chain hygiene, not a confirmed CVE.

---

## 6. Mapping to NFR-S1–S8 / DEC-09 / DEC-11

| Control | Week 3 status | Notes |
| --- | --- | --- |
| NFR-S1 Secrets | Pass | SEC-I1; forbid_committed_secrets honored in scan |
| NFR-S2 Mutating auth | Fail (local gap); **accepted localhost-only** | SEC-H1; Bearer works only if `SECRET_KEY` set |
| NFR-S3 Agent no writes | Pass | SEC-I2; DEC-11 |
| NFR-S4 Prompt injection | Partial | SEC-M1; notes N/A Week 3; free-text chat present |
| NFR-S5 Assessment before Deliver | Met (this artifact) | Gate CONDITIONAL; Highs operator-accepted for localhost-only |
| NFR-S6 Dependency audit | Partial | SEC-M6; npm OK |
| NFR-S7 GDPR/LGPD | Out of claim | Demo seed only; SEC-I5 |
| NFR-S8 Not PCI | Pass | No card storage |
| DEC-09 Single owner | Partial | No product login; open_local default |
| DEC-11 Agents vs engine | Pass | No write tools; citations overwritten |

---

## 7. Deliver blockers (for parent / operator)

**Resolved by operator acceptance (localhost-only):**

1. **SEC-H1** — Open local mutating API surface (NFR-S2) — accepted for loopback Week 3 packaging only.
2. **SEC-H2** — `VITE_API_BEARER_TOKEN` — accepted as local-MVP mechanism only; must not be documented as production AuthN.

**Recommended next step:** `@devops.eng` — prepare-release / define-deploy / configure-cicd / document-deploy / document-user-guide, with deploy.md Constraints mirroring this acceptance.

---

## Sources

- `project-context/1.define/prd.md` (FR-AUTH, NFR-S1–S8, DEC-09, DEC-11, R8)
- `project-context/1.define/sad.md` §4, §8 Security, §9 EC-010–EC-012
- `project-context/2.build/qa.md`, `evals.md`, `backend.md`, `frontend.md`, `integration.md`, `setup.md`
- `aamad.config.yml`
- `.env.example`, `.gitignore`, `docker-compose.yml`
- Code: `backend/app/auth.py`, `settings.py`, `main.py`, `api/*`, `crew_runtime.py`, `services/copilot.py`, `config/agents.yaml`, `config/tasks.yaml`
- Code: `frontend/src/api/client.ts`, `frontend/src/components/CopilotPanel.tsx`
- Tools: ripgrep secret-pattern scan; `npm audit`; attempted `pip_audit`

## Assumptions

- Assessment scope is the **implemented Week 3** FastAPI + React/Vite + CrewAI + in-memory store slice only.
- Default local bind `API_HOST=127.0.0.1` is the intended demo posture; exposure beyond loopback without `SECRET_KEY` is out of that posture.
- **Operator acceptance (2026-10-13):** SEC-H1 and SEC-H2 are **explicitly accepted as localhost-only Week 3 risks**. Owner: operator. Rationale: Week 3 demo packaging on loopback; not a production AuthN design. Expiry: before any non-localhost or shared hosting — require fail-closed auth (SEC-H1) and non-Vite session/token (SEC-H2).
- `evals.md` did not run EC-010/EC-011/EC-012 as code checks in Week 3; this assessment covers those dimensions via review.
- Prompt Trace samples with live LLM were not available (`llm_configured=false` in QA); redaction assessed by code/policy review.

## Open Questions

1. ~~Will the operator formally accept SEC-H1/H2 for localhost-only Deliver packaging?~~ **Answered 2026-10-13: accepted localhost-only.**
2. Preferred production AuthN: session cookie vs opaque server-side token vs reverse-proxy auth (SAD allows session or token)?
3. Should `/health` remain unauthenticated with `auth_mode` / `llm_configured` in non-local environments?
4. When should pip-advisory CI be mandatory (blocks merge vs advisory-only) given `dependency_audit: true`?

## Audit

| Field | Value |
| --- | --- |
| persona_id | `@security.eng` / `security-eng` |
| action | `assess-security` (+ `scan-secrets`, `review-deps`, `document-security`); operator acceptance of SEC-H1/H2 recorded 2026-10-13 |
| timestamp | `2026-10-13T13:07:03-03:00` (assessment); acceptance update `2026-10-13T13:13:00-03:00` |
| resolved_runtime | `AAMAD_TARGET_RUNTIME=crewai` (env unset; config `runtime.target=crewai`; default applied) |
| prompt_trace | Omitted — assessment is code/config review; no LLM-authored product content; no secrets recorded |
| application_logic_modified | No |
