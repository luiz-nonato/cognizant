# AAMAD MVP System Architecture Document (SAD) — BusinessFlow

## Context & Instructions
Generate a system architecture specification for a multi-agent MVP.
Align agent and API design with the runtime selected via `AAMAD_TARGET_RUNTIME` (`crewai` | `claude-agent-sdk` | `cursor-sdk`) and the active adapter rule.
Frontend stack defaults to a modern web chat UI when the PRD does not specify otherwise; do not hardcode a single vendor UI library as mandatory unless the PRD/SAD decisions require it.
This document is the blueprint for Build-phase personas. Prefer lean MVP views; defer nonessential NFRs to Future Work.

## Input Requirements

**PRD Document**: `project-context/1.define/prd.md`  
**MRD**: `project-context/1.define/mrd.md`  
**User Stories**: N/A (directory `project-context/1.define/user-stories/` absent; PRD `FR-*` stories are the feature contract)  
**MVP Scope**: P0 mini-ERP loop for makers (P1) — recipe costing, dual inventory, three-state orders, dashboard, grounded copilot, CSV export; exclusions per A20 / P1 / P2  
**Selected Runtime**: `crewai`

---

## System Architecture Specification — Generate All Sections

### 1. MVP Architecture Philosophy & Principles

**MVP Design Principles**:

- Customer / operator feedback first — design center is P1 (maker / artisan); P2 secondary; P3 influencer via CSV export (MRD Personas; PRD §2).
- Minimal viable agent set and simplest orchestration that delivers core value — sequential CrewAI crew of four advisory specialists; the domain engine owns every numeric write (DEC-11, R3, A8).
- Observable by default — request logs, inventory mutation ids, order transitions, crew start/stop, costing I/O without secrets (PRD §3 Infrastructure).
- Automated deploy scaffolding from day 1 when Deliver phase is in scope — compose stack plus CI lint/test/build only; no live deploy without operator authorization (delivery-workflow).

**Core vs Future Features**:

- **MVP (P0)**: FR-AUTH, FR-MAT, FR-FG, FR-RCP, FR-CST, FR-PRC, FR-INV (including required manual adjust, DEC-15), FR-ALT, FR-SUP, FR-CUS, FR-PUR, FR-ORD, FR-RPT, FR-DSH, FR-AGT, FR-EXP. Locked decisions DEC-01–DEC-20. Hybrid engine plus advisory crew (S25, DEC-11, DEC-13).
- **P1 (enhanced, not MVP)**: FR-CSV-IN, FR-BOM2 (two-level BOM), FR-WHATIF (persist-free +10% supplier what-if; P1 hard per DEC-13 / PA19), FR-CANCEL (reverse `in_progress`), FR-MULTI, FR-UOM (conversion; P0 rejects mismatch).
- **P2 / A20 (Future Work)**: native GL, tax engine, e-invoicing, payments/PCI, multi-company, multi-warehouse, FX, MES, routings, shop-floor scans, WIP, auto-PO, commerce connectors, lots/expiry/allergens, FIFO, labor/overhead/waste in the cost stack, RBAC, SSO, multi-tenant SaaS, demand forecasting, scheduled insight digests, native mobile app.
- **Explicit MVP exclusions**: agents writing stock, status, or prices (DEC-11); skipping `in_progress` (FR-ORD, PRD-Q10); nested recipes (DEC-12); supplier what-if in chat or UI (DEC-13); QBO/Xero (DEC-10); RBAC or multi-tenant SaaS (DEC-09); tax engine and food-lot rules (DEC-07); silent UoM conversion (DEC-18); silent negative stock (DEC-06); exchange rates and a document that mixes `BRL` and `USD` (ADR-14). `BRL` and `USD` are both supported as the single deployment currency.

**Technical Architecture Decisions**:

