# Product Requirements Document — BusinessFlow

Mini ERP for small and medium entrepreneurs (makers).

## How to use this file (context as code)

- Treat headings, requirement IDs, and tables as the contract. Do not invent IDs.
- Cite this PRD (`FR-*`, `NFR-*`, `DEC-01`–`DEC-20`, `PA-*`) plus MRD `P1`–`P3`, `R1`–`R13`, `A1`–`A20`, `Q1`–`Q9`, `S1`–`S26`.
- Prefer tables for comparisons; bullets for lists; one idea per bullet.
- Evidence lives in [Sources](#sources). Inferences live in [Assumptions](#assumptions). Unresolved items live in [Open questions](#open-questions).
- Canonical product sections: [1. Executive summary](#1-executive-summary), [4. Functional requirements](#4-functional-requirements), [5. Non-functional requirements](#5-non-functional-requirements), [7. Success metrics and KPIs](#7-success-metrics--kpis).

### Index

| ID / section | Use for |
| --- | --- |
| [Metadata](#metadata) | Runtime, brand, artifact pointers |
| [Product decisions](#product-decisions-locked-for-mvp) | Locked Q3/Q4 formulas and inventory |
| [1. Executive summary](#1-executive-summary) | Problem, solution, rationale |
| [2. Market context and user analysis](#2-market-context--user-analysis) | Personas, journey, competition |
| [3. Technical requirements](#3-technical-requirements--architecture) | Agents, integrations, infra |
| [4. Functional requirements](#4-functional-requirements) | P0/P1/P2 features |
| [5. Non-functional requirements](#5-non-functional-requirements) | Perf, security, reliability |
| [6. User experience design](#6-user-experience-design) | UI and agent interaction |
| [7. Success metrics and KPIs](#7-success-metrics--kpis) | Product and eval targets |
| [8. Implementation strategy](#8-implementation-strategy) | Phases, risks, resources |
| [9. Launch and go-to-market](#9-launch--go-to-market-strategy) | Capstone demo vs commercial |
| [Quality checklist](#quality-assurance-checklist) | Gate for handoff |
| [Sources](#sources) / [Assumptions](#assumptions) / [Open questions](#open-questions) / [Audit](#audit) | Provenance |

### Playbook — downstream agents

| Field | Value |
| --- | --- |
| Purpose | Hand off MVP product contract without re-deriving market research |
| Inputs | This file; `project-context/1.define/mrd.md`; operator concept (S25) |
| Next file | SAD via `@system.arch`; optional stories via `@product-mgr` `*create-stories` |
| Do | Implement P0 modules only; costing/inventory as deterministic services; agents narrate validated JSON (R3); honor DEC-01–DEC-20 |
| Do not | Native GL/tax/MES/auto-PO/connectors (A20); LLM write to stock; blend Mordor/MRFR TAM (R9); nested BOM or what-if in P0 |

---

## Metadata

| Key | Value |
| --- | --- |
| product_name | BusinessFlow |
| product_type | Mini ERP (recipe costing + ops; not full ERP) |
| audience | Small and medium entrepreneurs who make products (P1 primary) |
| artifact | `project-context/1.define/prd.md` |
| persona | `product-mgr` |
| action | `create-prd` |
| runtime | `crewai` (resolved) |
| runtime_note | Implementation choice for MVP, not AAMAD methodology; product definition is runtime-agnostic |
| config | `aamad.config.yml` absent; honor `aamad.config.example.yml` preferences |
| env | `AAMAD_TARGET_RUNTIME` unset → default `crewai` (A3, Q9) |
| language | Python primary (example config) |
| ui | Theme `system`; visual style `minimal`; prefer_modals `false` |
| security_gate | `require_security_assessment: true` in example config |
| mrd | Present; not skipped |
| system_description | Absent; S25 + MRD operator concept used |

---

## Product decisions locked for MVP

These close MRD items the market document deferred to the PRD. Architects must implement these unless a stakeholder overrides an Open Question.

| ID | Topic | Decision | Closes / related |
| --- | --- | --- | --- |
| DEC-01 | Price formula | **Margin on selling price**, not markup on cost. `recommended_sell_price = unit_cost / (1 − target_margin)` where `0 ≤ target_margin < 1`. UI labels “target margin % of sell price”. Reject margin ≥ 100%. | Q3, A16, R1 |
| DEC-02 | Unit cost composition | v1 unit cost = **material COGS only**: sum over recipe lines of `quantity × current_input_unit_cost`. No labor, overhead, waste %, packaging-as-labor, or landed extras in v1. | Q3 |
| DEC-03 | Input unit cost method | **Weighted average** from recorded purchases (qty-weighted). Last purchase price is stored and shown as history, not used as the live recipe cost unless no purchases exist (then use registered list/last price). FIFO/lots deferred. | MRD dim. 2 |
| DEC-04 | Cost vs sale | **Current recipe cost** is always live from DEC-03. **Cost at sale** is a snapshot written when an order reaches `completed`. Margin actual vs target uses cost at sale, never silently rewritten. | R1 |
| DEC-05 | Inventory on order | **Make-to-stock-capable, two-step:** (1) Transition `pending` → `in_progress` **produces**: consume RM per recipe × order qty; increment FG by order qty. (2) Transition `in_progress` → `completed` **ships**: decrement FG by order qty; write cost-at-sale and revenue. `pending` has no stock effect. **Supersedes MRD A17** (A17’s single-step complete consume is obsolete). | Q4, A17, R7 |
| DEC-06 | Blocking rules | Block `in_progress` if any RM on-hand would go negative. Block `completed` if FG on-hand would go negative. No silent negative stock. | R7 |
| DEC-07 | Geography | Capstone **locale-neutral**: UI English; **one currency** (default code `USD`, display symbol from config); no tax engine; no food-lot/allergen rules. Compliance treated as demo PII minimization until Q1 is answered for a real launch. | Q1, Q2, R4, A9 |
| DEC-08 | Vertical | **Generic makers** (food, cosmetics, crafts, light assembly) with the same recipe model. No vertical-specific fields in MVP. | Q2 |
| DEC-09 | Users | **Owner-primary, single authenticated user per deployment** (one login). No RBAC, no multi-tenant SaaS in MVP. | Q5, A6 |
| DEC-10 | Accounting | **CSV export** of purchases, inventory on-hand, and completed sales. No QBO/Xero connector in MVP. | Q6, P3, A20 |
| DEC-11 | Agents vs engine | Application services own all numeric writes. CrewAI agents **read** costing/inventory/order JSON and explain; they have **no inventory write tools**. | R3, A8 |
| DEC-12 | BOM depth | Recipes are **one production level**: FG ← materials (and optionally other registered items treated as inputs). Nested recipes (FG used as input to another FG) **out of P0** (P1 = FR-BOM2). **Supersedes MRD A7 for P0** (A7’s “1–2 levels” applies only if FR-BOM2 is pulled in). | A7 |
| DEC-13 | Chat | Copilot chat is **P0** for “why this cost / what is low stock / order pipeline,” bounded (not on every widget). Persist-free supplier what-if (+10%) is **P1 only** (FR-WHATIF) — not conditional P0. | S25, Q7 |
| DEC-14 | Market slides | Pitch uses Mordor TAM S4 and SAM S5 only. | Q8, R9 |
| DEC-15 | Manual inventory adjust | **P0 required**: owner may adjust RM/FG on-hand with **reason required** and audit log. Primary path for opening balances alongside first purchase (PA13). Closes PRD-Q11. | PRD-Q11, PA13, FR-INV |
| DEC-16 | Zero unit cost price | If unit cost is 0, recommended sell price API returns numeric **0**; UI shows label **“n/a / zero cost”** (not a blank or alternate sentinel). | FR-PRC |
| DEC-17 | Order default sell price | New order defaults sell price to **recommended** price (FR-PRC); user may override. Reports always use the order’s actual sell price (PA12). | FR-ORD, PA12 |
| DEC-18 | UoM mismatch | Recipe line UoM **must equal** the material’s UoM. On mismatch, API/UI **reject** with a named error (`uom_mismatch`); no silent conversion in P0 (FR-UOM is P1). | FR-RCP, FR-UOM |
| DEC-19 | Reorder suggestion | Advisory only: `suggested_reorder_qty = max(0, (2 × reorder_point) − on_hand)`. Not ML; not an auto-PO. | FR-ALT, PA15 |
| DEC-20 | Dashboard period | MVP dashboard aggregates default to **all-time** (no date-range filter required in P0). | FR-DSH, PA14 |

---

## 1. Executive summary

### Problem statement

Small and medium **makers** (typically 1–50 people; design center **P1**, 1–10) transform raw materials into finished goods. Today they run recipes, purchase prices, stock, and orders in disconnected spreadsheets, chats, and a separate invoicing tool (MRD problem statement, S25).

They cannot see in one place:

- True **unit cost by recipe**, including each material’s contribution.
- A **recommended selling price** from a desired profit margin.
- **On-hand stock** of inputs and finished goods, with warning before stockouts.
- **Order progress** (pending / in progress / completed).

Impact (use as analog, not BusinessFlow error rates): spreadsheet error prevalence is widely reported as very high (S15); retail inventory distortion is a large industry analog (S13–S14, A12). Qualitatively: underpricing after supplier increases, overpricing from guesswork, promising orders the materials cannot support, and hours reconciling files.

Target market for product design: owner-operators who **make** things. Not pure resellers (NP1), not corporate controllers (NP2), not MES plant managers (NP3).

Envelope (do not blend series): SMB software TAM USD 77.33B (2026) (S4); SMB cloud ERP SAM USD 49.42B (2026) (S5). Numeric SOM is not estimated (A10).

### Solution overview

BusinessFlow is a **mini-ERP**: master data (materials, recipes, suppliers, customers), deterministic **costing and pricing**, dual inventory with **low-stock alerts**, **purchases with price history**, **three-state orders**, **product P&L**, and an **ops dashboard**. An optional **multi-agent copilot** explains engine outputs in natural language.

**Unique value:** start from recipe cost and margin, not from the general ledger. Win on time-to-first-costed-SKU, contribution-by-input, and margin-based recommended price (MRD positioning).

**Differentiators vs alternatives:**

| vs | Win | Do not compete on |
| --- | --- | --- |
| Spreadsheets | Alerts, statuses, one source of truth, grounded explanations | Zero data-entry cost (R6) |
| QBO / Xero / Wave | Recipe roll-up and recommended price | Accounting completeness (A20) |
| Stocksmith | Simpler ops+order loop; agent explanations of validated numbers | Mature commerce/tax COGS story (R5) |
| Katana | Price, simplicity, first-session costing | MRP depth, omnichannel (R2) |
| Odoo Mfg | Self-serve, no partner project | Module breadth, localization |

**Outcomes and success (MVP):** first trustworthy costed SKU in the first session; actual vs target margin visible by product using cost-at-sale; fewer blocked orders due to unseen stockouts; dashboard used as the weekly ops loop. Metrics in [§7](#7-success-metrics--kpis).

### Strategic rationale

**Why multi-agent:** the weekly loop is several specialist jobs (cost explanation, stock/reorder narrative, order pipeline, KPI digest). A sequential specialist crew matches that decomposition. Agents are **not** optimal as the ledger: numbers must be reproducible (R3). Therefore the product is **hybrid**: deterministic domain engine + advisory crew.

**Business / operational value (capstone):** demonstrate a complete maker ops loop plus grounded AI. Commercial hypothesis (post-capstone, A14): USD 15–80/month or freemium vs Katana from USD 299/month (S17) and Odoo manufacturing implementation often USD 8k–40k (S22–S23).

**Timing:** cloud already 72.56% of SMB software (S4); embedded AI is a cited cloud-ERP driver (S5). Fragmentation (~9 tools; 66% integration pain) favors a focused mini-ERP over another accounting module (S4).

---

## 2. Market context & user analysis

### Target market / users

| ID | Name | MVP priority | Characteristics |
| --- | --- | --- | --- |
| P1 | Maker / artisan | **Primary** | Owner who cooks, mixes, crafts, or assembles in small batches; system of record is the owner; phone + laptop; distrusts “ERP” branding; local language likely (Q1 unresolved for commercial). |
| P2 | Light manufacturer | Secondary | Founder-led, 10–50; will trial if simpler than Katana/Odoo; do not over-serve with full MRP (R2). |
| P3 | Bookkeeper-owner | Influencer | Needs export, not a second GL. |

**Market size:** see MRD TAM/SAM tables. Geographic focus for **commercial** GTM is open (Q1). For **capstone**, DEC-07.

**Expansion (not MVP):** additional locales, P2 multi-user, connectors.

### User needs analysis

**Critical pain points (P1):**

- Recipe cost is a guess.
- Supplier increases do not flow into sell price.
- Stock lives in a notebook.
- No pending vs completed orders.

**Jobs to be done:** when an input price or recipe changes, get the new unit cost, a margin-based price, and whether the next order can be fulfilled — without an implementer.

**User journey (happy path, weekly ops loop):**

1. Sign up / log in (DEC-09).
2. Register suppliers and raw materials (unit of measure, reorder point, initial/list price).
3. Create recipe: inputs + quantities → finished product SKU.
4. Review contribution cost stack and recommended price (DEC-01–DEC-03).
5. Record purchase (price history + RM stock increment; WA cost update).
6. Register customer; create order (`pending`).
7. Move to `in_progress` (produce: DEC-05) then `completed` (ship + snapshot: DEC-04).
8. Dashboard: revenue, costs, margins, low stock, pipeline.
9. Optional copilot: grounded explanations (P0). Supplier what-if is P1 (DEC-13).

**Adoption barriers:** data entry of materials and recipes (R6); ERP-sounding language; distrust of AI numbers (R3).

**Success factors:** first costed SKU in-session; labels that say “recipe” not “MRP explosion”; HITL on all writes; agents cite engine figures.

### Competitive landscape

Feature comparison and competitor catalog are canonical in the MRD. PRD non-goals match A20. Intended BusinessFlow MVP row: all operator-concept capabilities **Y**, GL/tax **N**, commerce connectors **N**, grounded NL explanation **Y**.

---

## 3. Technical requirements & architecture

Product constraints for `@system.arch`. Runtime field names below are **CrewAI-shaped** because resolved runtime is `crewai`; SAD may rename per adapter if runtime changes (R11).

### Runtime & agent specifications

| Control | MVP value |
| --- | --- |
| Process | Sequential |
| Delegation | `allow_delegation=false` |
| Memory | `false` (reproducibility) |
| `max_iter` | ≤ 12 per task |
| `max_retry_limit` | ≥ 2 |
| `max_rpm` | Set at crew level (SAD/backend) |
| Tools | Least privilege; **no** stock/order mutation tools |
| Kickoff | User-initiated chat or “explain this screen”; not on every keystroke |

**Collaboration:** coordinator/user message → costing **or** inventory **or** orders **or** insights task (or short sequential chain: fetch JSON → narrate). No hierarchical manager unless SAD justifies it in Audit.

**Delegation boundary:** agents never call APIs that POST/PATCH inventory or orders. Frontend/backend HTTP APIs perform writes after human confirmation.

### Core agent definitions

#### agent: costing_analyst

- **role:** Recipe cost and pricing explainer
- **goal:** Explain material contribution to unit cost and the recommended sell price from engine output using DEC-01–DEC-03; never invent unit costs
- **tools:** Read-only costing snapshot (recipe lines, qty, unit costs, contribution %, target margin, recommended price, method labels)
- **runtime notes:** `max_iter` ≤ 8; no write tools; temperature low for narration

#### agent: inventory_analyst

- **role:** Stock and replenishment explainer
- **goal:** Explain on-hand RM/FG, low-stock alerts, and **suggested** reorder quantities; never decrement stock
- **tools:** Read-only inventory + alert list + optional suggested qty (engine)
- **runtime notes:** suggestions are advisory; auto-PO forbidden (A20)

#### agent: order_analyst

- **role:** Order pipeline explainer
- **goal:** Summarize pending / in progress / completed counts and blockers (insufficient RM/FG)
- **tools:** Read-only order list + state + block reasons
- **runtime notes:** no status-change tools

#### agent: insights_analyst

- **role:** Dashboard narrator
- **goal:** Narrate KPIs (revenue, cost, margin actual vs target, alerts, pipeline) from aggregated JSON
- **tools:** Read-only dashboard aggregate
- **runtime notes:** cache aggregates; do not recompute BOM inside the LLM

### Integration requirements

| Integration | MVP | Deferred |
| --- | --- | --- |
| Relational DB (Postgres or equivalent) | Required | — |
| Email/SMS alerts | Optional: in-app alerts sufficient | External notify |
| LLM provider | Env-based (`OPENAI_API_KEY` or org gateway); names only in `.env.example` | — |
| CSV export | Required (DEC-10) | CSV import (P1, R6) |
| QBO/Xero | No | P2 |
| Shopify / WhatsApp / barcode | No | P2 |
| Payments | No (not PCI) | A20 |

**Auth and security (MVP):** session or token auth for the single owner; secrets in env; no secrets in git; tenant isolation N/A (single deployment); prompt-injection hardening on notes fields (R8): notes are not executed as instructions; agents receive truncated/sanitized text.

**Performance and scale (MVP):** single user or very small concurrency; correctness of stock transactions over throughput. Targets in [§5](#5-non-functional-requirements).

### Infrastructure specifications

| Item | MVP (capstone) |
| --- | --- |
| Hosting | Local or smallest compose stack (web + API + DB) |
| Compute | Developer laptop / single small VM |
| Network | Localhost or private demo; TLS if deployed beyond localhost |
| Monitoring | Request logs; inventory mutation ids; order transitions; crew start/stop; costing I/O without secrets |
| Logging path | `project-context/2.build/logs` for crew traces when implemented |
| Backups | Document local-run risk; production backups are Future Work unless deployed beyond demo |

---

## 4. Functional requirements

Priority: **P0** = MVP must; **P1** = enhanced if time; **P2** = Future Work.

### Core features (P0)

Each feature is specified as a user story plus constraints. Trace: S25 operator concept.

#### FR-AUTH — Sign in

- **Story:** As P1, I want to log in to my BusinessFlow workspace, so that only I change recipes, stock, and orders.
- **Acceptance:**
  - Given valid credentials, When I log in, Then I reach the dashboard or home.
  - Given invalid credentials, Then I see a generic auth error (no user enumeration beyond what the stack already does).
  - Secrets are not displayed in the UI.
- **Constraints:** Single user (DEC-09). Password hashing via standard framework practice (SAD).
- **Dependencies:** Auth store.

#### FR-MAT — Raw materials and inputs

- **Story:** As P1, I want to register raw materials (name, SKU/code, unit of measure, reorder point, optional supplier, list/last price), so that recipes have priced inputs.
- **Acceptance:**
  - I can create, edit, and list materials.
  - Unit of measure is required (e.g. g, kg, ml, unit).
  - Reorder point is numeric ≥ 0.
  - Material appears as a recipe line candidate.
- **Constraints:** One location; no lots/expiry (DEC-07).
- **Dependencies:** Optional FR-SUP.

#### FR-FG — Finished product master

- **Story:** As P1, I want a finished product record linked to a recipe, so that I can inventory and sell a SKU.
- **Acceptance:**
  - Creating a recipe creates or binds one FG SKU.
  - FG has name, SKU, unit (typically “unit” or batch output qty), reorder point.
- **Dependencies:** FR-RCP.

#### FR-RCP — Production recipes

- **Story:** As P1, I want to define a recipe that turns inputs into a finished product, so that the system can cost and produce that SKU.
- **Acceptance:**
  - A recipe has one or more lines: material + quantity > 0 + UoM **equal to** the material’s UoM (DEC-18).
  - On UoM mismatch: reject with error code `uom_mismatch` (named, user-visible); do not convert.
  - Recipe output quantity is explicit (e.g. yields 1 unit or N units) so unit cost = total material cost / yield.
  - I can edit lines; live cost updates after save (engine).
- **Constraints:** One level (DEC-12). No routings, labor steps, or work centers.
- **Dependencies:** FR-MAT.

#### FR-CST — Contribution costing

- **Story:** As P1, I want each material’s contribution to unit cost, so that I know what drives COGS.
- **Acceptance:**
  - For each line: qty, unit cost (DEC-03), line cost, **% of unit cost**.
  - Sum of line costs / yield = unit cost (DEC-02).
  - UI and API label the costing method (“weighted average of purchases”).
  - Engine tests: goldens for a fixture recipe (eval).
- **Constraints:** Agents may only restate these figures (DEC-11).
- **Dependencies:** FR-RCP, FR-PUR (for WA after purchases).

#### FR-PRC — Recommended selling price

- **Story:** As P1, I want a recommended selling price from my target margin, so that I do not underprice after cost changes.
- **Acceptance:**
  - I set target margin % (0–99.99). System computes DEC-01.
  - If unit cost is 0, recommended price is numeric **0** with UI label **“n/a / zero cost”** (DEC-16).
  - Changing recipe or WA cost updates recommended price.
  - I may store an **actual list price** separately; recommended is advisory unless I copy it.
- **Dependencies:** FR-CST.

#### FR-INV — Dual inventory

- **Story:** As P1, I want on-hand quantity for raw materials and finished goods, so that I can see what I can make and sell.
- **Acceptance:**
  - On-hand is always derived from transactional movements (opening + purchases + production + shipments + manual adjust).
  - Manual adjustment is **P0** (DEC-15): reason required; audit log; resulting on-hand must not go negative (DEC-06).
  - Display never shows negative on-hand (DEC-06).
- **Dependencies:** FR-PUR, FR-ORD.

#### FR-ALT — Low-stock alerts

- **Story:** As P1, I want alerts when on-hand is at or below reorder point, so that I restock before a promised order fails.
- **Acceptance:**
  - Alert list includes item, on-hand, reorder point, and suggested reorder qty per DEC-19 (advisory only).
  - Dashboard shows alert count.
  - Alerts update when stock or reorder point changes.
- **Dependencies:** FR-INV.

#### FR-SUP — Suppliers

- **Story:** As P1, I want to register suppliers, so that purchases have a source.
- **Acceptance:** Create, edit, list; name required; contact fields optional.
- **Dependencies:** None.

#### FR-CUS — Customers

- **Story:** As P1, I want to register customers, so that orders are attributable.
- **Acceptance:** Create, edit, list; name required.
- **Dependencies:** None.

#### FR-PUR — Purchases and price history

- **Story:** As P1, I want to record purchases of inputs with price and quantity, so that stock and weighted-average cost stay current and I can see price history.
- **Acceptance:**
  - Purchase: supplier (optional), material, qty > 0, unit price ≥ 0, date.
  - Completing a purchase increments RM on-hand and appends price-history row.
  - WA cost for that material recalculates (DEC-03).
  - Recipes using the material show updated unit cost after recalc.
- **Constraints:** No AP/invoice matching; no tax.
- **Dependencies:** FR-MAT, FR-SUP.

#### FR-ORD — Orders and statuses

- **Story:** As P1, I want orders in pending, in progress, and completed, so that I know pipeline vs done work.
- **Acceptance:**
  - Order: customer, FG SKU, qty > 0, sell price (user-entered; **default = recommended** per DEC-17; override allowed).
  - States: `pending` → `in_progress` → `completed`. No skip of `in_progress` in P0 (keeps DEC-05 atomic).
  - `pending` → `in_progress`: produce (DEC-05); fail with which materials are short if DEC-06.
  - `in_progress` → `completed`: ship (DEC-05); snapshot unit cost, sell price, margin; fail if FG short.
  - Cancel: allowed from `pending` only in P0 (no stock). Cancel from later states is P1 (reversals).
- **Dependencies:** FR-CUS, FR-RCP, FR-INV.

#### FR-RPT — Sales, margin, profit by product

- **Story:** As P1, I want sales, margin, and profit by product, so that I know which SKUs earn.
- **Acceptance:**
  - For completed orders: revenue = qty × sell price; COGS = qty × cost-at-sale; profit = revenue − COGS; margin % = profit / revenue when revenue > 0.
  - Target vs actual margin shown when target was stored on the SKU.
  - Incomplete orders excluded from revenue.
- **Dependencies:** FR-ORD, DEC-04.

#### FR-DSH — Decision dashboard

- **Story:** As P1, I want one dashboard of costs, revenue, margins, inventory, and order progress, so that I can run the week without opening five files.
- **Acceptance:**
  - Widgets: total revenue (completed), total COGS, overall profit/margin, low-stock count, order counts by state, top products by profit (or all SKUs if few).
  - Empty states when no data.
  - Numbers match FR-RPT / FR-INV / FR-ORD for the same filters; MVP period = **all-time** (DEC-20).
- **Dependencies:** aggregates from above.

#### FR-AGT — Grounded copilot

- **Story:** As P1, I want to ask why a product is unprofitable, what is low stock, or how the pipeline looks, so that I get explanations without trusting made-up numbers.
- **Acceptance:**
  - Chat answers are grounded in a JSON payload from the engine (cite unit cost, percents, qty).
  - If the engine has no data, the agent says so.
  - Chat cannot change prices, recipes, stock, or order state.
  - Timeout/error: user-visible failure, no partial fake table of costs.
- **Dependencies:** Crew + read APIs; DEC-11.

#### FR-EXP — CSV export

- **Story:** As P3/P1, I want to export purchases, inventory, and completed sales, so that my bookkeeping tool can be updated offline.
- **Acceptance:** Three CSVs (or one zip) with the column contracts below; UTF-8; header row; no secrets.
- **Dependencies:** DEC-10.

**CSV column contract (P0):**

| File | Columns (order) |
| --- | --- |
| `purchases.csv` | `purchase_id`, `date`, `supplier_name`, `material_sku`, `material_name`, `qty`, `uom`, `unit_price`, `line_total`, `currency_code` |
| `inventory.csv` | `item_type` (`RM`\|`FG`), `sku`, `name`, `uom`, `on_hand`, `reorder_point`, `unit_cost` (WA or list/last per DEC-03), `currency_code` |
| `completed_sales.csv` | `order_id`, `completed_at`, `customer_name`, `fg_sku`, `fg_name`, `qty`, `sell_price`, `cost_at_sale`, `revenue`, `cogs`, `profit`, `margin_pct`, `currency_code` |

### Requirements traceability matrix (FR → MRD)

| FR | S25 / MRD capability | DEC / R / A |
| --- | --- | --- |
| FR-AUTH | Sign up / login (journey) | DEC-09 |
| FR-MAT | Register raw materials and inputs | S25, R6 |
| FR-FG | Finished product from recipe | S25, DEC-12 |
| FR-RCP | Create production recipes | S25, DEC-12, DEC-18, A7 superseded P0 |
| FR-CST | Material contribution to unit cost | S25, DEC-02, DEC-03, R1 |
| FR-PRC | Recommended sell price from margin | S25, DEC-01, DEC-16, Q3 |
| FR-INV | Dual inventory RM + FG | S25, DEC-06, DEC-15 |
| FR-ALT | Low-stock alerts | S25, DEC-19, R7 |
| FR-SUP | Register suppliers | S25 |
| FR-CUS | Register customers | S25 |
| FR-PUR | Purchases + price history | S25, DEC-03 |
| FR-ORD | Orders pending / in progress / completed | S25, DEC-05, DEC-06, DEC-17, A17 superseded |
| FR-RPT | Sales, margin, profit by product | S25, DEC-04 |
| FR-DSH | Ops dashboard | S25, DEC-20, R5 |
| FR-AGT | Grounded NL explanation | S25, DEC-11, DEC-13, R3, A8 |
| FR-EXP | Export for bookkeeper (P3) | DEC-10, P3, A20 |
| FR-WHATIF (P1) | Journey what-if (+10% supplier) | DEC-13 |
| FR-BOM2 (P1) | Nested / two-level BOM | A7 stretch, DEC-12 |
| FR-CSV-IN (P1) | Reduce data-entry burden | R6 |

### Enhanced features (P1)

| ID | Feature | Notes |
| --- | --- | --- |
| FR-CSV-IN | CSV import of materials/recipes | Mitigates R6 |
| FR-BOM2 | Two-level BOM (FG as input) | A7 stretch only after P0 green; DEC-12 |
| FR-WHATIF | Persist-free +10% supplier what-if in UI | **P1 hard** (DEC-13); not in P0 |
| FR-CANCEL | Reverse in_progress (restore RM, decrement FG) | Needs transactional inverse |
| FR-MULTI | Second user / read-only accountant | Q5 |
| FR-UOM | Unit conversion | P1; P0 rejects mismatch (DEC-18) |

### Future features (P2)

Explicit Future Work (A20 and MRD long-term):

- Native general ledger, tax engine, e-invoicing
- Payments / PCI
- Multi-company, multi-warehouse, FX
- MES, routings, shop-floor scans, WIP
- Auto-place supplier POs
- E-commerce connectors (Shopify, Etsy, WhatsApp)
- Lots, expiry, allergens (vertical food)
- FIFO/specific identification
- Labor/overhead/waste in cost stack
- RBAC, SSO, multi-tenant SaaS
- Commerce-channel COGS tax story
- Demand forecasting
- Scheduled insight digests
- Mobile native app (responsive web is P0)

---

## 5. Non-functional requirements

### Performance requirements

| ID | Requirement | Target (MVP / capstone) |
| --- | --- | --- |
| NFR-P1 | Recipe cost + recommended price API | ≤ 500 ms p95 locally excluding LLM |
| NFR-P2 | Dashboard aggregate (no LLM) | ≤ 1 s p95 for demo data volumes (≤ 200 SKUs, ≤ 2k movements) |
| NFR-P3 | Order state transition with inventory | ≤ 1 s p95; serializable / transactional |
| NFR-P4 | Copilot first token | Best-effort; hard cap documented in SAD (e.g. 60 s) then error |
| NFR-P5 | Concurrent users | 1 interactive user (DEC-09) |

### Security and compliance

| ID | Requirement |
| --- | --- |
| NFR-S1 | No committed secrets; `.env.example` names only |
| NFR-S2 | Authenticated routes for all mutating APIs |
| NFR-S3 | Agents cannot mutate inventory/orders/prices |
| NFR-S4 | Order/customer notes not treated as system prompts (R8) |
| NFR-S5 | Security assessment before Deliver (`example` config) |
| NFR-S6 | Dependency audit as part of Deliver/security epic |
| NFR-S7 | GDPR/LGPD: not claimed until Q1; demo should avoid real personal data |
| NFR-S8 | Not PCI; no card storage |

### Scalability and reliability

| ID | Requirement |
| --- | --- |
| NFR-R1 | Inventory updates are transactional; no lost updates on a single user is insufficient — still use transactions for DEC-05 |
| NFR-R2 | On engine failure, UI shows error; do not display LLM-invented stock |
| NFR-R3 | Historical completed-order COGS immutable (DEC-04) |
| NFR-R4 | Scaling triggers: deferred; single instance |
| NFR-R5 | Availability: local-run documented; no 99.9% SLA for capstone |
| NFR-R6 | Recovery: restart app + DB; no HA |

### Usability and accessibility

| ID | Requirement |
| --- | --- |
| NFR-U1 | Web app, desktop-first; usable at tablet width; mobile as stacked layout not a native app |
| NFR-U2 | Language: “recipe,” “unit cost,” “target margin,” “low stock” — not MRP/MES jargon |
| NFR-U3 | WCAG 2.2 AA as **goal** for forms (labels, contrast, keyboard); full audit is Future Work unless QA time remains |
| NFR-U4 | Example config: minimal visual style; avoid modal-heavy flows |

### Accuracy (domain)

| ID | Requirement |
| --- | --- |
| NFR-A1 | Cost engine goldens: 100% match on fixture recipes (eval) |
| NFR-A2 | Alert correctness: on-hand ≤ reorder point iff alert exists |
| NFR-A3 | Order transition inventory math matches DEC-05 on fixtures |

---

## 6. User experience design

### Interface requirements

- **Pattern:** Forms + tables + dashboard first; **chat as copilot**, not the only UI (MRD dim. 3).
- **Platform:** Responsive web (Python backend + web frontend per setup.md later). Theme system, visual style minimal.
- **Primary navigation:** Dashboard, Materials, Recipes (cost stack + price), Inventory/Alerts, Suppliers, Customers, Purchases, Orders, Reports, Chat.
- **HITL:** User confirms purchases, recipe edits, order status changes, and any copy of recommended price into list price.
- **Errors:** Blockers name the SKU and short qty; do not fail silently.
- **Empty states:** CTA to add first material then first recipe (time-to-first-costed-SKU).
- **Future work** labeled in UI if a nav item is stubbed.

### Agent interaction design

- Human asks in natural language or “Explain” on a recipe/dashboard.
- System attaches structured context (IDs + numbers).
- Agent returns short narrative + bullet figures that match the payload.
- Uncertainty: “I only see engine data; I cannot confirm physical stock.”
- Transparency: UI can show “based on weighted-average cost as of {timestamp}.”
- No auto-PO, no auto status change.

---

## 7. Success metrics & KPIs

### Business / operational metrics

| Metric | MVP target | Notes |
| --- | --- | --- |
| Time to first costed SKU | **< 30 minutes** with a 5-line sample recipe; **same session** | R6, MRD success |
| SKUs with a recipe | 100% of sellable FG in the demo dataset | — |
| Stockout after promise | 0 on demo script if user respects alerts | Qualitative for capstone |
| Margin actual vs target | Visible per SKU after ≥ 1 completed order | DEC-04 |
| Weekly active use of dashboard/alerts | **Not a capstone pass/fail metric** | MRD dim. 3 success metric explicitly deferred (commercial) |

Commercial WTP (A14/A15) is **not** a capstone pass/fail metric.

### Technical metrics

| Metric | Target |
| --- | --- |
| Cost engine correctness | 100% golden fixtures |
| Alert correctness | 100% on fixtures |
| Order/inventory invariants | 100% on fixtures (no negatives) |
| NFR-P1–P3 | Met in local QA |
| Agent grounding | 0 numeric claims that disagree with attached JSON in eval set |
| LLM cost | Bounded; tens of USD for capstone if chat is on-demand (MRD) |

### User experience metrics

| Metric | Target |
| --- | --- |
| Task completion (scripted) | Create material → recipe → see price → purchase → order in progress → complete → dashboard matches |
| Copilot usefulness | Eval rubric: grounded, non-action-taking |
| Satisfaction | Qualitative demo feedback; no required NPS |

Eval criteria for `@qa.eng` `*run-evals` should map to NFR-A1–A3 and FR-AGT grounding.

---

## 8. Implementation strategy

### Development phases

| Phase | Owner | Outputs |
| --- | --- | --- |
| 1 Define | product-mgr, system.arch | This PRD; MRD done; SAD/SFS next; optional user stories |
| 2 Build | project.mgr → FE/BE → integration → QA → security | setup.md, frontend.md, backend.md, integration.md, qa.md, evals.md, security.md |
| 3 Deliver | devops.eng | deploy.md, user-guide.md after QA gate |

**Build modules (workflow rule):** (1) crew YAML + kickoff, (2) API, (3) UI, (4) e2e — not all in one session.

### Resource requirements

- AAMAD personas as in `AGENTS.md`.
- Operator time; LLM API; local Docker/Python/Node as setup.md will pin.
- No paid full analyst reports (A18).

### Risk mitigation

Map 1:1 to MRD risks; product mitigations:

| Risk | PRD mitigation |
| --- | --- |
| R1 | DEC-01–DEC-04 |
| R2 | P2 list + A20 |
| R3 | DEC-11, FR-AGT |
| R4 | DEC-07 demo scope |
| R5 | Agent explanations + order dashboard UVP |
| R6 | Empty-state first recipe; P1 CSV import |
| R7 | DEC-05, DEC-06, NFR-R1 |
| R8 | NFR-S4 |
| R9 | DEC-14 |
| R10 | Cite Odoo TCO as a range (S22–S23), never a single figure |
| R11 | Runtime-agnostic DEC-*; adapter YAML only for crewai |
| R12 | No novelty/patent claims (A11); §9 launch |
| R13 | Domain engine + agents both in P0 (DEC-13 chat P0; what-if P1; Q7 assumed both) |

---

## 9. Launch & go-to-market strategy

**Capstone:** in-scope. **Commercial GTM:** out of MVP; directional only.

| Topic | Capstone | Commercial (later) |
| --- | --- | --- |
| Audience | Instructors, demo users | P1 makers in one geography (Q1) |
| Packaging | Local/compose runbook | Freemium SKU cap then USD 15–80/mo band (A14, unvalidated) |
| Positioning | Mini-ERP + grounded agents | Recipe cost + margin + ops vs Sheets/Katana |
| Channels | Demo script, user-guide | Accountants, SME agencies (MRD) |
| Pricing experiments | N/A | Validate A14/A15 |

Do not claim patented novelty (R12, A11).

---

## Quality assurance checklist

- [x] Requirements traceable to MRD, S25, or recorded Assumptions (FR RTM table)
- [x] Technical specifications feasible with CrewAI adapter (sequential, YAML, no memory, engine-owned writes)
- [x] Success metrics aligned with problem statement (first costed SKU, margin visibility, alerts, pipeline)
- [x] MVP vs Future Work boundaries explicit (P0 / P1 / P2, A20; what-if P1 hard)
- [x] Market sections included (MRD not skipped)
- [x] Q3/Q4 locked (DEC-01–DEC-06); Q11 locked (DEC-15); DEC-16–DEC-20 close prior agent forks
- [x] Template headings present through Audit

---

## Sources

| ID | Source |
| --- | --- |
| PRD-S0 | `project-context/1.define/mrd.md` (P1–P3, R1–R13, A1–A20, Q1–Q9, S1–S26, operator concept) |
| S25 | Operator product concept, 2026-09-28 |
| S26 | AAMAD: `.cursor/templates/prd-template.md`, `.cursor/agents/product-mgr.md`, `aamad.config.example.yml`, `AGENTS.md` |
| S1–S24 | As cited in MRD Sources table (market and competitor URLs) |

No new market figures were introduced in this PRD.

---

## Assumptions

| ID | Category | Assumption | If false |
| --- | --- | --- | --- |
| PA1 | Inputs | `system-description.md` absent; S25 + MRD suffice | Reconcile after `*elicit-requirements` |
| PA2 | Config | Honor `aamad.config.example.yml` until `aamad.config.yml` exists | Reload config |
| PA3 | Runtime | `AAMAD_TARGET_RUNTIME` unset → `crewai` | Adapter YAML change; domain DEC-* unchanged |
| PA4 | Q3 | Margin-on-sell (DEC-01) and material-only COGS (DEC-02) | Recalc UI, tests, evals |
| PA5 | Q4 | Two-step produce-then-ship (DEC-05) is the inventory model | SAD data model change |
| PA6 | Q1/Q2 | Locale-neutral English + generic makers (DEC-07, DEC-08) | Localization, lots, tax |
| PA7 | Q5 | Single user (DEC-09) | Auth/RBAC epic |
| PA8 | Q6 | CSV enough (DEC-10) | Connector epic |
| PA9 | Q7 | Capstone values domain engine and agents equally | Shrink or grow FR-AGT |
| PA10 | Q8 | Mordor TAM/SAM only on slides (DEC-14) | Pitch rewrite |
| PA11 | Yield | Recipe yield field exists; unit cost divides by yield | If yield always 1, simplify |
| PA12 | Sell price on order | Defaults to recommended (DEC-17); user may override; reports use actual sell price | Force recommended-only (no override) |
| PA13 | Opening stock | First purchase and/or **P0 manual adjust** (DEC-15) | Purchases-only seeding |
| PA14 | Date filters | Dashboard default **all-time** (DEC-20) | Add date-range epic |
| PA15 | Suggested reorder qty | Locked DEC-19; not ML; not auto-PO | Operator overrides formula |
| PA16 | Brand | Name remains BusinessFlow (A5) | Rename |
| PA17 | MRD A17 | **Superseded** by DEC-05 (two-step produce/ship) | Do not implement single-step complete consume |
| PA18 | MRD A7 (P0) | **Superseded for P0** by DEC-12 (one-level BOM); two-level only via FR-BOM2 P1 | Nested BOM in P0 |
| PA19 | What-if | **P1 only** (DEC-13); not graded as P0 | Promote to P0 later |

MRD assumptions A1–A20 still apply where not superseded by DEC-* / PA-* (especially PA17–PA18 for A17/A7).

---

## Open questions

Items still needing stakeholder confirmation. **Build may proceed on DEC-* defaults.**

| ID | Question | Status in this PRD | Still blocks |
| --- | --- | --- | --- |
| Q1 | Country, language, currency for a real launch? | Defaulted for capstone (DEC-07) | Tax, LGPD/GDPR, food rules, copy |
| Q2 | Single vertical for GTM? | Generic model (DEC-08) | Lots/expiry/allergens |
| Q3 | Margin vs markup; labor in v1? | **Locked** DEC-01, DEC-02 | Only if stakeholder overrides |
| Q4 | Order complete vs separate production? | **Locked** DEC-05 (supersedes A17) | Only if stakeholder overrides |
| Q5 | Multi-user in MVP? | No (DEC-09) | If P2 must be in demo |
| Q6 | Accounting API vs CSV? | CSV (DEC-10); columns in FR-EXP | If instructor requires connector |
| Q7 | Grading weight agents vs domain? | Assumed both (PA9); chat P0, what-if P1 | Chat depth only |
| Q8 | Market-size series? | Mordor TAM+SAM (DEC-14) | External pitch only |
| Q9 | Runtime if not crewai? | Default crewai (PA3) | Adapter files |
| PRD-Q10 | Must `in_progress` be mandatory (no skip)? | **Locked** P0: no skip | Only if stakeholder wants ship-without-produce |
| PRD-Q11 | Manual inventory adjustments in P0? | **Locked** yes (DEC-15) | Only if stakeholder forbids adjusts |
| PRD-Q12 | Copy `aamad.config.example.yml` → `aamad.config.yml`? | Recommended, not done by this persona unless asked | Config keys at Build |

---

## Audit

| Field | Value |
| --- | --- |
| Timestamp | 2026-09-28T18:10:00-03:00 |
| Persona id | product-mgr |
| Action | quality-pass patch (lock DEC-13/15–20, FR RTM, CSV contract; supersede A7/A17) |
| Resolved runtime | crewai (env unset; example config `runtime.target: crewai`) |
| Prompt trace | Prior create-prd; quality-pass findings; `.cursor/agents/product-mgr.md`; `mrd.md` sync |
| Tools | edit `project-context/1.define/prd.md`; edit `project-context/1.define/mrd.md` |
| Temperature / determinism | N/A (artifact authoring in IDE) |
| Handoff | `@system.arch` sync SAD SA9 / FR-WHATIF / DEC-15–20; optional `*create-stories` |
