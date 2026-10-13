# Product Requirements Document — Nexo Custo

Mini ERP for small and medium entrepreneurs (makers). Product brand: **Nexo Custo** (DEC-26; formerly BusinessFlow).

## How to use this file (context as code)

- Treat headings, requirement IDs, and tables as the contract. Do not invent IDs.
- Cite this PRD (`FR-*`, `NFR-*`, `DEC-01`–`DEC-26`, `PA-*`) plus MRD `P1`–`P3`, `R1`–`R13`, `A1`–`A20`, `Q1`–`Q9`, `S1`–`S26`.
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
| Do | Implement P0 modules only; costing/inventory as deterministic services; one specialist per kickoff; agents narrate validated JSON (R3); honor DEC-01–DEC-26 |
| Do not | Native GL/tax/MES/auto-PO/connectors (A20); LLM write to stock; blend Mordor/MRFR TAM (R9); nested BOM or what-if in P0 |

---

## Metadata

| Key | Value |
| --- | --- |
| product_name | Nexo Custo |
| product_type | Mini ERP (recipe costing + ops; not full ERP) |
| audience | Small and medium entrepreneurs who make products (P1 primary) |
| artifact | `project-context/1.define/prd.md` |
| persona | `product-mgr` |
| action | `create-prd` |
| runtime | `crewai` (resolved) |
| runtime_note | Implementation choice for MVP, not AAMAD methodology; product definition is runtime-agnostic |
| config | `aamad.config.yml` present; honor project preferences |
| env | Prefer `AAMAD_TARGET_RUNTIME` over `runtime.target` when set; else `crewai` from config |
| language | Python primary; TypeScript secondary (`aamad.config.yml`) |
| ui | Theme `system` (light/dark/system toggle, persist locally — DEC-21 / FR-THEME); visual style `minimal` (DEC-23); prefer_modals `false` (exception: focused stock-warning dialog per DEC-25 / PA22); UI locales EN (default), PT, ES (DEC-22 / FR-I18N) |
| security_gate | `require_security_assessment: true` in `aamad.config.yml` |
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
| DEC-05 | Inventory on order | **Make-to-stock-capable, two-step.** Order quantity is finished-goods units; recipe `yield` > 0. (1) `pending` → `in_progress` **produces**: for each recipe line, `RM consumed = line_quantity × (order_quantity / yield)`; FG increases by `order_quantity`. (2) `in_progress` → `completed` **ships**: decrement FG by `order_quantity`; write cost-at-sale and revenue. `pending` has no stock effect. **Supersedes MRD A17** (A17’s single-step complete consume is obsolete). | Q4, A17, R7, SAD ADR-16 |
| DEC-06 | Blocking rules | Block `in_progress` if any RM on-hand would go negative. Block `completed` if FG on-hand would go negative. No silent negative stock. | R7 |
| DEC-07 | Geography | Capstone **locale-neutral for tax/compliance**: **one active currency** per deployment (default code `USD`, or `BRL` when configured; display symbol from config); no tax engine; no food-lot/allergen rules. Compliance treated as demo PII minimization until Q1 is answered for a real launch. **UI language is separate from geography** — deployment UI locale is selectable among EN / PT / ES (default **EN**) per DEC-22; do not treat “UI English only” as locked. | Q1, Q2, R4, A9, DEC-22 |
| DEC-08 | Vertical | **Generic makers** — any small/medium maker (artisan, confectioner, cosmetics, crafts, light assembly, etc.) with the same recipe model. No vertical-specific fields in MVP. Demo seed data (e.g. flour/bread) is **illustrative only**, not product scope. UI copy, empty states, and nav labels must not imply a bread-only or bakery-only vertical. | Q2 |
| DEC-09 | Users | **Owner-primary, single authenticated user per deployment** (one login). No RBAC, no multi-tenant SaaS in MVP. | Q5, A6 |
| DEC-10 | Accounting | **CSV export** of purchases, inventory on-hand, and completed sales. No QBO/Xero connector in MVP. | Q6, P3, A20 |
| DEC-11 | Agents vs engine | Application services own all numeric writes. CrewAI agents **read** costing/inventory/order JSON and explain; they have **no inventory write tools**. | R3, A8 |
| DEC-12 | BOM depth | Recipes are **one production level**: FG ← materials (and optionally other registered items treated as inputs). Nested recipes (FG used as input to another FG) **out of P0** (P1 = FR-BOM2). **Supersedes MRD A7 for P0** (A7’s “1–2 levels” applies only if FR-BOM2 is pulled in). | A7 |
| DEC-13 | Chat | Copilot chat is **P0** for “why this cost / what is low stock / order pipeline,” bounded (not on every widget). Persist-free supplier what-if (+10%) is **P1 only** (FR-WHATIF) — not conditional P0. | S25, Q7 |
| DEC-14 | Market slides | Pitch uses Mordor TAM S4 and SAM S5 only. | Q8, R9 |
| DEC-15 | Manual inventory adjust | **P0 required**: owner may adjust RM/FG on-hand with **reason required** and audit log; resulting on-hand must not go negative (DEC-06). The adjustment changes **on-hand only** and does **not** rewrite the weighted-average unit cost, the last purchase price, or the recipe unit cost (SAD ADR-11). Primary path for opening balances alongside first purchase (PA13). Closes PRD-Q11. | PRD-Q11, PA13, FR-INV, DEC-03, DEC-06 |
| DEC-16 | Zero unit cost price | If unit cost is 0, recommended sell price API returns numeric **0**; UI shows label **“n/a / zero cost”** (not a blank or alternate sentinel). | FR-PRC |
| DEC-17 | Order default sell price | New order defaults sell price to **recommended** price (FR-PRC); user may override. Reports always use the order’s actual sell price (PA12). | FR-ORD, PA12 |
| DEC-18 | UoM mismatch | Recipe line UoM **must equal** the material’s UoM. On mismatch, API/UI **reject** with a named error (`uom_mismatch`); no silent conversion in P0 (FR-UOM is P1). Material UoM values are limited to the curated set in DEC-24 so string equality is deterministic. | FR-RCP, FR-UOM, DEC-24 |
| DEC-19 | Reorder suggestion | Advisory only: `suggested_reorder_qty = max(0, (2 × reorder_point) − on_hand)`. Not ML; not an auto-PO. | FR-ALT, PA15 |
| DEC-20 | Dashboard period | MVP dashboard aggregates default to **all-time** (no date-range filter required in P0). FR-DSH is **P0 required** for Capstone UI (next FE slice): all-time revenue, costs, margins, low-stock alerts, order pipeline — not deferred. | FR-DSH, PA14 |
| DEC-21 | Theme | **P0**: light / dark / system appearance toggle; persist preference in the browser (local storage). Default follows `aamad.config.yml` `ui.theme: system` until the user overrides. | FR-THEME, NFR-U4 |
| DEC-22 | UI locales (i18n) | **P0**: full UI string localization for **EN** (default), **PT**, and **ES** — nav, labels, forms, HITL confirmations, dashboard, and user-visible errors. One active UI locale per session/deployment preference; default **EN**. Currency rules unchanged (one active `CURRENCY_CODE`, USD or BRL). Overrides prior “UI English only” reading of DEC-07. Copilot/LLM narrative language: see PA21. | FR-I18N, DEC-07, Q1 |
| DEC-23 | Visual language | **P0**: cleaner minimal / calm (Jony Ive–inspired) visual language — purposeful typography, space hierarchy, sparse chrome; avoid decorative cards, heavy shadows, and pill clusters. Aligns with `aamad.config.yml` `ui.visual_style: minimal`. | FR-THEME, NFR-U4, §6 |
| DEC-24 | Material catalog UI | **P0**: Materials nav must support **create** and **list** (edit remains required per FR-MAT). Required fields on create: **name**, **UoM**, **list price** (≥ 0), **reorder point** (≥ 0). Optional: SKU/code, supplier. **UoM approach:** curated common set only — `kg`, `g`, `L`, `ml`, `unit`, `pack` (package). UI presents a select; API rejects values outside the set. Free-text / custom UoM deferred (with FR-UOM conversion). No silent unit conversion (DEC-18). | FR-MAT, DEC-18, FR-UOM |
| DEC-25 | Recipe material picker + stock popup | **P0**: Recipe create/edit adds lines by **selecting materials from the user’s material catalog** (not free-typed material names). Each line: material + quantity > 0 + UoM equal to that material’s UoM (DEC-18). **Stock awareness:** when the selected material has on-hand **0** or **no inventory row**, show a focused **dialog / popup** alert that is unmistakably interruptive (name material, state stock is missing or zero, allow dismiss and continue building the recipe — advisory at recipe-edit time; order produce still hard-blocks per DEC-06). This is an explicit **exception** to `aamad.config.yml` `prefer_modals: false` (see PA22): stock warnings may use a modal; other flows stay non-modal. | FR-RCP, FR-INV, DEC-06, DEC-18 |
| DEC-26 | Product brand | Product display name is **Nexo Custo** (supersedes A5 / prior BusinessFlow brand). UI chrome, logo, and Capstone docs use Nexo Custo. Brand accent is **terracotta** (logo + selected primary nav). Internal package/API identifiers may retain legacy `businessflow` strings until a later rename epic. | PA16 |

