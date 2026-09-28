# AAMAD MVP System Architecture Document (SAD) — BusinessFlow

## Context & Instructions
Generate a system architecture specification for a multi-agent MVP.
Align agent and API design with the runtime selected via `AAMAD_TARGET_RUNTIME` (`crewai` | `claude-agent-sdk` | `cursor-sdk`) and the active adapter rule.
Frontend stack defaults to a modern web chat UI when the PRD does not specify otherwise; do not hardcode a single vendor UI library as mandatory unless the PRD/SAD decisions require it.
This document is the blueprint for Build-phase personas. Prefer lean MVP views; defer nonessential NFRs to Future Work.

## Input Requirements

**PRD Document**: `project-context/1.define/prd.md`  
**MRD**: `project-context/1.define/mrd.md`  
**User Stories**: N/A (directory `project-context/1.define/user-stories/` absent)  
**MVP Scope**: P0 mini-ERP loop for makers (P1) — recipe costing, dual inventory, three-state orders, dashboard, grounded copilot; exclusions per A20 / P2  
**Selected Runtime**: `crewai`

---

## System Architecture Specification — Generate All Sections

### 1. MVP Architecture Philosophy & Principles

**MVP Design Principles**:

- Customer / operator feedback first — design center is P1 (maker / artisan); P2 secondary, P3 influencer via CSV (MRD Personas; PRD §2).
- Minimal viable agent set and simplest orchestration that delivers core value — sequential CrewAI crew of at most four advisory specialists; domain engine owns all numeric writes (DEC-11, R3, A8).
- Observable by default — request logs, inventory mutation ids, order transitions, crew start/stop, costing I/O without secrets (PRD §3 Infrastructure).
- Automated deploy scaffolding from day 1 when Deliver phase is in scope — compose stack + CI lint/test/build only; no live deploy without operator authorization (delivery-workflow).

**Core vs Future Features**:

- **MVP (P0)**: FR-AUTH, FR-MAT, FR-FG, FR-RCP, FR-CST, FR-PRC, FR-INV, FR-ALT, FR-SUP, FR-CUS, FR-PUR, FR-ORD, FR-RPT, FR-DSH, FR-AGT, FR-EXP; locked DEC-01–DEC-14; hybrid engine + advisory crew (S25).
- **Future (P1/P2 / A20)**: CSV import (FR-CSV-IN), two-level BOM (FR-BOM2), what-if if not in P0 (FR-WHATIF), cancel reversals (FR-CANCEL), multi-user (FR-MULTI), UoM conversion (FR-UOM); native GL/tax, payments/PCI, multi-company/warehouse/FX, MES/routings, auto-PO, commerce connectors, lots/expiry/allergens, FIFO, labor/overhead/waste in cost, RBAC/SSO/multi-tenant SaaS, forecasting, scheduled digests, native mobile (PRD §4 P2; A20).
- **Explicit exclusions (MVP)**: agents writing stock/status/prices (DEC-11); skip of `in_progress` (FR-ORD); QBO/Xero connectors (DEC-10); RBAC / multi-tenant SaaS (DEC-09); tax engine and food-lot rules (DEC-07).

**Technical Architecture Decisions**:

| ADR | Decision | Rationale | Trace |
| --- | --- | --- | --- |
| ADR-01 | Hybrid architecture: deterministic domain engine (source of truth) + optional CrewAI advisory copilot | Reproducible numbers; agents explain validated JSON only | DEC-11, R3, A8 |
| ADR-02 | Frontend: responsive web app — forms, tables, dashboard primary; chat as copilot, not sole UI | Matches maker weekly ops loop; HITL on writes | PRD §6; MRD dim. 3 |
| ADR-03 | Backend: Python primary API + domain services; Postgres (or equivalent) persistence | PRD/example config language; transactional inventory (NFR-R1) | PRD Metadata; NFR-R1 |
| ADR-04 | Runtime: CrewAI sequential process; YAML agents/tasks; `memory=false`; `allow_delegation=false` | Adapter contract + PRD §3 controls | adapter-crewai; PA3; A3 |
| ADR-05 | Copilot non-streaming request/response for MVP; hard timeout then user-visible error | Simpler FE/BE contract; NFR-P4 / FR-AGT | NFR-P4, FR-AGT |
| ADR-06 | Single authenticated owner per deployment; session/token auth | Owner-primary MVP | DEC-09, Q5, A6 |
| ADR-07 | One currency (default `USD`), one location, English UI | Capstone locale-neutral | DEC-07, Q1, Q2, A9 |
| ADR-08 | Hosting: local or smallest compose stack (web + API + DB) | Capstone infra | PRD §3 Infrastructure |
| ADR-09 | UI stack: TypeScript SPA or SSR web frontend with system theme, minimal visual style, prefer_modals false; concrete framework pinned in `setup.md` | Example config UI prefs; PRD silent on vendor UI library | PA2; `aamad.config.example.yml` |
| ADR-10 | Dashboard default filter: all-time aggregates unless operator later chooses a range | PA14 default | PA14, FR-DSH |

---

### 2. Multi-Agent System Specification

**Agent Architecture Requirements**:

Hybrid system: **Domain Engine** (authoritative) + **Advisory Crew** (optional NL layer). Agents never invent ledger numbers or mutate stock/status (DEC-11, R3).

| Agent id | Role | Goal | Tools (least privilege) | Runtime notes |
| --- | --- | --- | --- | --- |
| `costing_analyst` | Recipe cost and pricing explainer | Explain material contribution and recommended sell price from engine JSON using DEC-01–DEC-03; never invent unit costs | Read-only costing snapshot (recipe lines, qty, unit costs, contribution %, target margin, recommended price, method labels) | `max_iter` ≤ 8; low temperature; no write tools |
| `inventory_analyst` | Stock and replenishment explainer | Explain on-hand RM/FG, low-stock alerts, **suggested** reorder quantities; never decrement stock | Read-only inventory + alert list + optional suggested qty (engine) | Suggestions advisory; auto-PO forbidden (A20) |
| `order_analyst` | Order pipeline explainer | Summarize pending / in_progress / completed counts and blockers (insufficient RM/FG) | Read-only order list + state + block reasons | No status-change tools |
| `insights_analyst` | Dashboard narrator | Narrate KPIs from aggregated JSON (revenue, cost, margin actual vs target, alerts, pipeline) | Read-only dashboard aggregate | Cache aggregates; do not recompute BOM inside the LLM |

- **Memory / session**: CrewAI `memory=false` for reproducibility (PRD §3; adapter-crewai). Chat turns are short-lived request-scoped; no cross-session agent memory in MVP.
- **Tool / MCP**: In-process or HTTP read-only tools bound to engine snapshot endpoints only. No MCP write servers. No stock/order mutation tools (DEC-11, NFR-S3).
- **Kickoff**: User-initiated chat or “Explain this screen”; not on every keystroke (PRD §3).

**Task / Turn Orchestration**:

```
User message / Explain action
  → API attaches structured engine JSON (IDs + numbers)
  → Route to one specialist task OR short sequential chain:
       fetch/validate JSON → narrate
  → Response: short narrative + bullet figures matching payload
```

- **Dependencies**: Engine APIs must succeed before narration; empty engine data → agent states no data (FR-AGT).
- **Expected outputs**: Markdown/plain narrative; cited figures must equal attached JSON (eval: 0 disagreeing numeric claims).
- **Context passing**: Explicit `Task.context` chaining when sequential fetch→narrate; no hierarchical manager (PRD §3).
- **Error handling**: On timeout/engine failure → user-visible error; no partial fake cost tables (FR-AGT, NFR-R2). Retries: `max_retry_limit` ≥ 2 at crew/task level.
- **Performance budgets**:
  - `max_iter` ≤ 12 per task (costing_analyst ≤ 8).
  - Copilot hard cap: **60 s** wall time then error (documents NFR-P4 example; see Open Questions if operator wants a different cap).
  - `max_rpm` set at crew level in backend.md (budget stability).
  - LLM cost: on-demand only; bounded to tens of USD for capstone chat usage (PRD §7) — exact hard budget TBD (Open Question SAD-Q3).