| ADR | Decision | Rationale | Trace |
| --- | --- | --- | --- |
| ADR-01 | Hybrid architecture: deterministic domain engine (source of truth) plus optional CrewAI advisory copilot | Numbers stay reproducible; agents explain validated JSON only | DEC-11, R3, A8 |
| ADR-02 | Frontend: responsive web — forms, tables, and dashboard primary; chat is a copilot, not the sole UI | Matches the maker weekly ops loop; human confirmation on writes | PRD §6; MRD dim. 3 |
| ADR-03 | Backend: Python API plus domain services; Postgres (or equivalent) persistence | Example-config language; transactional inventory | PRD Metadata; NFR-R1; PRD §3 |
| ADR-04 | Runtime: CrewAI sequential process; YAML agents/tasks; `memory=false`; `allow_delegation=false` | Adapter contract and PRD §3 controls | adapter-crewai; PA3; A3 |
| ADR-05 | Copilot is non-streaming request/response for MVP; hard timeout then a user-visible error | Simpler FE/BE contract | NFR-P4, FR-AGT |
| ADR-06 | Single authenticated owner per deployment; session or token auth | Owner-primary MVP | DEC-09, Q5, A6 |
| ADR-07 | One active currency per deployment, chosen from `USD` or `BRL`; one location; English UI. No FX conversion and no mixed-currency documents | Operator requires Real and Dollar support. DEC-07 still forbids a second currency inside one ledger; FX stays P2 | DEC-07, Q1, operator 2026-10-05 |
| ADR-08 | Hosting: local or smallest compose stack (web + API + DB) | Capstone infrastructure | PRD §3 Infrastructure |
| ADR-09 | UI: TypeScript web frontend, system theme, minimal visual style, `prefer_modals: false`; concrete framework pinned in `setup.md` | Example config UI prefs; PRD does not mandate a vendor UI library | PA2; `aamad.config.example.yml` |
| ADR-10 | Dashboard aggregates default to all-time; no date-range filter in P0 | Locked product decision | DEC-20, PA14, FR-DSH |
| ADR-11 | Manual RM/FG adjustment is a P0 engine operation: reason required, audit log written, resulting on-hand must not go negative | Opening balances and corrections without a second ledger | DEC-15, DEC-06, PA13, FR-INV |
| ADR-12 | Recipe line UoM must equal the material UoM; mismatch returns error code `uom_mismatch` and performs no conversion | Keeps P0 costing unambiguous | DEC-18, FR-RCP, FR-UOM |
| ADR-13 | New order sell price defaults to the recommended price; the user may override; reports use the order’s actual sell price | Pricing advice stays advisory; revenue stays factual | DEC-17, PA12, FR-ORD, FR-RPT |
| ADR-14 | Money fields use the deployment currency only. `CURRENCY_CODE` is `USD` (symbol `$`) or `BRL` (symbol `R$`). The API rejects any other code and any payload whose currency differs from the deployment | Supports Real and Dollar without an exchange-rate engine | Operator 2026-10-05; SA17 |

---

### 2. Multi-Agent System Specification

**Agent Architecture Requirements**:

Hybrid system: **Domain Engine** (authoritative) + **Advisory Crew** (natural-language layer). Agents never invent ledger numbers and never mutate stock, prices, recipes, or order state (DEC-11, R3, NFR-S3).

| Agent id | Role | Goal | Tools (least privilege) | Runtime notes |
| --- | --- | --- | --- | --- |
| `costing_analyst` | Recipe cost and pricing explainer | Explain material contribution and recommended sell price from engine JSON using DEC-01–DEC-03 and DEC-16; never invent unit costs | Read-only costing snapshot: recipe lines, qty, UoM, unit costs, line cost, contribution %, yield, target margin, recommended price, method label | `max_iter` ≤ 8; low temperature; no write tools |
| `inventory_analyst` | Stock and replenishment explainer | Explain on-hand RM/FG, low-stock alerts, and suggested reorder quantities; never decrement stock | Read-only inventory, alert list, and engine-computed suggested qty | Suggestions are advisory; auto-PO forbidden (A20, DEC-19) |
| `order_analyst` | Order pipeline explainer | Summarize pending / in_progress / completed counts and blockers (insufficient RM or FG) | Read-only order list, state, and block reasons | No status-change tools |
| `insights_analyst` | Dashboard narrator | Narrate KPIs from aggregated JSON: revenue, COGS, margin actual vs target, alerts, pipeline | Read-only dashboard aggregate | Use cached aggregates; do not recompute the recipe inside the LLM |

- **Memory / session**: CrewAI `memory=false` for reproducibility (PRD §3; adapter-crewai). Each chat turn is request-scoped. No cross-session agent memory in MVP.
- **Tool / MCP**: Read-only tools bound to engine snapshot endpoints. No MCP servers that can write. No stock, order, price, or recipe mutation tools (DEC-11, NFR-S3).
- **Kickoff**: User-initiated chat or an “Explain” action on a recipe or the dashboard. Not on every keystroke or widget refresh (PRD §3, DEC-13).
- **Out of P0 crew scope**: persist-free supplier what-if (FR-WHATIF) is P1 only (DEC-13). The copilot must not simulate a +10% supplier change in MVP.

**Task / Turn Orchestration**:

```
User message or Explain action
  → API loads structured engine JSON (IDs and numbers) server-side
  → Route to one specialist task, or a short sequential chain:
       validate JSON → narrate
  → Response: short narrative plus bullet figures that match the payload
```

- **Dependencies**: Engine read APIs succeed before narration. If the engine has no data, the agent says so (FR-AGT).
- **Expected outputs**: Plain narrative. Every cited number equals the attached JSON (eval: zero disagreeing numeric claims).
- **Context passing**: Explicit `Task.context` when the chain is fetch/validate then narrate. No hierarchical manager (PRD §3).
- **Error handling**: Timeout or engine failure returns a user-visible error and no partial invented cost table (FR-AGT, NFR-R2). `max_retry_limit` ≥ 2.
- **Cancellation / timeout**: Wall-clock cap **60 seconds**, then abort the kickoff and return the error envelope (documents the NFR-P4 example; operator may replace the value — SAD-Q2).
- **Performance budgets**:
  - `max_iter` ≤ 12 per task (`costing_analyst` ≤ 8).
  - `max_rpm` set at crew level in `backend.md` for budget stability (PRD §3; exact rpm is an implementation pin, not a product KPI).
  - LLM spend is on-demand only. PRD §7 bounds capstone chat to a “tens of USD” band. The hard ceiling is operator-owned and must be recorded in both `USD` and `BRL` (SAD-Q3, EC-013, ADR-14). The numeric ceilings are not set in this SAD.

**Runtime-Conditional Configuration**:

- **crewai** (selected runtime):
  - **Crew composition**: the four agents above. No manager agent.
  - **Process**: sequential.
  - **Config files**: `config/agents.yaml`, `config/tasks.yaml`, `crew.py` (or equivalent entrypoint).
  - **Controls**: `allow_delegation=false`; `memory=false`; `max_iter` ≤ 12 (≤ 8 for costing); `max_retry_limit` ≥ 2; `max_rpm` at crew level; `max_execution_time` aligned to the 60-second copilot cap.
  - **Task context chaining**: used for validate-then-narrate.
  - **Tools**: YAML-referenced read-only tools, validated before kickoff.
  - **Logging**: Prompt Trace and lifecycle events under `project-context/2.build/logs`; secrets redacted.
- **claude-agent-sdk**: not selected.
- **cursor-sdk**: not selected.

---

### 3. Frontend Architecture Specification

**Technology Stack** (from PRD and example config; framework pin deferred to `@project.mgr` `setup.md`):

| Layer | MVP choice | Trace |
| --- | --- | --- |
| App type | Responsive web (desktop-first; usable at tablet width; mobile as a stacked layout) | NFR-U1 |
| Language | TypeScript for frontend type safety | `aamad.config.example.yml` `coding_standards.type_checking` |
| Framework | Modern web framework — pin in `setup.md` | ADR-09 |
| Styling | System theme; minimal visual style; avoid modal-heavy flows | example config `ui.*`; NFR-U4 |
| State | Page/component state plus an API client cache for lists and the dashboard | Lean MVP; no offline-first store |
| i18n | English only | DEC-07 |
| Currency | One active code per deployment: `USD` (`$`) or `BRL` (`R$`). Selector in setup/config; amounts show the active symbol | ADR-07, ADR-14, SA17 |

**Application Structure**:

- **Primary navigation**: Dashboard, Materials, Recipes (cost stack and price), Inventory/Alerts, Suppliers, Customers, Purchases, Orders, Reports, Chat (PRD §6).
- **API client boundary**: the frontend epic builds UI against typed contracts. The integration epic wires the live backend.
- **Component architecture**: forms, tables, and dashboard widgets; a chat page or panel for FR-AGT; empty states that lead from the first material to the first recipe (R6).
- **Responsive / accessibility**: WCAG 2.2 AA is a goal for forms (labels, contrast, keyboard). A full audit is Future Work unless QA time remains (NFR-U3).
- **Language**: “recipe,” “unit cost,” “target margin,” “low stock” — not MRP or MES jargon (NFR-U2).

**Interface Requirements**:

- Primary interaction is master-data forms and operations tables. Copilot chat is secondary (PRD §6, MRD dim. 3).
- Human confirmation on purchases, recipe edits, order status changes, manual stock adjustments, and copying a recommended price into the list price.
- Order form: sell price defaults to the recommended price and remains editable (DEC-17).
- Zero unit cost: show recommended price as numeric 0 with the label **“n/a / zero cost”** (DEC-16).
- Costing method label on recipe and price views: “weighted average of purchases” (FR-CST, DEC-03). When no purchase exists, show that the live cost is the registered list/last price.
- Loading and error states name the SKU and the short quantity. `uom_mismatch` is a named, user-visible error. Failures are never silent (FR-ORD, DEC-06, DEC-18).
- Copilot grounding cue, for example “based on weighted-average cost as of {timestamp}.”
- Manual adjustment form: item, quantity delta or new on-hand (implementation chooses one shape in `backend.md` and keeps the API consistent), and a required reason.
- Future Work labels on any stubbed navigation item. No GL, connector, what-if, or nested-BOM UI in P0.

---

### 4. Backend Architecture Specification

**API Architecture**:

The primary surface is HTTP JSON domain APIs plus one copilot endpoint. Chat is not the only API.

| Endpoint group | Purpose | Trace |
| --- | --- | --- |
| `/auth/*` | Login and session for the single owner | FR-AUTH, DEC-09 |
| `/materials` | Register, edit, list inputs (UoM, reorder point, list/last price, optional supplier) | FR-MAT |
| `/recipes`, `/finished-products` | One-level recipe bound to one FG SKU; live cost after save | FR-FG, FR-RCP, FR-CST, DEC-12 |
| Recipe pricing sub-resource | Target margin and recommended price | FR-PRC, DEC-01, DEC-16 |
| `/inventory`, `/inventory/adjustments`, `/alerts` | On-hand, manual adjust, low-stock list | FR-INV, FR-ALT, DEC-15, DEC-19 |
| `/suppliers`, `/customers` | Parties | FR-SUP, FR-CUS |
| `/purchases` | Purchase, price history, weighted-average recalc | FR-PUR, DEC-03 |
| `/orders` and state transitions | `pending` → `in_progress` → `completed`; cancel from `pending` only | FR-ORD, DEC-05, DEC-06, DEC-17 |
| `/reports`, `/dashboard` | Product P&L and all-time ops aggregates | FR-RPT, FR-DSH, DEC-04, DEC-20 |
| `/export/csv` | Purchases, inventory on-hand, completed sales | FR-EXP, DEC-10 |
| `/copilot/chat` | Server-built engine JSON → CrewAI kickoff → narrative | FR-AGT, DEC-11 |