---

## 1. Executive summary

### Problem statement

Small and medium **makers** of any craft (typically 1–50 people; design center **P1**, 1–10) — artisans, confectioners, cosmetics makers, crafters, light assemblers, and similar — transform raw materials into finished goods. Today they run recipes, purchase prices, stock, and orders in disconnected spreadsheets, chats, and a separate invoicing tool (MRD problem statement, S25). Nexo Custo is **not** a bakery-only or bread-only product; sample seed data may use flour/bread for demos only (DEC-08).

They cannot see in one place:

- True **unit cost by recipe**, including each material’s contribution.
- A **recommended selling price** from a desired profit margin.
- **On-hand stock** of inputs and finished goods, with warning before stockouts.
- **Order progress** (pending / in progress / completed).

Impact (use as analog, not Nexo Custo error rates): spreadsheet error prevalence is widely reported as very high (S15); retail inventory distortion is a large industry analog (S13–S14, A12). Qualitatively: underpricing after supplier increases, overpricing from guesswork, promising orders the materials cannot support, and hours reconciling files.

Target market for product design: owner-operators who **make** things. Not pure resellers (NP1), not corporate controllers (NP2), not MES plant managers (NP3).

Envelope (do not blend series): SMB software TAM USD 77.33B (2026) (S4); SMB cloud ERP SAM USD 49.42B (2026) (S5). Numeric SOM is not estimated (A10).