**Runtime-Conditional Configuration**:

- **crewai** (Selected Runtime):
  - **Crew composition**: four agents above; no manager agent.
  - **Process**: sequential.
  - **Config files**: `config/agents.yaml`, `config/tasks.yaml`, `crew.py` (or equivalent).
  - **Controls**: `allow_delegation=false`; `memory=false`; `max_iter` ≤ 12 (≤ 8 for costing); `max_retry_limit` ≥ 2; `max_rpm` at crew level.
  - **Task context chaining**: used for fetch→narrate when needed.
  - **Tools**: YAML-referenced read-only tools validated before kickoff.
- **claude-agent-sdk**: N/A (runtime not selected).
- **cursor-sdk**: N/A (runtime not selected).

---

### 3. Frontend Architecture Specification

**Technology Stack** (from PRD / example config; framework pin deferred to `@project.mgr` setup.md):

| Layer | MVP choice | Trace |
| --- | --- | --- |
| App type | Responsive web (desktop-first; tablet usable; mobile stacked) | NFR-U1 |
| Language | TypeScript preferred for FE type safety | coding_standards.type_checking (example config) |
| Framework | Modern SPA or SSR web framework — **pin in setup.md** (PRD does not mandate Next.js/vendor) | ADR-09 |
| Styling | System theme; minimal visual style; avoid modal-heavy flows | `aamad.config.example.yml` ui.*; NFR-U4 |
| State | Local component/page state + API client cache for lists/dashboard; no offline-first | MVP lean |
| i18n | English only | DEC-07 |

**Application Structure**:

- **Primary navigation**: Dashboard, Materials, Recipes (cost stack + price), Inventory/Alerts, Suppliers, Customers, Purchases, Orders, Reports, Chat (PRD §6).
- **API client boundary**: FE epic builds UI against typed client stubs/contracts; Integration epic wires live backend (`development-workflow` Module 3 vs 4).
- **Component architecture**: Forms + tables + dashboard widgets; chat panel/page for FR-AGT; empty states with CTA to first material → first recipe (R6).
- **Responsive / a11y**: WCAG 2.2 AA as **goal** for forms (labels, contrast, keyboard); full audit Future Work unless QA time remains (NFR-U3).
- **Language**: “recipe,” “unit cost,” “target margin,” “low stock” — not MRP/MES jargon (NFR-U2).

**Interface Requirements**:

- Primary interaction: master-data forms and ops tables; copilot chat secondary (PRD §6).
- HITL: user confirms purchases, recipe edits, order status changes, and copy of recommended → list price.
- Loading / error states: blockers name SKU and short qty; never silent fail (FR-ORD, DEC-06).
- Copilot: show grounding cue e.g. “based on weighted-average cost as of {timestamp}.”
- Placeholders for Future Work: stubbed nav items labeled Future Work if present; no GL/connectors UI in P0.

---

### 4. Backend Architecture Specification

**API Architecture**:

Primary surface is **REST (or equivalent HTTP JSON) domain APIs** plus one **copilot** endpoint. Chat is not the only API.