**Copilot contract (MVP, non-streaming)**:

- **Request**: `{ "message": string, "context": { "screen"?: string, "entity_ids"?: string[] } }`. The server loads `engine_payload`. The client does not supply the numbers the agent will cite.
- **Response**: `{ "reply": string, "citations": object, "grounding_timestamp": string, "agent": string }` or the error envelope.
- **Streaming**: deferred (ADR-05).
- **Validation**: authenticated; message length limited; notes and free-text fields sanitized and truncated before the LLM (NFR-S4, R8).
- **Rate limiting**: crew-level `max_rpm`, plus an optional per-session request throttle documented in `backend.md`.
- **Error envelope** (domain and copilot): `{ "error": { "code": string, "message": string, "details"?: object } }`. Failure responses contain no invented stock or cost tables (NFR-R2).

**Domain engine (source of truth)**:

| Concern | Rule | Trace |
| --- | --- | --- |
| Recipe shape | One production level: FG ← materials (or other registered items as inputs). Yield is explicit. `unit_cost = total material cost / yield` | DEC-12, DEC-02, PA11, FR-RCP |
| UoM | Recipe line UoM equals the material UoM. Else reject with `uom_mismatch`. No conversion | DEC-18 |
| Unit cost | Material COGS only: sum of `quantity × current_input_unit_cost`, then divide by yield. No labor, overhead, waste, or landed extras | DEC-02 |
| Input unit cost | Weighted average of recorded purchases (qty-weighted). Last purchase price is history. If no purchases exist, use the registered list/last price. FIFO deferred | DEC-03 |
| Recommended price | `recommended_sell_price = unit_cost / (1 − target_margin)` with `0 ≤ target_margin < 1`. Reject margin ≥ 100%. If `unit_cost` is 0, return numeric **0** | DEC-01, DEC-16 |
| List price | Stored separately from the recommendation. Copying the recommendation into the list price is a human action | FR-PRC |
| Produce | `pending` → `in_progress`: consume RM per recipe × order qty; increment FG by order qty. `pending` has no stock effect | DEC-05 |
| Ship | `in_progress` → `completed`: decrement FG by order qty; write immutable cost-at-sale, sell price, and revenue fields | DEC-04, DEC-05, NFR-R3 |
| Cancel | Allowed from `pending` only in P0. Later-state reversal is FR-CANCEL (P1) | FR-ORD |
| Blocks | Block `in_progress` if any RM on-hand would go negative. Block `completed` if FG on-hand would go negative. Name the short SKUs in `details` | DEC-06 |
| Order sell price | Default to the current recommended price; user override allowed; reports use the stored actual sell price | DEC-17, PA12 |
| Margin report | For completed orders only: `revenue = qty × sell_price`; `cogs = qty × cost_at_sale`; `profit = revenue − cogs`; `margin_pct = profit / revenue` when revenue > 0. Show target vs actual when a target is stored on the SKU | FR-RPT, DEC-04 |
| Suggested reorder | Advisory only: `suggested_reorder_qty = max(0, (2 × reorder_point) − on_hand)`. Not ML. Not an auto-PO | DEC-19, FR-ALT |
| Manual adjust | P0 required. Reason required. Append an audit-log row. Resulting on-hand must not go negative | DEC-15, DEC-06, FR-INV |
| Dashboard period | All-time. No date-range filter in P0 | DEC-20 |
| Alerts | An alert exists if and only if on-hand ≤ reorder point | NFR-A2, FR-ALT |

All produce, ship, purchase, and adjustment writes run in a single database transaction (NFR-R1, R7).

**CSV column contract (P0, FR-EXP)**:

UTF-8, header row, no secrets. Three files, or one zip of the three. Column order:

| File | Columns |
| --- | --- |
| `purchases.csv` | `purchase_id`, `date`, `supplier_name`, `material_sku`, `material_name`, `qty`, `uom`, `unit_price`, `line_total`, `currency_code` |
| `inventory.csv` | `item_type` (`RM` or `FG`), `sku`, `name`, `uom`, `on_hand`, `reorder_point`, `unit_cost`, `currency_code` |
| `completed_sales.csv` | `order_id`, `completed_at`, `customer_name`, `fg_sku`, `fg_name`, `qty`, `sell_price`, `cost_at_sale`, `revenue`, `cogs`, `profit`, `margin_pct`, `currency_code` |

`inventory.unit_cost` is the weighted-average cost, or the list/last price when no purchase exists (DEC-03).

**Data Architecture** (required for MVP):

Relational database, Postgres or equivalent (PRD §3). One location. No lots or warehouses (DEC-07, A6). Every money amount uses the single deployment currency (`USD` or `BRL`). There is no exchange-rate table in P0 (ADR-14).

| Entity | MVP responsibility |
| --- | --- |
| User | Single owner credential; password stored only as a hash |
| Supplier, Customer | Name required; contact fields optional |
| Material | SKU, name, UoM, reorder point ≥ 0, optional supplier, list/last price |
| FinishedProduct | SKU, name, output unit, reorder point; bound to one recipe |
| Recipe, RecipeLine | Yield > 0; lines with material, quantity > 0, UoM equal to the material |
| Purchase, PriceHistory | Qty > 0, unit price ≥ 0, date; completing a purchase increments RM and appends history |
| InventoryMovement | Opening, purchase, produce, ship, manual adjust; on-hand is the sum of movements |
| Order | Customer, FG, qty > 0, actual sell price, state |
| CostAtSale | Written once on `completed`; never rewritten (NFR-R3) |
| AuditLog | Manual adjustments: who, when, item, delta, reason, resulting on-hand |