### Solution overview

Nexo Custo is a **mini-ERP**: master data (materials, recipes, suppliers, customers), deterministic **costing and pricing**, dual inventory with **low-stock alerts**, **purchases with price history**, **three-state orders**, **product P&L**, and an **ops dashboard**. An optional **multi-agent copilot** explains engine outputs in natural language.

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

**Why multi-agent:** the weekly loop is several specialist jobs (cost explanation, stock/reorder narrative, order pipeline, KPI digest). Each kickoff runs **one specialist** for the screen that asked. Agents are **not** optimal as the ledger: numbers must be reproducible (R3). Therefore the product is **hybrid**: deterministic domain engine + advisory crew.

**Business / operational value (capstone):** demonstrate a complete maker ops loop plus grounded AI. Commercial hypothesis (post-capstone, A14): USD 15–80/month or freemium vs Katana from USD 299/month (S17) and Odoo manufacturing implementation often USD 8k–40k (S22–S23).

**Timing:** cloud already 72.56% of SMB software (S4); embedded AI is a cited cloud-ERP driver (S5). Fragmentation (~9 tools; 66% integration pain) favors a focused mini-ERP over another accounting module (S4).

---

## 2. Market context & user analysis

### Target market / users

| ID | Name | MVP priority | Characteristics |
| --- | --- | --- | --- |
| P1 | Maker / artisan | **Primary** | Owner who cooks, mixes, crafts, formulates, or assembles in small batches across food, confectionery, cosmetics, crafts, and light assembly; system of record is the owner; phone + laptop; distrusts “ERP” branding; local language likely (Q1 unresolved for commercial). Not limited to bakery. |
| P2 | Light manufacturer | Secondary | Founder-led, 10–50; will trial if simpler than Katana/Odoo; do not over-serve with full MRP (R2). |
| P3 | Bookkeeper-owner | Influencer | Needs export, not a second GL. |

**Market size:** see MRD TAM/SAM tables. Geographic focus for **commercial** GTM is open (Q1). For **capstone**, DEC-07.

**Expansion (not MVP):** additional locales beyond EN/PT/ES, P2 multi-user, connectors. Capstone UI locales EN/PT/ES are P0 (DEC-22).

### User needs analysis

**Critical pain points (P1):**

- Recipe cost is a guess.
- Supplier increases do not flow into sell price.
- Stock lives in a notebook.
- No pending vs completed orders.

**Jobs to be done:** when an input price or recipe changes, get the new unit cost, a margin-based price, and whether the next order can be fulfilled — without an implementer.

**User journey (happy path, weekly ops loop):**

1. Sign up / log in (DEC-09).
2. Register suppliers and raw materials via Materials UI (name, curated UoM, list price, reorder point — DEC-24 / FR-MAT).
3. Create recipe by picking catalog materials + quantities (UoM locked to material; stock-zero popup per DEC-25) → finished product SKU.
4. Review contribution cost stack and recommended price (DEC-01–DEC-03).
5. Record purchase (price history + RM stock increment; WA cost update).
6. Register customer; create order (`pending`).
7. Move to `in_progress` (produce: DEC-05) then `completed` (ship + snapshot: DEC-04).
8. Dashboard: revenue, costs, margins, low stock, pipeline.
9. Optional copilot: grounded explanations (P0). Supplier what-if is P1 (DEC-13).

**Adoption barriers:** data entry of materials and recipes (R6); ERP-sounding language; distrust of AI numbers (R3).

**Success factors:** first costed SKU in-session; labels that say “recipe” not “MRP explosion”; HITL on all writes; agents cite engine figures.

### Competitive landscape

Feature comparison and competitor catalog are canonical in the MRD. PRD non-goals match A20. Intended Nexo Custo MVP row: all operator-concept capabilities **Y**, GL/tax **N**, commerce connectors **N**, grounded NL explanation **Y**.

---

## 3. Technical requirements & architecture

Product constraints for `@system.arch`. Runtime field names below are **CrewAI-shaped** because resolved runtime is `crewai`; SAD may rename per adapter if runtime changes (R11).