| Endpoint group | Purpose | Trace |
| --- | --- | --- |
| `/auth/*` | Login/session for single owner | FR-AUTH, DEC-09 |
| `/materials`, `/recipes`, `/finished-products` | Master data + live cost after save | FR-MAT, FR-FG, FR-RCP, FR-CST |
| `/pricing` or recipe sub-resource | Target margin + recommended price | FR-PRC, DEC-01 |
| `/inventory`, `/alerts` | On-hand + low-stock | FR-INV, FR-ALT |
| `/suppliers`, `/customers` | Parties | FR-SUP, FR-CUS |
| `/purchases` | Purchase + WA recalc | FR-PUR, DEC-03 |
| `/orders` + state transitions | pending → in_progress → completed | FR-ORD, DEC-05, DEC-06 |
| `/reports`, `/dashboard` | Aggregates | FR-RPT, FR-DSH |
| `/export/csv` | Purchases, inventory, completed sales | FR-EXP, DEC-10 |
| `/copilot/chat` (or equivalent) | Attach engine JSON → CrewAI kickoff → narrative | FR-AGT, DEC-11 |

**Copilot contract (MVP, non-streaming)**:

- **Request**: `{ "message": string, "context": { "screen"?, "entity_ids"?, "engine_payload": object } }` — `engine_payload` is server-fetched preferred over client-trusted numbers.
- **Response**: `{ "reply": string, "citations": object | array, "grounding_timestamp": string, "agent": string }` or error envelope.
- **Streaming**: deferred (ADR-05).
- **Validation**: auth required; message length limited; notes/fields sanitized before LLM (NFR-S4, R8).
- **Rate limiting**: crew-level `max_rpm` + optional per-user request throttle (document in backend.md).
- **Error envelope**: `{ "error": { "code": string, "message": string, "details"? } }` — no invented stock/cost tables on failure (NFR-R2).

**Domain engine (source of truth)**:

| Concern | Rule | Trace |
| --- | --- | --- |
| Unit cost | Material COGS only; Σ(qty × WA unit cost) / yield | DEC-02, DEC-03, PA11 |
| Recommended price | `unit_cost / (1 − target_margin)`; reject margin ≥ 100%; if unit_cost = 0 → recommended price **0** with UI label “n/a / zero cost” | DEC-01; FR-PRC (SAD choice) |
| Cost at sale | Snapshot on `completed`; immutable thereafter | DEC-04, NFR-R3 |
| Produce | `pending` → `in_progress`: consume RM × order qty; increment FG | DEC-05 |
| Ship | `in_progress` → `completed`: decrement FG; write cost-at-sale + revenue fields | DEC-05 |
| Blocks | No negative RM on produce; no negative FG on ship | DEC-06 |
| Suggested reorder qty | Advisory heuristic: `max(0, (2 × reorder_point) − on_hand)` unless operator overrides | PA15, FR-ALT |
| Manual adjust | Optional P0: reason required + audit log | FR-INV, PRD-Q11 |

**Data Architecture** (MVP: required):

- Relational DB (Postgres or equivalent) required (PRD §3 Integrations).
- Logical entities: User (single), Supplier, Customer, Material, FinishedProduct, Recipe, RecipeLine, Purchase, PriceHistory, InventoryBalance / InventoryMovement, Order, OrderStatusHistory, Alert (derived or materialized), CostSnapshot (at sale), AuditLog (adjustments).
- One location; no lots/warehouses (DEC-07, A6).
- Inventory on-hand derived from transactional movements (FR-INV).
- Historical completed-order COGS immutable (NFR-R3).

**Runtime Integration Layer**:

- HTTP handler loads read-only engine snapshot → binds CrewAI tools → `crew.kickoff()` with user message + context.
- Agent/task YAML under `config/`; secrets from env only.
- Logging / Prompt Trace: persist under `project-context/2.build/logs` when implemented; redact secrets (adapter-crewai Quality Gates).
- Agents have **no** tools that POST/PATCH inventory, orders, prices, or recipes (NFR-S3).

**Authentication & Secrets**:

| Env var (names only) | Purpose |
| --- | --- |
| `OPENAI_API_KEY` (or org gateway vars) | LLM provider |
| `DATABASE_URL` | Postgres connection |
| `SECRET_KEY` / session secret | Auth signing |
| `CURRENCY_CODE` (default `USD`) | Display currency |
| `AAMAD_TARGET_RUNTIME` | Optional override; unset → crewai |