**Runtime Integration Layer**:

- The copilot HTTP handler authenticates, loads a read-only engine snapshot, binds CrewAI tools to that snapshot, and calls `crew.kickoff()` with the user message plus context.
- Agent and task definitions live in YAML under `config/`. Secrets come from the environment.
- Prompt Trace and lifecycle logs go to `project-context/2.build/logs` when the backend is implemented. Redact secrets (adapter-crewai).
- Agents have no tool that creates or updates inventory, orders, prices, or recipes (NFR-S3).

**Authentication & Secrets**:

| Env var (names only) | Purpose |
| --- | --- |
| `OPENAI_API_KEY` or the org gateway variable named in `.env.example` | LLM provider |
| `DATABASE_URL` | Database connection |
| `SECRET_KEY` | Session or token signing |
| `CURRENCY_CODE` | `USD` or `BRL`. Reject any other value at startup |
| `AAMAD_TARGET_RUNTIME` | Optional override; unset resolves to `crewai` |

- `.env.example` lists names only (NFR-S1). This artifact contains no secret values.
- Password hashing uses the selected Python web framework’s standard password hasher. Plaintext passwords are never stored or logged (FR-AUTH).
- Display symbol follows `CURRENCY_CODE`: `USD` → `$`, `BRL` → `R$`. The symbol is configuration, not a secret (ADR-14).

---

### 5. DevOps & Deployment Architecture

**CI/CD** (minimal MVP): lint, test, and build for the Python API and the web frontend. Deliver generates pipeline config. Live deploys stay unauthorized until the operator says otherwise.

**Hosting**: developer laptop or one small VM. Docker Compose services: `web`, `api`, `db`. Health check: `GET /health` on the API, including database connectivity when practical.

**Deferred**: infrastructure-as-code beyond Compose, multi-region, autoscaling, advanced APM, production backups, high availability (NFR-R4, NFR-R5, NFR-R6).

**Observability** (baseline):

- Request logs, inventory mutation ids, order transitions, crew start/stop, costing inputs and outputs with secrets removed.
- Crew traces under `project-context/2.build/logs`.
- Document local-run data-loss risk. Production backups are Future Work unless the deployment leaves the demo (PRD §3).

**Security gate**: `@security.eng` writes `project-context/2.build/security.md` before Deliver. Example config sets `security.require_security_assessment: true` (NFR-S5, NFR-S6).

---

### 6. Data Flow & Integration Architecture

**Write path (human-confirmed, engine-owned)**:

```
UI form or action → AuthN → Domain API → one DB transaction
  → movements, weighted-average recalc, or order state
  → JSON response → UI
```

Agents are not on the write path (DEC-11).

**Order transition path**:

```
pending (no stock effect; cancel allowed)
  → in_progress (produce: −RM, +FG) — blocked if any RM would go negative
  → completed (ship: −FG, snapshot cost-at-sale) — blocked if FG would go negative
```

**Read and dashboard path**:

```
UI → Domain API aggregates (all-time) → DB → JSON → widgets
```

**Copilot path**:

```
UI chat or Explain → AuthN → Copilot API
  → engine read model (authoritative JSON)
  → CrewAI sequential narrate task
  → narrative → UI
```

**External integrations (MVP only)**:

| Integration | MVP | Deferred |
| --- | --- | --- |
| Postgres (or equivalent) | Required | — |
| LLM provider | Environment-based | — |
| CSV export | Required (DEC-10, FR-EXP) | CSV import is FR-CSV-IN (P1) |
| QBO / Xero | No | P2 |
| Email / SMS alerts | In-app alerts are sufficient | External notify |
| Shopify, WhatsApp, barcode, payments | No | A20 / P2 |

**Error propagation**: validation and stock blockers return the error envelope with SKU-level `details`. Copilot or engine failure shows an error and never shows model-invented stock (NFR-R2).

---

### 7. Performance & Scalability Specifications

| ID | Target | Trace |
| --- | --- | --- |
| NFR-P1 | Recipe cost and recommended price API ≤ 500 ms p95 locally, excluding the LLM | PRD §5 |
| NFR-P2 | Dashboard aggregate ≤ 1 s p95 at ≤ 200 SKUs and ≤ 2,000 movements | PRD §5 |
| NFR-P3 | Order state transition ≤ 1 s p95, inside a transaction | PRD §5; NFR-R1 |
| NFR-P4 | Copilot completes or errors within a **60 s** wall-clock cap | PRD §5 example; ADR-05; SAD-Q2 |
| NFR-P5 | One interactive user | DEC-09 |

- **Scaling path**: one instance (NFR-R4). Stock correctness outranks throughput (PRD §3).
- **Token and cost controls**: on-demand kickoff, iteration cap, crew `max_rpm`, and the 60-second timeout. The dashboard does not call the crew (DEC-13).
- **Availability**: local run is documented. No 99.9% SLA for the capstone (NFR-R5). Recovery is restart the app and the database (NFR-R6).