### Runtime & agent specifications

| Control | MVP value |
| --- | --- |
| Process | Sequential only inside one kickoff: validate engine JSON, then narrate. Not a four-agent sequence |
| Delegation | `allow_delegation=false` |
| Memory | `false` (reproducibility) |
| `max_iter` | ≤ 12 per task |
| `max_retry_limit` | ≥ 2 |
| `max_rpm` | Set at crew level (SAD/backend) |
| Tools | Least privilege; **no** stock/order mutation tools |
| Kickoff | One specialist per screen. Recipe → `costing_analyst`; inventory → `inventory_analyst`; orders → `order_analyst`; dashboard → `insights_analyst`. User-initiated; not on every keystroke |

**Collaboration:** one specialist per kickoff. The only sequential chain is validate JSON → narrate for that specialist. No hierarchical manager. The narrate task returns the copilot envelope (`reply`, `citations`, `grounding_timestamp`, `agent`) via `output_pydantic` (SAD ADR-15).

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

- **Story:** As P1, I want to log in to my Nexo Custo workspace, so that only I change recipes, stock, and orders.
- **Acceptance:**
  - Given valid credentials, When I log in, Then I reach the dashboard or home.
  - Given invalid credentials, Then I see a generic auth error (no user enumeration beyond what the stack already does).
  - Secrets are not displayed in the UI.
- **Constraints:** Single user (DEC-09). Password hashing via standard framework practice (SAD).
- **Dependencies:** Auth store.

#### FR-MAT — Raw materials and inputs

- **Story:** As P1, I want to register raw materials in my catalog (name, unit of measure, list price, reorder point; optional SKU/code and supplier), so that recipes have priced inputs from my inventory master data — whether I make food, cosmetics, crafts, or other goods.
- **Priority:** **P0** — Materials UI create + list is Capstone-required (DEC-24); users must be able to register products/inputs without relying only on seed data.
- **Acceptance:**
  - **P0 UI:** I can **create** and **list** materials from the Materials navigation; edit remains required for corrections.
  - Required on create: **name** (non-empty), **UoM**, **list price** (numeric ≥ 0), **reorder point** (numeric ≥ 0).
  - Optional: SKU/code, supplier link.
  - **UoM (DEC-24):** curated common set only — `kg`, `g`, `L`, `ml`, `unit`, `pack`. Presented as a select in UI; API rejects values outside the set. Covers weight, volume, countable unit, and package — not free-text in P0.
  - Created materials appear as recipe line candidates (FR-RCP / DEC-25).
  - Labels and empty states use generic maker language (DEC-08); no bakery-only implication.
- **Constraints:** One location; no lots/expiry (DEC-07). No silent UoM conversion (DEC-18).
- **Dependencies:** Optional FR-SUP; DEC-24.

#### FR-FG — Finished product master

- **Story:** As P1, I want a finished product record linked to a recipe, so that I can inventory and sell a SKU.
- **Acceptance:**
  - Creating a recipe creates or binds one FG SKU.
  - FG has name, SKU, unit (typically “unit” or batch output qty), reorder point.
- **Dependencies:** FR-RCP.

#### FR-RCP — Production recipes

- **Story:** As P1, I want to define a recipe by selecting materials from my catalog and setting quantities, so that the system can cost and produce that SKU for any maker vertical.
- **Priority:** **P0** — recipe create UI with catalog material picker is Capstone-required (DEC-25).
- **Acceptance:**
  - **P0 UI:** I can create (and edit) a recipe; each input line is added by **selecting an existing material** from the user’s material catalog/inventory candidates — not by inventing a free-typed material name on the recipe form.
  - A recipe has one or more lines: **material** + **quantity > 0** + **UoM equal to** the selected material’s UoM (DEC-18). UoM on the line is taken from (or validated against) the material record; mismatch rejects with `uom_mismatch`; no silent conversion.
  - **Stock awareness (DEC-25):** when I select a material whose on-hand is **0** or that has **no inventory/stock row**, the UI shows a focused **dialog / popup** alert (material name + missing/zero stock). The alert is dismissible; I may continue composing the recipe (advisory). Hard stock blocks remain on order `in_progress` / `completed` per DEC-06.
  - Recipe output quantity is explicit (e.g. yields 1 unit or N units) so unit cost = total material cost / yield.
  - I can edit lines; live cost updates after save (engine).
  - Empty state when catalog has no materials: CTA to register materials first (FR-MAT), not a bread-specific demo path as the only option.
- **Constraints:** One level (DEC-12). No routings, labor steps, or work centers. Stock dialog is the sole approved modal exception under PA22 / DEC-25.
- **Dependencies:** FR-MAT, FR-INV (for on-hand lookup); DEC-18, DEC-25.

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
  - Manual adjustment is **P0** (DEC-15): reason required; audit log; resulting on-hand must not go negative (DEC-06). The movement changes on-hand only; it does not rewrite the weighted-average unit cost, the last purchase price, or the live recipe unit cost.
  - Display never shows negative on-hand (DEC-06).
  - Recipe UI may read on-hand (or absence of a stock row) to trigger the DEC-25 stock-warning dialog; missing row and on-hand 0 are both “not in stock” for that advisory.