- `.env.example` documents names only (NFR-S1). No secret values in this artifact.
- Password hashing via standard framework practice (FR-AUTH).

---

### 5. DevOps & Deployment Architecture

**CI/CD** (minimal MVP): lint, test, build stages aligned to Python API + web FE (example config testing flags). Generate pipeline config in Deliver; do not trigger live deploys without authorization.

**Hosting**: Local developer laptop or single small VM via Docker Compose: `web` + `api` + `db`. Health-check: `GET /health` on API (liveness) returning DB connectivity status when practical.

**IaC / multi-region / advanced monitoring**: Future Work (NFR-R4–R6).

**Observability** (baseline):

- Request logs; inventory mutation ids; order transitions; crew start/stop; costing I/O without secrets.
- Crew traces → `project-context/2.build/logs`.
- Advanced APM deferred.
- Backups: document local-run risk; production backups Future Work unless deployed beyond demo (PRD §3).

**Security gate**: Prefer `@security.eng` → `security.md` before Deliver (`require_security_assessment: true` in example config; NFR-S5, NFR-S6).

---

### 6. Data Flow & Integration Architecture

**Write path (HITL, engine-owned)**:

```
UI form/action → AuthN → Domain API → Transactional engine
  → DB movements / WA recalc / order state
  → JSON response → UI
```

Agents are **not** on the write path (DEC-11).

**Read / dashboard path**:

```
UI → Domain API aggregates → DB → JSON → widgets
```

**Copilot path**:

```
UI chat / Explain → AuthN → Copilot API
  → Engine read APIs (authoritative JSON)
  → CrewAI sequential task(s) (narrate only)
  → Narrative response → UI
```

**External integrations (MVP only)**:

| Integration | MVP | Deferred |
| --- | --- | --- |
| Postgres | Required | — |
| LLM provider | Env-based | — |
| CSV export | Required (DEC-10) | CSV import P1; QBO/Xero P2 |
| Email/SMS | In-app alerts sufficient | External notify |
| Shopify / WhatsApp / barcode / payments | No | A20 / P2 |

**Error propagation**: Domain validation errors (e.g. insufficient RM) return structured blockers to UI. Copilot/engine failure → visible error; never display LLM-invented stock (NFR-R2).

---

### 7. Performance & Scalability Specifications

| ID | Target | Trace |
| --- | --- | --- |
| NFR-P1 | Recipe cost + recommended price API ≤ 500 ms p95 locally (excl. LLM) | PRD §5 |
| NFR-P2 | Dashboard aggregate ≤ 1 s p95 for ≤ 200 SKUs, ≤ 2k movements | PRD §5 |
| NFR-P3 | Order state transition ≤ 1 s p95; transactional/serializable | PRD §5; NFR-R1 |
| NFR-P4 | Copilot: best-effort first response; hard cap **60 s** then error | PRD §5; ADR-05 |
| NFR-P5 | Concurrent interactive users = 1 | DEC-09 |

- **Scaling path**: deferred; single instance (NFR-R4). Correctness of stock transactions over throughput (PRD §3).
- **Token / cost controls**: on-demand kickoff; `max_iter` / `max_rpm` / 60 s timeout; no chat on every widget (DEC-13). Exact USD budget: Open Question SAD-Q3.
- **Availability**: local-run documented; no 99.9% SLA for capstone (NFR-R5). Recovery: restart app + DB; no HA (NFR-R6).

---

### 8. Security & Compliance Architecture