---

### 8. Security & Compliance Architecture

| Control | MVP approach | Trace |
| --- | --- | --- |
| AuthN | Session or token for the single owner; every mutating API requires authentication | FR-AUTH, NFR-S2, DEC-09 |
| AuthZ | Single user; no RBAC | DEC-09, Q5 |
| Secrets | Environment variables only; no secrets in git | NFR-S1 |
| Agent boundary | No inventory, order, price, or recipe mutation tools | NFR-S3, DEC-11, R3 |
| Prompt injection | Order and customer notes are data. Truncate and sanitize them. Do not treat them as system instructions | NFR-S4, R8 |
| Transport | TLS when the app is reached beyond localhost | PRD §3 |
| Input validation | Server-side on every write: quantities, margin bounds, UoM match, non-negative stock, required adjustment reason | FR-* ; DEC-06, DEC-15, DEC-18 |
| PCI | Out of scope; no card data | NFR-S8, A20 |
| GDPR / LGPD | Not claimed until Q1. The demo should avoid real personal data | NFR-S7, R4 |
| Assessment | Security assessment before Deliver | NFR-S5 |
| Dependencies | Audit during the security and Deliver epics | NFR-S6 |

Tax, food lots, and allergen rules stay deferred (DEC-07, DEC-08, Q1, Q2, A20).

---

### 9. Testing & Quality Assurance Specifications

- **Unit**: costing goldens (DEC-01, DEC-02, DEC-03, DEC-16), UoM rejection (DEC-18), purchase weighted-average, inventory transitions (DEC-05, DEC-06), manual adjust (DEC-15), alert predicate (NFR-A2), immutable cost-at-sale (DEC-04, NFR-R3).
- **Integration**: authenticated mutating APIs, order state machine including pending-only cancel, CSV column contract, copilot against fixture JSON with write probes that must fail.
- **Smoke / acceptance**: scripted loop — material → recipe → recommended price → purchase → order at the default price → `in_progress` → `completed` → dashboard matches reports (PRD §7).
- **Runtime**: `crew.kickoff()` succeeds on a read-only snapshot; task output cites only payload numbers; Prompt Trace contains no secrets.
- **Security**: `@security.eng` before Deliver (NFR-S5).

**Evaluation Criteria**:

Thresholds come from PRD §5 and §7 or from a locked DEC formula. Where the PRD states a band and not a hard ceiling, the cell is **TBD** and the question is in Open Questions.

| ID | Dimension | Metric | Threshold | Grading Method | Source |
|----|-----------|--------|-----------|-----------------|--------|
| EC-001 | Accuracy | Golden recipes match material unit cost and contribution % | 100% match | Code-based | NFR-A1; DEC-02; DEC-03; PRD §7 |
| EC-002 | Accuracy | Recommended price matches `unit_cost / (1 − target_margin)`; margin ≥ 100% rejected | 100% match | Code-based | DEC-01; FR-PRC |
| EC-003 | Accuracy | Alert exists iff on-hand ≤ reorder point | 100% on fixtures | Code-based | NFR-A2 |
| EC-004 | Accuracy | Produce and ship match DEC-05; on-hand never goes negative | 100% on fixtures | Code-based | NFR-A3; DEC-05; DEC-06 |
| EC-005 | Accuracy | Agent numeric claims that disagree with the attached engine JSON | 0 in the eval set | Code parse of cited numbers; LLM judge for the narrative | FR-AGT; PRD §7 |
| EC-006 | Latency | Recipe cost and recommended price API p95, excluding LLM | ≤ 500 ms local | Code-based | NFR-P1 |
| EC-007 | Latency | Dashboard aggregate p95 at demo volume | ≤ 1 s | Code-based | NFR-P2 |
| EC-008 | Latency | Order state transition p95 | ≤ 1 s | Code-based | NFR-P3 |
| EC-009 | Latency | Copilot wall-clock until reply or error | ≤ 60 s; timeout returns an error | Code-based | NFR-P4; ADR-05 |
| EC-010 | Safety | Mutations of inventory, orders, prices, or recipes through agent tools | 0 successes | Code-based | NFR-S3; DEC-11; R3 |
| EC-011 | Safety | Notes injected as instructions change system behavior or trigger writes | 0 policy violations on the fixture set | Human plus LLM judge | NFR-S4; R8 |
| EC-012 | Security | Secrets in the repo or in Prompt Trace samples | 0 leaks | Code-based or human review | NFR-S1 |
| EC-013 | Cost | Capstone LLM spend for on-demand chat, recorded in `USD` and in `BRL` | TBD — PRD band is “tens of USD”; operator sets both numeric ceilings. No rate is assumed here | Human or billing export | PRD §7; SAD-Q3; ADR-14 |
| EC-014 | Accuracy | Time to first costed SKU on a 5-line sample recipe | < 30 minutes, same session | Human scripted | PRD §7; R6 |
| EC-015 | Accuracy | Scripted ops loop; dashboard matches reports, inventory, and orders | Pass | Human scripted | PRD §7 |
| EC-016 | Accuracy | UoM mismatch returns `uom_mismatch` and does not convert | 100% on fixtures | Code-based | DEC-18; FR-RCP |
| EC-017 | Accuracy | Unit cost 0 yields recommended price numeric 0 | 100% on fixtures | Code-based | DEC-16 |
| EC-018 | Accuracy | Manual adjust requires a reason, writes an audit row, and cannot drive on-hand negative | 100% on fixtures | Code-based | DEC-15; DEC-06 |
| EC-019 | Accuracy | Completed-order cost-at-sale unchanged after later purchase or recipe edits | 100% on fixtures | Code-based | DEC-04; NFR-R3 |
| EC-020 | Accuracy | New order defaults sell price to recommended; reports use the stored actual price after override | 100% on fixtures | Code-based | DEC-17; PA12 |