- **Dependencies:** FR-PUR, FR-ORD; consumed by FR-RCP stock awareness.

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
  - `pending` → `in_progress`: produce (DEC-05). For each line, consume `line_quantity × (order_quantity / yield)` of that material and increment FG by `order_quantity`. Fail with which materials are short if DEC-06.
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
- **Priority:** **P0** — required Capstone UI (primary nav home / post-login landing); not deferred.
- **Acceptance:**
  - Widgets (all-time per DEC-20): total revenue (completed), total COGS / costs, overall profit/margin, low-stock alert count (and entry to alert detail), order pipeline counts by state (`pending` / `in_progress` / `completed`), top products by profit (or all SKUs if few).
  - Empty states when no data.
  - Numbers match FR-RPT / FR-INV / FR-ORD for the same filters; MVP period = **all-time** (DEC-20).
  - All dashboard labels and empty-state copy follow the active UI locale (FR-I18N); number/currency formatting follows active UI locale where practical, with money using deployment `CURRENCY_CODE` (DEC-07 / DEC-22).
- **Dependencies:** aggregates from above; FR-I18N for labels.

#### FR-I18N — UI localization (EN / PT / ES)

- **Story:** As P1, I want the product UI in English, Portuguese, or Spanish, so that I can operate Nexo Custo in my preferred language.
- **Priority:** **P0**
- **Acceptance:**
  - Supported UI locales: **EN** (default), **PT**, **ES** — first-class full UI translations (not partial chrome).
  - Convertible surfaces include: primary navigation, form labels/placeholders/help, HITL confirmations, dashboard widgets and empty states, tables/list headers, and all user-visible errors/blockers.
  - User (or deployment preference) can select one active UI locale among EN/PT/ES; default **EN**.
  - Domain numbers/currency formatting follow the active UI locale where practical; monetary amounts still use the single active deployment `CURRENCY_CODE` (USD or BRL per DEC-07).
  - Copilot/LLM narrative language is out of scope for this FR unless later scoped (PA21); UI chrome remains localized regardless.
- **Constraints:** Overrides prior “UI English only” reading of DEC-07; geography/tax neutrality unchanged (DEC-07).
- **Dependencies:** DEC-22; string catalog for FE.

#### FR-THEME — Appearance theme and visual language

- **Story:** As P1, I want light, dark, or system appearance and a calm minimal UI, so that the product is comfortable to use and uncluttered.
- **Priority:** **P0**
- **Acceptance:**
  - Theme toggle: **light** / **dark** / **system**; preference persisted in the browser (local storage) (DEC-21).
  - Default before user override aligns with `aamad.config.yml` `ui.theme: system`.
  - Visual language: minimal / calm typography and spacing; sparse chrome; no decorative card stacks, heavy shadows, or pill clusters as default patterns (DEC-23; `ui.visual_style: minimal`).
  - Theme control is reachable from primary chrome (e.g. settings or header) without a modal-heavy flow (`prefer_modals: false`). Stock-warning dialog (DEC-25) is the only approved modal exception (PA22).
- **Dependencies:** DEC-21, DEC-23; FE design tokens.

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
| FR-MAT | Register raw materials and inputs (P0 create/list UI) | S25, R6, DEC-08, DEC-24 |
| FR-FG | Finished product from recipe | S25, DEC-12 |
| FR-RCP | Create production recipes (catalog picker + stock popup) | S25, DEC-12, DEC-18, DEC-25, A7 superseded P0 |
| FR-CST | Material contribution to unit cost | S25, DEC-02, DEC-03, R1 |
| FR-PRC | Recommended sell price from margin | S25, DEC-01, DEC-16, Q3 |
| FR-INV | Dual inventory RM + FG | S25, DEC-06, DEC-15 |
| FR-ALT | Low-stock alerts | S25, DEC-19, R7 |
| FR-SUP | Register suppliers | S25 |
| FR-CUS | Register customers | S25 |
| FR-PUR | Purchases + price history | S25, DEC-03 |
| FR-ORD | Orders pending / in progress / completed | S25, DEC-05, DEC-06, DEC-17, A17 superseded |
| FR-RPT | Sales, margin, profit by product | S25, DEC-04 |
| FR-DSH | Ops dashboard (P0 Capstone UI) | S25, DEC-20, R5, FR-I18N |
| FR-I18N | Full UI locales EN/PT/ES | DEC-22, DEC-07 |
| FR-THEME | Theme toggle + minimal visual language | DEC-21, DEC-23 |
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
| FR-UOM | Unit conversion + custom/free-text UoM | P1; P0 uses curated UoM set (DEC-24) and rejects mismatch (DEC-18) |

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
| NFR-U2 | Plain **generic maker** language in all UI locales (EN/PT/ES): recipe / unit cost / target margin / low stock equivalents — not MRP/MES jargon and not bakery-only wording (FR-I18N, DEC-08, DEC-22) |
| NFR-U3 | WCAG 2.2 AA as **goal** for forms (labels, contrast, keyboard); full audit is Future Work unless QA time remains; theme modes must keep usable contrast; stock-warning dialog must be keyboard-dismissible |
| NFR-U4 | `aamad.config.yml`: `ui.visual_style: minimal`, `ui.theme: system`, `prefer_modals: false`; honor DEC-21 / DEC-23; **exception** DEC-25 / PA22 — focused dialog allowed only for recipe-line stock warnings |