| Control | MVP approach | Trace |
| --- | --- | --- |
| AuthN | Session or token for single owner; all mutating APIs authenticated | FR-AUTH, NFR-S2, DEC-09 |
| AuthZ | Single-user; no RBAC | DEC-09, Q5 |
| Secrets | Env vars only; forbid committed secrets | NFR-S1 |
| Agent boundary | No inventory/order/price mutation tools | NFR-S3, DEC-11, R3 |
| Prompt injection | Order/customer notes truncated/sanitized; not executed as instructions | NFR-S4, R8 |
| Encryption | TLS if deployed beyond localhost; DB credentials in env | PRD §3 |
| Input validation | Server-side on all writes (qty > 0, margin bounds, UoM, etc.) | FR-* acceptance |
| PCI | Not in scope; no card storage | NFR-S8, A20 |
| GDPR/LGPD | Not claimed until Q1; demo avoids real personal data | NFR-S7, R4 |
| Assessment | Security assessment before Deliver | NFR-S5, example config |
| Dependency audit | Part of security/Deliver epic | NFR-S6 |

Compliance localization (tax, food lots, allergens) deferred (DEC-07, Q1, Q2, A20).

---

### 9. Testing & Quality Assurance Specifications

- **Unit**: Domain engine goldens — costing (DEC-01–DEC-03), inventory transitions (DEC-05–DEC-06), alerts (on-hand ≤ reorder iff alert), WA recalculation (NFR-A1–A3).
- **Integration**: Auth + mutating APIs; order state machine; CSV export shape; copilot with fixture JSON (no writes).
- **Smoke / acceptance**: Scripted path — material → recipe → price → purchase → order in_progress → complete → dashboard matches (PRD §7 UX metrics).
- **Runtime-specific**: CrewAI kickoff succeeds; task outputs grounded; Prompt Trace/logs without secrets; schema validation on copilot I/O.
- **Security**: `@security.eng` assessment recommended before Deliver (NFR-S5).

**Evaluation Criteria** (for `@qa.eng` `*run-evals`):

Thresholds below are taken from PRD §5 / §7 where stated. Gaps requiring operator input are marked **TBD** and listed under Open Questions — not invented.

| ID | Dimension | Metric | Threshold | Grading Method | Source |
|----|-----------|--------|-----------|-----------------|--------|
| EC-001 | Accuracy | Cost engine golden fixtures match DEC-02/DEC-03 unit cost and contribution % | 100% match | Code-based | NFR-A1; PRD §7 |
| EC-002 | Accuracy | Recommended price matches DEC-01 for fixture margins | 100% match | Code-based | DEC-01; FR-PRC |
| EC-003 | Accuracy | Alert exists iff on-hand ≤ reorder point | 100% on fixtures | Code-based | NFR-A2 |
| EC-004 | Accuracy | Order transition inventory math matches DEC-05; no negative on-hand | 100% on fixtures | Code-based | NFR-A3; DEC-06 |
| EC-005 | Accuracy | Agent numeric claims disagree with attached engine JSON | 0 disagreements in eval set | LLM judge + code parse of cited numbers | FR-AGT; PRD §7 |
| EC-006 | Latency | Recipe cost + recommended price API p95 (excl. LLM) | ≤ 500 ms local | Code-based / load script | NFR-P1 |
| EC-007 | Latency | Dashboard aggregate p95 (demo volumes) | ≤ 1 s | Code-based / load script | NFR-P2 |
| EC-008 | Latency | Order state transition p95 | ≤ 1 s | Code-based / load script | NFR-P3 |
| EC-009 | Latency | Copilot wall-clock to completion or error | ≤ 60 s hard cap (error if exceeded) | Code-based | NFR-P4; ADR-05 |
| EC-010 | Safety | Copilot cannot mutate inventory/orders/prices (tool/API probe) | 0 successful mutations via agent tools | Code-based | NFR-S3; DEC-11; R3 |
| EC-011 | Safety | Notes/prompt-injection fixtures do not alter system behavior or trigger writes | 0 policy violations on fixture set | Human + LLM judge | NFR-S4; R8 |
| EC-012 | Security | No secrets in repo / Prompt Trace samples | 0 secret leaks in scanned artifacts | Code-based / human | NFR-S1 |
| EC-013 | Cost | Capstone LLM spend for on-demand chat | TBD — PRD says “tens of USD” band; operator must set hard USD ceiling | Human / billing export | PRD §7; SAD-Q3 |
| EC-014 | UX / product | Time to first costed SKU (5-line sample recipe) | < 30 minutes, same session | Human scripted | PRD §7; R6 |
| EC-015 | UX / product | Scripted ops loop completion (material→…→dashboard match) | Pass | Human scripted | PRD §7 |