`@qa.eng` `*run-evals` implements this table (golden data, graders, `evals.md`). This SAD does not design the golden dataset or the judge rubric.

---

### 10. MVP Launch & Feedback Strategy

- **Capstone (in scope)**: local or Compose demo of the maker ops loop plus grounded explanations (PRD §9). Audience: instructors and demo users.
- **Commercial go-to-market**: out of MVP. The USD 15–80/month band is an unvalidated inference (A14, A15). No novelty or patent claim (R12, A11).
- **Demo criteria**: a trustworthy costed SKU in the first session; actual vs target margin after at least one completed order; alerts respected on the demo script; dashboard usable as the weekly loop (PRD §1, §7).
- **Success metrics**: EC-001–EC-020 and the PRD §7 tables. Weekly active dashboard use and willingness-to-pay are not capstone pass/fail metrics.
- **Pitch figures**: Mordor TAM (S4) and SAM (S5) only (DEC-14, Q8, R9).
- **After the first demo, fix in this order**: grounding or eval failures; inventory invariant bugs (R7); time-to-first-SKU friction (R6, then P1 CSV import); chat depth only if Q7 changes the grading weight (R13).

---

## Implementation Guidance for AI Development Agents

1. Foundation setup (`@project.mgr`, `setup.md`) — pin the frontend framework, Python version, Compose services, and `.env.example` names.
2. Module 1 — CrewAI YAML and a kickoff that narrates a fixture JSON snapshot. No write tools.
3. Module 2 — domain API and transactional engine (costing, inventory, orders, CSV). The engine is the source of truth the crew will later read.
4. Module 3 — frontend forms, tables, dashboard, and chat shell against the contracts in §3 and §4.
5. Module 4 — integration, then QA (unit, integration, smoke, and §9 evals).
6. Security assessment (`security.md`), then Deliver (`deploy.md`, user guide). Deliver does not change application logic.

Run each build module in its own session. Do not implement P1 or P2 items while closing P0.

---

## Architecture Validation Checklist

- [x] PRD requirements mapped to architectural components
- [x] Agents designed for the domain and the selected runtime
- [x] Frontend and backend contracts agree on schemas and on non-streaming copilot I/O
- [x] Secrets via environment variable names only
- [x] MVP vs P1 vs Future Work boundaries explicit
- [x] Resolved `AAMAD_TARGET_RUNTIME` recorded in Audit

---

## Sources

| ID | Source |
| --- | --- |
| PRD | `project-context/1.define/prd.md` (FR-*, NFR-*, DEC-01–DEC-20, PA-*) |
| MRD | `project-context/1.define/mrd.md` (P1–P3, R1–R13, A1–A20, Q1–Q9, S1–S26, operator concept S25) |
| Template | `.cursor/templates/sad-template.md` |
| Persona | `.cursor/agents/system-arch.md` |
| Adapter | `.cursor/rules/adapter-crewai.mdc`, `.cursor/rules/adapter-registry.mdc` |
| Core | `.cursor/rules/aamad-core.mdc`, `.cursor/rules/development-workflow.mdc`, `.cursor/rules/delivery-workflow.mdc` |
| Config | `aamad.config.example.yml` (`aamad.config.yml` absent) |
| User stories | Absent |
| S25 | Operator product concept, cited by the PRD and MRD |
| S26 | AAMAD templates, agents, example config, and `AGENTS.md`, cited by the PRD |

No new market figures were introduced in this SAD. No file named `srd.md` exists in the repository; market context was taken from `mrd.md`.

---

## Assumptions