### Accuracy (domain)

| ID | Requirement |
| --- | --- |
| NFR-A1 | Cost engine goldens: 100% match on fixture recipes (eval) |
| NFR-A2 | Alert correctness: on-hand ≤ reorder point iff alert exists |
| NFR-A3 | Order transition inventory math matches DEC-05 on fixtures |

---

## 6. User experience design

### Interface requirements

- **Pattern:** Forms + tables + **dashboard as primary home**; **chat as copilot**, not the only UI (MRD dim. 3). Dashboard (FR-DSH) is P0 Capstone UI — post-login landing and first item in primary nav. Avoid a “messy” ops surface: one clear job per screen; Materials and Recipes must be first-class create/list flows (DEC-24, DEC-25).
- **Platform:** Responsive web (Python backend + web frontend per setup.md). Default theme `system` with light/dark/system toggle persisted locally (DEC-21 / FR-THEME).
- **Visual principles (DEC-23):** calm, purposeful typography; clear space hierarchy; sparse chrome; content over decoration. Prefer flat structure and whitespace over decorative cards, multi-layer shadows, and pill clusters. Align with `ui.visual_style: minimal`.
- **Positioning (DEC-08):** UI copy, placeholders, and empty states address **any small/medium maker** (artisan, confectioner, cosmetics, crafts, etc.). Seed demo materials (flour/bread, etc.) are sample data only — never present the product as bread-only.
- **Language switcher (DEC-22 / FR-I18N):** user-accessible control to select **EN** (default), **PT**, or **ES**; full UI strings switch with locale (nav, labels, forms, HITL, dashboard, user-visible errors). Persist locale preference locally alongside theme unless deployment config later overrides.
- **Primary navigation:** **Dashboard** (home), Materials (create/list catalog — DEC-24), Recipes (catalog material picker, cost stack + price — DEC-25), Inventory/Alerts, Suppliers, Customers, Purchases, Orders, Reports, Chat — plus chrome for theme and locale.
- **Materials (FR-MAT / DEC-24):** create form with required name, UoM select (`kg`/`g`/`L`/`ml`/`unit`/`pack`), list price, reorder point; list view of catalog.
- **Recipes (FR-RCP / DEC-25):** line picker from existing materials; qty + UoM matching material; on zero/missing stock, show focused stock-warning **dialog** (approved modal exception; PA22). Prefer non-modal patterns elsewhere (`prefer_modals: false`).
- **HITL:** User confirms purchases, recipe edits, order status changes, and any copy of recommended price into list price; confirmation copy is localized (FR-I18N). Stock-warning dialog is advisory dismiss/continue, not a write confirmation.
- **Errors:** Blockers name the SKU and short qty; do not fail silently; messages localized. UoM mismatch uses `uom_mismatch`.
- **Empty states:** CTA to add first material then first recipe (time-to-first-costed-SKU); localized; generic maker wording.
- **Future work** labeled in UI if a non-P0 nav item is stubbed; do not stub Dashboard, Materials create/list, Recipes create with picker, theme, or locale switcher in Capstone P0.

### Agent interaction design

- Human asks in natural language or “Explain” on a recipe/dashboard.
- System attaches structured context (IDs + numbers).
- Agent returns short narrative + bullet figures that match the payload.
- Uncertainty: “I only see engine data; I cannot confirm physical stock.”
- Transparency: UI can show “based on weighted-average cost as of {timestamp}.”
- No auto-PO, no auto status change.
- **Locale note (PA21):** MVP copilot/LLM replies may remain English when the LLM path runs unless later scoped; UI chrome and HITL remain localized per FR-I18N.

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
| Task completion (scripted) | Create material (catalog UI) → recipe via material picker (stock popup if zero) → see price → purchase → order in progress → complete → dashboard matches |
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
| R6 | Empty-state first material then recipe; P0 material create UI (DEC-24); P1 CSV import |
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
- [x] Technical specifications feasible with CrewAI adapter (one specialist per kickoff; sequential only for validate-then-narrate; YAML; no memory; engine-owned writes)
- [x] Success metrics aligned with problem statement (first costed SKU, margin visibility, alerts, pipeline)
- [x] MVP vs Future Work boundaries explicit (P0 / P1 / P2, A20; what-if P1 hard)
- [x] Market sections included (MRD not skipped)
- [x] Q3/Q4 locked (DEC-01–DEC-06); Q11 locked (DEC-15); DEC-16–DEC-20 close prior agent forks; DEC-21–DEC-23 lock theme, i18n, visual language; DEC-24–DEC-25 lock material catalog UI, curated UoM, recipe picker + stock dialog (operator 2026-10-13 UX feedback)
- [x] Template headings present through Audit