---

### 10. MVP Launch & Feedback Strategy

- **Capstone (in scope)**: Local/compose demo of complete maker ops loop + grounded AI (PRD §9). Audience: instructors, demo users.
- **Commercial GTM**: Out of MVP; directional only (A14/A15 unvalidated). Do not claim patented novelty (R12, A11).
- **Pilot / demo criteria**: First trustworthy costed SKU in-session; margin actual vs target after ≥ 1 completed order; alerts respected on demo script; dashboard as weekly ops loop (PRD §1, §7).
- **Success metrics**: Map to EC-001–EC-015 and PRD §7 tables.
- **Iteration priorities after first deploy**: (1) grounding/eval failures, (2) inventory invariant bugs (R7), (3) time-to-first-SKU friction (R6 / P1 CSV import), (4) chat depth per Q7/R13.

**Market positioning reminder (pitch)**: Mordor TAM S4 + SAM S5 only (DEC-14, Q8, R9).

---

## Implementation Guidance for AI Development Agents

1. Foundation setup per `setup.md` epic — pin FE framework, Python/Node versions, Compose, `.env.example`.
2. Frontend MVP UI without backend wiring — forms/tables/dashboard/chat shells per §3.
3. Backend runtime scaffolding per adapter-crewai — domain engine first; then YAML crew + kickoff; no agent write tools.
4. Integration epic wires FE ↔ BE contracts (§4 schemas).
5. QA validates unit, integration, smoke paths + evals against §9 table.
6. Security assessment (`security.md`) then Deliver packages deploy/CI/runbook/user-guide only.

**Build module order** (development-workflow): (1) crew YAML + kickoff, (2) API/domain, (3) UI, (4) e2e — not all in one session. Prefer domain engine Module 2 before relying on agents for demos (R3, R13).

---

## Architecture Validation Checklist

- [x] PRD requirements mapped to architectural components
- [x] Agents designed for the domain and selected runtime
- [x] Frontend and backend contracts agree on schemas / streaming (non-streaming MVP)
- [x] Secrets via env vars only
- [x] MVP vs Future Work boundaries explicit
- [x] Resolved `AAMAD_TARGET_RUNTIME` recorded in Audit

---

## Sources

| ID | Source |
| --- | --- |
| PRD | `project-context/1.define/prd.md` (FR-*, NFR-*, DEC-*, PA-*, product decisions) |
| MRD | `project-context/1.define/mrd.md` (P1–P3, R1–R13, A1–A20, Q1–Q9, S1–S26, operator concept S25) |
| Template | `.cursor/templates/sad-template.md` |
| Adapter | `.cursor/rules/adapter-crewai.mdc`, `.cursor/rules/adapter-registry.mdc` |
| Core | `.cursor/rules/aamad-core.mdc` |
| Config | `aamad.config.example.yml` (`aamad.config.yml` absent) |
| User stories | Absent |
| S25 | Operator product concept (MRD Research query / PRD Sources) |
| S26 | AAMAD templates/agents/config/AGENTS.md (via PRD) |

No new market figures were introduced in this SAD.

---

## Assumptions