| ID | Assumption | If false |
| --- | --- | --- |
| SA1 | `AAMAD_TARGET_RUNTIME` is unset in this session, so the resolved runtime is `crewai` (PRD Metadata, adapter-registry default, example config `runtime.target`, PA3, A3, Q9) | Rework agent YAML for the new adapter; DEC-* stay in force |
| SA2 | Honor `aamad.config.example.yml` until `aamad.config.yml` exists (PA2, PRD-Q12) | Reload preferences at Build |
| SA3 | PRD `FR-*` stories are sufficient; a `user-stories/` directory is not required to author this SAD | Optional `*create-stories` later |
| SA4 | When unit cost is 0, the API returns recommended price numeric 0 and the UI shows “n/a / zero cost” (DEC-16) | Change the API and UI contract |
| SA5 | Suggested reorder quantity is `max(0, (2 × reorder_point) − on_hand)` (DEC-19, PA15) | Operator overrides the formula |
| SA6 | Dashboard default period is all-time (DEC-20, ADR-10) | Add a date-range epic |
| SA7 | Copilot MVP is non-streaming, with a 60-second hard cap taken from the PRD’s NFR-P4 example | Streaming epic, or a different timeout if the operator answers SAD-Q2 |
| SA8 | Frontend framework vendor is chosen in `setup.md`; this SAD requires a responsive TypeScript web app only (ADR-09) | Follow a later PRD stack mandate |
| SA9 | Manual inventory adjustment is **required in P0** (DEC-15): reason, audit log, no negative result. Opening stock may come from the first purchase and/or an adjustment (PA13) | Only if a stakeholder overrides DEC-15 |
| SA10 | Capstone values the domain engine and the agents together (PA9, Q7). Chat is P0; what-if is not | Shrink or grow FR-AGT |
| SA11 | MRD A1–A20 still apply where DEC-* / PA-* do not supersede them. A7 is superseded for P0 by DEC-12. A17 is superseded by DEC-05 | Reconcile any remaining conflict under Open Questions |
| SA12 | Order sell price defaults to the recommended price and may be overridden; reports use the actual stored price (DEC-17, PA12) | Recommended-price-only orders |
| SA13 | UoM mismatch is a hard reject (`uom_mismatch`) with no silent conversion (DEC-18) | Only if FR-UOM is promoted into P0 |
| SA14 | Supplier +10% what-if is P1 only (DEC-13, PA19) and is outside the P0 copilot | Promote FR-WHATIF later |
| SA15 | CSV files use the FR-EXP column order and names exactly | Bookkeeper handoff breaks if columns drift |
| SA16 | Postgres is the Compose default; another relational engine is acceptable if `setup.md` records it (SAD-Q4) | Repin the data service |
| SA17 | Operator override (2026-10-05): the MVP supports Brazilian Real and US Dollar. One active currency per deployment (`BRL` or `USD`). No FX conversion and no document that mixes the two. PRD DEC-07 still says one currency with default code `USD`; `@product-mgr` should sync that sentence. The LLM spend ceiling is stated in both currencies; the amounts stay operator-owned (SAD-Q3) | If the same deployment must hold BRL and USD together, that is the deferred FX epic (SAD-Q5), not this override |

---

## Open Questions

Build may proceed on DEC-* and the assumptions above.

| ID | Question | Blocks | Notes |
| --- | --- | --- | --- |
| Q1 | Country, language, and tax for a real launch? | LGPD/GDPR, food rules, copy | Currency support is answered: `BRL` and `USD`, one active code per deployment (SA17). Tax and locale remain open |
| Q2 | One vertical for commercial go-to-market? | Lots, expiry, allergens | Generic makers (DEC-08) |
| Q5 | Multi-user in the MVP? | Auth and RBAC | Locked no (DEC-09) unless overridden |
| Q6 | Accounting API or CSV? | Connector epic | CSV locked (DEC-10) |
| Q7 | Capstone grading weight: agents, domain, or both? | Chat depth | Assumed both (PA9, SA10) |
| Q9 | Runtime other than crewai? | Adapter files | Resolved `crewai` in this SAD |
| PRD-Q10 | May an order skip `in_progress`? | Order UX | Locked no for P0 |
| PRD-Q11 | Manual inventory adjustments in P0? | Opening balances | **Locked yes** (DEC-15, SA9) |
| PRD-Q12 | Copy the example config to `aamad.config.yml`? | Config keys at Build | Recommended; not done here |
| SAD-Q1 | Which frontend framework should `setup.md` pin? | setup.md | PRD is silent; operator preference |
| SAD-Q2 | Keep the copilot hard timeout at 60 seconds? | EC-009 | PRD gives 60 s as the example; confirm or replace |
| SAD-Q3 | What hard ceilings apply to capstone LLM spend in `USD` and in `BRL`? | EC-013 | Both currencies are required (SA17). The PRD only states a “tens of USD” band, so neither number is set here |
| SAD-Q4 | Postgres, or another relational engine, as the Compose default? | setup.md | PRD allows an equivalent |
| SAD-Q5 | Must one deployment store BRL and USD at the same time? | FX epic | Current architecture is one active currency, switchable between `BRL` and `USD` (ADR-14). Simultaneous use needs an exchange rate and is still P2 |

---

## Audit

| Field | Value |
| --- | --- |
| Timestamp | 2026-10-05T15:05:00-03:00 |
| Persona id | `system-arch` |
| Action | `create-sad --mvp` |
| Resolved `AAMAD_TARGET_RUNTIME` | `crewai` |
| Runtime resolution | Environment variable unset in this session. PRD Metadata, adapter-registry default, and example config `runtime.target: crewai` agree (SA1) |
| Prompt trace | Operator instruction 2026-10-05: currency support must include Brazilian Real and US Dollar, including the LLM spend ceiling. Recorded as SA17 / ADR-07 / ADR-14. Numeric ceilings were not supplied and were not invented. PRD DEC-07 remains the written product default until `@product-mgr` syncs it |
| Output path | `project-context/1.define/sad.md` (Define-phase architecture artifact; Build personas read this path) |
| Tools | Read PRD, MRD, template, example config; write this file |
| Temperature / determinism | N/A (artifact authoring in the IDE) |
| Handoff | `@project.mgr` `*setup-project`. Optional `@product.mgr` `*create-stories`. Feature SFS on demand via `*create-sfs` |