---

## Sources

| ID | Source |
| --- | --- |
| PRD-S0 | `project-context/1.define/mrd.md` (P1–P3, R1–R13, A1–A20, Q1–Q9, S1–S26, operator concept) |
| S25 | Operator product concept, 2026-09-28 |
| S26 | AAMAD: `.cursor/templates/prd-template.md`, `.cursor/agents/product-mgr.md`, `aamad.config.example.yml`, `aamad.config.yml`, `AGENTS.md` |
| S27 | `project-context/1.define/sad.md` ADR-15, ADR-16, SA18; operator review 2026-10-13 |
| S28 | Operator decisions 2026-10-13: theme toggle P0; minimal / calm visual language; activate FR-DSH P0; UI i18n EN (default) / PT / ES full strings; override DEC-07 “UI English” exclusivity |
| S29 | Operator UX feedback 2026-10-13: UX feels messy; cannot register products; want full material registration (UoM by weight/unit/package); recipe creation must select from user catalog/inventory; popup when selected material not in stock / insufficient; product must serve any small/medium maker — not bread-only (seed demo OK as sample only) |
| S1–S24 | As cited in MRD Sources table (market and competitor URLs) |

No new market figures were introduced in this PRD.

---

## Assumptions

| ID | Category | Assumption | If false |
| --- | --- | --- | --- |
| PA1 | Inputs | `system-description.md` absent; S25 + MRD suffice | Reconcile after `*elicit-requirements` |
| PA2 | Config | Honor `aamad.config.yml` (`ui.theme: system`, `ui.visual_style: minimal`, `prefer_modals: false`) except the DEC-25 / PA22 stock-warning dialog exception | Reload config |
| PA3 | Runtime | Prefer `AAMAD_TARGET_RUNTIME`; else `runtime.target` / default `crewai` | Adapter YAML change; domain DEC-* unchanged |
| PA4 | Q3 | Margin-on-sell (DEC-01) and material-only COGS (DEC-02) | Recalc UI, tests, evals |
| PA5 | Q4 | Two-step produce-then-ship (DEC-05) is the inventory model | SAD data model change |
| PA6 | Q1/Q2 | Capstone geography remains locale-neutral for tax/compliance (DEC-07); UI languages EN/PT/ES are product UX (DEC-22), not a commercial geography choice; makers remain generic (DEC-08) | Commercial GTM geography, lots, tax |
| PA7 | Q5 | Single user (DEC-09) | Auth/RBAC epic |
| PA8 | Q6 | CSV enough (DEC-10) | Connector epic |
| PA9 | Q7 | Capstone values domain engine and agents equally | Shrink or grow FR-AGT |
| PA10 | Q8 | Mordor TAM/SAM only on slides (DEC-14) | Pitch rewrite |
| PA11 | Yield | Recipe yield field exists and is > 0. Unit cost divides by yield. Produce consumption is `line_quantity × (order_quantity / yield)` (DEC-05, SAD ADR-16) | If yield always 1, the formula still holds: consumption = line quantity × order quantity |
| PA12 | Sell price on order | Defaults to recommended (DEC-17); user may override; reports use actual sell price | Force recommended-only (no override) |
| PA13 | Opening stock | First purchase and/or **P0 manual adjust** (DEC-15) | Purchases-only seeding |
| PA14 | Date filters | Dashboard default **all-time** (DEC-20); FR-DSH is P0 Capstone UI | Add date-range epic |
| PA15 | Suggested reorder qty | Locked DEC-19; not ML; not auto-PO | Operator overrides formula |
| PA16 | Brand | **Superseded** by DEC-26 — product name is **Nexo Custo** (was BusinessFlow / A5) | Revert name |
| PA17 | MRD A17 | **Superseded** by DEC-05 (two-step produce/ship) | Do not implement single-step complete consume |
| PA18 | MRD A7 (P0) | **Superseded for P0** by DEC-12 (one-level BOM); two-level only via FR-BOM2 P1 | Nested BOM in P0 |
| PA19 | What-if | **P1 only** (DEC-13); not graded as P0 | Promote to P0 later |
| PA20 | Kickoff | One specialist per screen per kickoff (SAD ADR-15). DEC-15 includes on-hand-only adjust (no WA rewrite), aligned with SAD ADR-11 | A four-agent sequential kickoff |
| PA21 | Copilot language | MVP copilot/LLM narrative replies may remain **English** when the LLM path runs unless later scoped; UI chrome is localized (DEC-22 / FR-I18N) | Require localized LLM replies in P0 |
| PA22 | Modals | **Conflict:** `prefer_modals: false` vs operator request for a stock **popup**. **Resolution:** recommend and lock an exception — a focused dialog is allowed **only** for recipe-line stock warnings (on-hand 0 or missing stock row) per DEC-25; all other flows stay non-modal (inline/page confirmations). If FE cannot use a dialog, an unmistakably interruptive inline panel alert is the fallback — prefer dialog. | Broaden modals product-wide or force inline-only |
| PA23 | UoM set | P0 curated UoM codes are exactly `kg`, `g`, `L`, `ml`, `unit`, `pack` (DEC-24); `pack` means package. Case-normalized storage recommended in SAD. Custom free-text UoM is not P0. | Expand curated list or allow free-text in P0 |
| PA24 | Recipe stock alert severity | Recipe-time stock popup is **advisory** (dismiss and continue); order produce/ship remains the hard block (DEC-06). “Insufficient for recipe intent” at edit time means on-hand 0 or missing row for the selected material (not full BOM qty simulation against a planned batch size in P0). | Require hard-block on recipe save or batch-qty simulation |