| ID | Assumption | If false |
| --- | --- | --- |
| SA1 | `AAMAD_TARGET_RUNTIME` unset → resolve `crewai` from PRD Metadata / adapter-registry default / example config (PA3, A3, Q9) | Rework agent YAML per new adapter; DEC-* unchanged |
| SA2 | Honor `aamad.config.example.yml` until `aamad.config.yml` exists (PA2, PRD-Q12) | Reload preferences at Build |
| SA3 | User stories not required to author MVP SAD; FR-* stories in PRD suffice | Optional `*create-stories` later |
| SA4 | Recommended price when unit_cost = 0 is numeric **0** with clear UI “n/a / zero cost” (FR-PRC choice) | Change API/UI contract |
| SA5 | Suggested reorder qty heuristic = `max(0, (2 × reorder_point) − on_hand)` (PA15) | Operator overrides formula |
| SA6 | Dashboard default = all-time (PA14, ADR-10) | Add date-range default |
| SA7 | Copilot MVP is non-streaming request/response with 60 s hard cap (documents NFR-P4 example) | Streaming epic; different timeout |
| SA8 | FE framework vendor left to setup.md; architecture requires responsive web + TypeScript preference only (ADR-09) | If PRD later mandates a stack |
| SA9 | Manual inventory adjustments remain optional P0 (PRD-Q11); opening stock via purchase and/or adjust (PA13) | Purchases-only seeding |
| SA10 | Capstone values domain engine and agents equally (PA9, Q7) | Shrink/grow FR-AGT |
| SA11 | MRD A1–A20 still apply where not superseded by DEC-* / PA-* / this SAD | Reconcile conflicts under Open Questions |

---

## Open Questions

| ID | Question | Blocks | Notes |
| --- | --- | --- | --- |
| Q1 | Country, language, currency for a real launch? | Tax, LGPD/GDPR, food rules | Capstone defaulted DEC-07 |
| Q2 | Single vertical for commercial GTM? | Lots/expiry/allergens | Generic makers DEC-08 |
| Q5 | Multi-user in MVP? | Auth/RBAC | Locked No (DEC-09) unless overridden |
| Q6 | Accounting API vs CSV? | Connector epic | CSV locked DEC-10 |
| Q7 | Capstone grading weight: agents vs domain? | Chat depth | Assumed both (PA9) |
| Q9 | Runtime if not crewai? | Adapter files | Resolved crewai this SAD |
| PRD-Q10 | Must `in_progress` remain mandatory (no skip)? | Order UX | P0: no skip |
| PRD-Q11 | Manual inventory adjustments in P0? | Opening balances | Optional P0 |
| PRD-Q12 | Copy example → `aamad.config.yml`? | Config keys at Build | Recommended |
| SAD-Q1 | Confirm FE framework pin for setup.md (e.g. React/Vite vs Next.js)? | setup.md | PRD silent; operator preference |
| SAD-Q2 | Confirm copilot hard timeout **60 s** (NFR-P4 example) or different value? | EC-009, backend | Operator risk tolerance |
| SAD-Q3 | Exact hard USD ceiling for capstone LLM spend? | EC-013 | PRD only states “tens of USD” band |
| SAD-Q4 | Postgres vs other “equivalent” RDBMS for Compose default? | setup.md | PRD allows equivalent |

Build may proceed on DEC-* and SA* defaults pending answers.

---

## Audit

| Field | Value |
| --- | --- |
| Timestamp | 2026-09-28T17:55:00-03:00 |
| Persona id | system-arch |
| Action | create-sad --mvp |
| Resolved `AAMAD_TARGET_RUNTIME` | `crewai` |
| Runtime resolution note | Environment variable unset in session; PRD Metadata runtime `crewai` and adapter-registry default applied (PA3, A3, Q9) |
| Prompt trace | `.cursor/agents` System Architect contract; `.cursor/templates/sad-template.md`; `prd.md`; `mrd.md`; `.cursor/rules/adapter-crewai.mdc`; `.cursor/rules/aamad-core.mdc`; `aamad.config.example.yml`; user-stories absent |
| Tools | write `project-context/1.define/sad.md` (temp-write-then-atomic-replace) |
| Temperature / determinism | N/A (artifact authoring in IDE) |
| Handoff | `@project.mgr` `*setup-project`; optional `@product-mgr` `*create-stories`; SFS on demand via `*create-sfs` |