MRD assumptions A1–A20 still apply where not superseded by DEC-* / PA-* (especially PA17–PA18 for A17/A7).

---

## Open questions

Items still needing stakeholder confirmation. **Build may proceed on DEC-* defaults.**

| ID | Question | Status in this PRD | Still blocks |
| --- | --- | --- | --- |
| Q1 | Country / commercial geography and currency for a real launch? | Capstone: locale-neutral tax/compliance + one currency (DEC-07); UI languages EN/PT/ES (DEC-22) | Tax, LGPD/GDPR, food rules |
| Q2 | Single vertical for GTM? | Generic model (DEC-08); UX must not imply bread-only; seed demo illustrative only | Lots/expiry/allergens |
| Q3 | Margin vs markup; labor in v1? | **Locked** DEC-01, DEC-02 | Only if stakeholder overrides |
| Q4 | Order complete vs separate production? | **Locked** DEC-05 (supersedes A17) | Only if stakeholder overrides |
| Q5 | Multi-user in MVP? | No (DEC-09) | If P2 must be in demo |
| Q6 | Accounting API vs CSV? | CSV (DEC-10); columns in FR-EXP | If instructor requires connector |
| Q7 | Grading weight agents vs domain? | Assumed both (PA9); chat P0, what-if P1 | Chat depth only |
| Q8 | Market-size series? | Mordor TAM+SAM (DEC-14) | External pitch only |
| Q9 | Runtime if not crewai? | Default crewai (PA3) | Adapter files |
| PRD-Q10 | Must `in_progress` be mandatory (no skip)? | **Locked** P0: no skip | Only if stakeholder wants ship-without-produce |
| PRD-Q11 | Manual inventory adjustments in P0? | **Locked** yes (DEC-15) | Only if stakeholder forbids adjusts |
| PRD-Q12 | `aamad.config.yml` present? | **Resolved** — project config present; honor `ui.*` | Config drift only |
| PRD-Q13 | Must ES reach full parity at the same milestone as PT? | Open — both are P0 first-class locales (DEC-22); sequencing of string completion not locked | FE i18n schedule only |
| PRD-Q14 | Must MVP copilot/LLM replies localize with UI locale? | Assumed **no** for MVP (PA21); UI chrome yes | FR-AGT language epic if yes |
| PRD-Q15 | Expand curated UoM list (e.g. `oz`, `lb`, `piece`) in P0? | Assumed **no** — DEC-24 set only (PA23); custom UoM with FR-UOM P1 | Catalog UX for non-metric makers |
| PRD-Q16 | Should recipe stock alert hard-block save when on-hand is 0? | Assumed **no** — advisory dialog (PA24); hard block stays on order transitions (DEC-06) | Recipe-save policy if operator wants stricter |

---

## Audit

| Field | Value |
| --- | --- |
| Timestamp | 2026-10-13T16:42:00-03:00 |
| Persona id | product-mgr / operator |
| Action | `create-prd` (delta): DEC-26 brand **Nexo Custo** + terracotta accent; PA16 superseded; UI logo/nav chrome |
| Resolved runtime | crewai (`aamad.config.yml` `runtime.target: crewai`; env unset) |
| Resolved items | Product name Nexo Custo; terracotta brand accent for logo and selected nav; prior DEC-24/25 catalog UX retained |
| Prompt trace | Operator chose brand Nexo Custo (2026-10-13) |
| Tools | edit PRD/SAD/README/FE brand assets |
| Temperature / determinism | N/A (artifact authoring in IDE) |
| Prior audit | 2026-10-13T16:19:00-03:00 — DEC-24–DEC-25 catalog UX |
| Handoff | Optional later epic: rename internal `businessflow*` package identifiers |
