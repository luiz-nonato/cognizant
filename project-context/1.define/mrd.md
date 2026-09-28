# Market Research Document — BusinessFlow

Mini ERP for small and medium entrepreneurs.

## How to use this file (context as code)

- Treat headings, IDs, and tables as the contract. Do not invent IDs.
- Cite `P1`–`P3`, `R1`–`R13`, `A1`–`A20`, `Q1`–`Q9`, `S1`–`S26` in PRD/SAD/stories.
- Prefer tables for comparisons; bullets for lists; one idea per bullet.
- Evidence lives in [Sources](#sources). Inferences live in [Assumptions](#assumptions). Unresolved items live in [Open questions](#open-questions).
- Canonical product sections: [Problem statement](#problem-statement), [Personas](#personas), [Competitive analysis](#competitive-analysis), [Market sizing](#market-sizing), [Risks](#risks). Dimension findings below add technical/UX/ops detail; they must not contradict those sections.

### Index

| ID / section | Use for |
| --- | --- |
| [Metadata](#metadata) | Runtime, brand, artifact pointers |
| [Research query](#research-query) | Primary focus and operator concept |
| [Executive summary](#executive-summary) | Pitch-length orientation |
| [Problem statement](#problem-statement) | PRD problem / JTBD |
| [Personas](#personas) | Stories and UX |
| [Competitive analysis](#competitive-analysis) | Non-goals and differentiation |
| [Market sizing](#market-sizing) | TAM/SAM/SOM; do not blend series |
| [Risks](#risks) | Mitigations and owners |
| [Dimension 1–5](#detailed-findings-by-dimension) | Feasibility, UX, ops, UVP |
| [Critical decision points](#critical-decision-points) | Go/no-go |
| [Recommendations](#actionable-recommendations) | Next actions |
| [Sources](#sources) | Citations |
| [Assumptions](#assumptions) | Inferences |
| [Open questions](#open-questions) | Stakeholder blockers |
| [Audit](#audit) | Provenance |

### Playbook — downstream agents

| Field | Value |
| --- | --- |
| Purpose | Hand off BusinessFlow market context without re-researching |
| Inputs | This file; operator concept (S25) |
| Next file | `project-context/1.define/prd.md` via `@product-mgr` `*create-prd` |
| Do | Map MVP modules to P1; honor PRD DEC-* (Q3/Q4 locked); keep A20 non-goals |
| Do not | Blend Mordor and MRFR TAM; let agents write inventory; add GL/tax/MES in v1; implement obsolete A17 single-step complete |

---

## Metadata

| Key | Value |
| --- | --- |
| product_name | BusinessFlow |
| product_type | Mini ERP (recipe costing + ops; not full ERP) |
| audience | Small and medium entrepreneurs who make products |
| artifact | `project-context/1.define/mrd.md` |
| persona | `product-mgr` |
| action | `create-mrd` |
| runtime | `crewai` |
| runtime_note | Implementation choice for MVP, not AAMAD methodology |
| config | `aamad.config.yml` absent; example has `runtime.target: crewai` |
| env | `AAMAD_TARGET_RUNTIME` unset |
| mrd_skipped | false (market-facing capstone) |

---

## Research query

### Primary focus

- Multi-agent mini-ERP for SMEs.
- Unifies: production recipes (BOM/formulas), material and FG costing, recommended sell price from target margin, inventory with low-stock alerts, suppliers, customers, purchases with price history, order status, decision dashboard.
- Explicitly not a full ERP.

### Operator concept (2026-09-28)

Users can:

- Register raw materials and inputs (purchase prices, suppliers).
- Create production recipes that turn inputs into finished products.
- See each material’s contribution to unit cost.
- Calculate recommended selling price from a desired profit margin.
- Manage inventory of raw materials and finished products.
- Receive low-stock alerts.
- Register suppliers and customers.
- Record purchases with input-price history.
- Manage orders: pending, in progress, completed.
- Review sales, margin, and profit by product.
- Use a dashboard of costs, revenue, margins, inventory, and order progress.

---

## Executive summary

### Market opportunity

- SMEs: ~90% of businesses and more than half of employment (World Bank, S1).
- SMB software (primary TAM): USD 77.33B (2026) → 107.86B (2031), CAGR 6.88% (Mordor, S4).
- SMB cloud ERP (primary SAM): USD 49.42B (2026) → 118.54B (2031), CAGR 19.12% (Mordor, S5).
- Cloud share of SMB software: 72.56%; cloud CAGR 16.92% (S4).
- Gap: production-costing and operations for makers who outgrew spreadsheets but will not buy Katana-class MRP or Odoo manufacturing implementations.

### Technical feasibility

- Domain math is standard: recipe COGS, weighted-average or last-purchase, reorder alerts, three-state orders.
- MVP does not need MES, multi-warehouse MRP II, or a general ledger.
- CrewAI fit: sequential specialist crew (costing, inventory, orders, reporting) plus forms UI.
- Agents advise; a server-side engine owns numbers (R3).
- High MVP success if scope stays: one location, one currency, **one-level** recipes in P0 (PRD DEC-12 supersedes A7 for P0; two-level = P1), advisory purchasing (A6, A20).

### Recommended approach

- Position: mini-ERP for owner-operators who make things (food, cosmetics, crafts, light assembly).
- Win on: time-to-value, recipe-level cost transparency, margin-based pricing.
- Defer: native accounting, tax engines, multi-company, e-commerce connectors, multi-level MRP (A20).
- Next artifact: PRD.

---

## Problem statement

### Who

- Owner-operators and small teams (typically 1–50 people).
- They **make** products from raw materials.
- Not pure resellers.

### Current workaround

- Spreadsheets.
- Messaging apps.
- A separate invoicing tool.
- Recipes, purchase prices, stock, and orders live in different files.

### Core problem

They cannot see, in one place:

- True unit cost by recipe.
- Recommended sell price from a target margin.
- Stock of inputs and finished goods.
- Order progress.

### Why it hurts

- Underpricing after supplier cost increases.
- Overpricing from guesswork.
- Stockouts after an order is promised.
- Hours spent reconciling error-prone spreadsheets.

### Quantified context (analog only)

- ~94% of audited business spreadsheets contain errors (S15). Not a BusinessFlow error rate.
- Global retail inventory distortion: USD 1.7T, 6.2% of sales (IHL 2026, S13–S14). Retail analog for stockout pain, not TAM (A12).

### Market gap

- Accounting tools start from the general ledger.
- MRP/ERP tools start from the factory.
- Katana Core: from USD 299/month (S17); often USD 747–1,095/month with add-ons (S18).
- Odoo manufacturing: partner quotes often USD 8k–40k (S22–S23).
- Makers sit between free Excel and real MRP.

### Job to be done

When I change an input price or a recipe, I want:

- The new unit cost.
- A margin-based price.
- Whether I can fulfill the next order.

Without hiring an implementer.

### Success if solved

- First costed SKU in the first session.
- Fewer stock surprises.
- Actual margin vs target visible by product.

### One-paragraph statement

Small and medium entrepreneurs who transform inputs into finished products run production, costing, inventory, and orders in disconnected spreadsheets. That workflow does not show each material’s contribution to unit cost, does not recommend a selling price from a desired margin, and does not alert before stock runs out. Full ERP and SMB MRP close those gaps only after cost and complexity micro makers will not pay. BusinessFlow is a mini-ERP: recipes, costs, inventory, parties, purchases with price history, order statuses, reports, and a dashboard, with agents that explain numbers rather than invent them.

---

## Personas

- Primary buyer: P1.
- Expansion: P2.
- Influencer: P3 (not v1 design center).

### Persona index

| ID | Name | Priority | Firm size | Inferred WTP |
| --- | --- | --- | --- | --- |
| P1 | Maker / artisan | Primary | 1–10 | USD 15–80/mo or Stocksmith Studio/Indie ~USD 40–100/mo (A14, A15) |
| P2 | Light manufacturer | Secondary | 10–50 | Trial below ~USD 150/mo |
| P3 | Bookkeeper-owner | Influencer | n/a | Pays if CSV/export exists |

### P1 — Maker / artisan (primary)

- Role: owner who cooks, mixes, crafts, or assembles in small batches (food, cosmetics, candles, crafts).
- System of record: the owner.
- Goals:
  - Price so the business survives.
  - Not run out of a critical input.
  - Spend less time in Excel.
- Jobs:
  - Maintain recipes.
  - Record purchases.
  - Take customer orders.
  - Check whether production is possible.
  - Glance at profit by product.
- Pain points:
  - Recipe cost is a guess.
  - Supplier increases never flow into sell price.
  - Stock lives in a notebook.
  - No pending vs completed orders.
- Behaviors:
  - Phone and laptop.
  - Local language likely (Q1).
  - Distrusts “ERP” branding.
- Adoption barrier: data entry of materials and recipes (R6).
- MVP must-haves: materials, recipes, cost stack, margin price, dual inventory, low-stock alerts, simple orders, dashboard.
- Anti-needs: shop-floor MES, multi-warehouse, native tax engine.

### P2 — Light manufacturer (secondary)

- Role: owner or ops lead; still founder-led.
- Goals: replace Excel without a six-month ERP project; see pipeline and COGS.
- Pain points: Katana from USD 299/month plus add-ons; Odoo TCO often USD 8k–40k.
- MVP stretch: two-level BOM, multi-user (Q5), CSV import.
- Risk if over-served in v1: R2 (full MRP).

### P3 — Bookkeeper-owner (influencer)

- Role: P1/P2 wearing the finance hat, or an external bookkeeper.
- Goals: year-end COGS and inventory valuation they can export; no second GL.
- Pain points: ops tools that do not export; accounting tools that do not explode recipes.
- MVP: export purchases, inventory, sales.
- Non-goal: native accounting (A20).

### Non-personas

| ID | Who | Why excluded |
| --- | --- | --- |
| NP1 | Pure retailer / omnichannel seller | Cin7 / Unleashed; no recipe-cost job |
| NP2 | Corporate controller | Needs GL, multi-entity, audit |
| NP3 | Plant manager with MES | Shop-floor, routings, WIP |

---

## Competitive analysis

### Positioning

- X axis: operational depth (spreadsheet → full ERP).
- Y axis: recipe-cost transparency (none → contribution-by-input).
- BusinessFlow target: high transparency, moderate depth.
- Below Katana/Odoo on depth.
- Above accounting tools on production costing.

### Feature comparison (MVP-relevant)

Legend: Y = typical strength; P = partial; N = weak or absent.

| Capability | Sheets | QBO/Xero | Zoho Inv | Stocksmith | Katana | Odoo Mfg | BusinessFlow (intended) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Recipe / BOM | P | N | P | Y | Y | Y | Y |
| Input % of unit cost | P | N | N | Y | P | Y | Y |
| Margin-based recommended price | P | N | N | Y | P | P | Y |
| Purchase price history | N | P | P | Y | Y | Y | Y |
| RM + FG inventory | P | P | Y | Y | Y | Y | Y |
| Low-stock alerts | P | P | Y | Y | Y | Y | Y |
| Order statuses (pending / in progress / completed) | N | P | Y | Y | Y | Y | Y |
| Sales / margin / profit by product | P | P | P | Y | Y | Y | Y |
| Ops dashboard | N | P | P | P | Y | Y | Y |
| Grounded NL explanation of cost/stock | N | N | N | N | P | P | Y (agents) |
| General ledger / tax | N | Y | N | N | N (connectors) | Y | N (non-goal) |
| Commerce connectors | N | P | Y | Y | Y | Y | Later |
| Time-to-first-value | Hours | Days | Days | Hours–days | Days | Weeks–months | Hours (target) |
| Public price band (2026) | Labor | ~USD 30–200/mo | from ~USD 29/mo | ~USD 20–349/mo | from USD 299/mo + add-ons | Seats cheap; impl. dominates | USD 15–80/mo or freemium (A14) |

### Competitor catalog

| Player | Type | 2026 public price | Gap BusinessFlow occupies |
| --- | --- | --- | --- |
| Excel / Google Sheets | Indirect | Free + labor | Errors, no reliable alerts, no order states |
| Wave / FreshBooks | Indirect accounting | Wave free; FreshBooks ~USD 17–55/mo | No production costing |
| QuickBooks / Xero | Indirect accounting | QBO ~USD 30–200/mo | Inventory ≠ recipe cost roll-up |
| Zoho Inventory | Light inventory | Free / from ~USD 29/mo | Weak manufacturing-cost narrative |
| Stocksmith (Craftybase, A13) | Direct (makers) | ~USD 20–349/mo | Strong analog; often channel-centric (R5) |
| Katana | Direct SMB MRP | Core from USD 299/mo + usage/add-ons | Too expensive/complex for many micro makers |
| Cin7 / Unleashed | Mid-market inventory | Often ~USD 349–399/mo entry | Overkill |
| Odoo Manufacturing | Modular ERP | Cheap seats; implementation dominates TCO | Complexity, partner dependency |
| SAP B1 / BC / NetSuite | Upper mid-market | Quote; high TCO | Out of mini-ERP range |
| inFlow / Fishbowl | Adjacent | Mid SMB | Weaker cost → recommended price story |

### How to compete

| Competitor | Beat them by | Do not try to beat them on |
| --- | --- | --- |
| Spreadsheets | Alerts, statuses, one source of truth | Zero data-entry cost |
| QBO / Xero / Wave | Recipe roll-up and recommended price | Accounting completeness |
| Stocksmith | Simpler ops+order loop; agent explanations | Mature Etsy/Shopify COGS tax story |
| Katana | Price, simplicity, first-session costing | MRP depth, omnichannel, usage-based scale |
| Odoo | Self-serve, no partner project | Module breadth, localization, costing methods |

---

## Market sizing

### Rules

- Use published envelopes.
- Do not invent a bottom-up firm count.
- Do not blend analyst series (R9, Q8).
- SOM stays qualitative until Q1 is answered (A10).

### TAM / SAM / SOM

| Layer | Definition | Figure | Growth | Slide rule | Source |
| --- | --- | --- | --- | --- | --- |
| TAM (primary) | Global SMB software | USD 77.33B (2026) → 107.86B (2031) | CAGR 6.88% | Use this TAM | S4 |
| TAM (cross-check) | Global SMB software | USD 79.82B (2026) → 151.74B (2035) | CAGR 7.4% | Same order of magnitude | S7 |
| TAM (do not mix) | Broader SMB software | USD 186.98B (2025) | CAGR 8.83% to 2035 | Upper bound only | S8 |
| SAM (preferred) | SMB cloud ERP | USD 49.42B (2026) → 118.54B (2031) | CAGR 19.12% | Use this SAM | S5 |
| SAM (conservative) | Small-business ERP | USD 9.39B (2026) → 17.7B (2033) | CAGR 9.5% | If “small” not “all SMB” | S10 |
| SAM (context) | Cloud ERP all sizes | USD 56.53B (2026) | CAGR 19.65%; SME CAGR 20.65% | Cloud ERP growth | S6 |
| SOM | Micro/small makers; 1 site; 1–2 level recipes; owner-primary; USD 15–80/mo | Not quantified | n/a | State unestimated | A9, A10 |

### Growth and demand context

- SAM preferred window: 2026 USD 49.42B → 2031 USD 118.54B at 19.12% CAGR (five-year published window).
- Drivers cited by Mordor: subscription pricing, compliance, embedded AI, vertical modules, inflation/supply-chain cost control.
- Cloud already 72.56% of SMB software deployments (S4).
- Accounting/finance still 26.30% of SMB software revenue in 2025 (S4). Production/inventory remain relatively under-served.
- North America 39.60% revenue (2025); APAC CAGR 15.35% (S4).
- Integration: ~9 cloud tools; 66% of small firms cite integration headaches (S4).

### SOM discipline

A numeric SOM would need:

- Country and language (Q1).
- Count of maker SMEs.
- Conversion.
- ARPU.

Capstone planning uses P1 plus price band, not a percentage of TAM.

---

## Risks

Likelihood and impact are planning judgments (A19).

| ID | Risk | Type | Likelihood | Impact | Mitigation | Owner next |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Margin vs markup, or current vs historical COGS, left ambiguous | Product / trust | High | High | PRD locks formula; UI labels method; store cost-at-sale | product-mgr |
| R2 | Scope creep to full ERP (GL, tax, MES, multi-warehouse) | Delivery | High | High | Non-goals in PRD; MVP = operator concept only | product-mgr / system.arch |
| R3 | LLM invents costs or stock | Technical / safety | High | High | Deterministic costing/inventory service; agents narrate validated JSON only | system.arch / backend |
| R4 | Geography/compliance unspecified (tax, LGPD/GDPR, food lots) | Legal / launch | High | High | Default one region in PRD or capstone-demo PII limits | stakeholder |
| R5 | Stocksmith overlap if GTM is English maker + e-commerce | Market | Medium | Medium | Differentiate on agent explanations + order dashboard | product-mgr |
| R6 | Data-entry burden keeps users in Sheets | Adoption | Medium | High | Time-to-first-costed-SKU; CSV import as MVP+ | frontend / PRD |
| R7 | Concurrent negative stock | Technical | Medium | High | Transactional updates; order state machine | backend |
| R8 | Prompt injection via order/customer notes | Security | Medium | Medium | Limit LLM inputs; no write tools without API | security.eng |
| R9 | Market-size series mixed in a pitch | Communication | Medium | Medium | Use Mordor TAM + SAM only; footnote others | product-mgr |
| R10 | Odoo TCO quoted as a single number | Communication | Medium | Low | Cite a range (S22 vs S23 disagree) | product-mgr |
| R11 | Runtime adapter change mid-build | Technical | Low | Low | Keep contracts runtime-agnostic except adapter YAML | project.mgr |
| R12 | Patent/FTO unknown | Legal | Low | Low | No novelty claims | stakeholder |
| R13 | Capstone graded only on agents or only on domain | Academic | Medium | Medium | Confirm weighting (Q7) | stakeholder |

### Risk by severity

- High: R1, R2, R3, R4.
- Medium: R5, R6, R7, R8, R9, R10, R13.
- Low: R11, R12.

---

## Detailed findings by dimension

### 1. Market analysis and opportunity assessment

Canonical tables: [Market sizing](#market-sizing), [Personas](#personas), [Competitive analysis](#competitive-analysis).

#### Key insights

- The buyer is huge; the job is narrow: know true unit cost, price with a margin, do not run out of inputs.
- Cloud ERP for SMBs is the high-growth envelope (S5, S6). Do not blend series.
- Fragmentation is the incumbent: ~9 tools; 66% integration pain; accounting takes 26.30% of SMB software revenue (S4).
- Price canyon: Stocksmith ~USD 20–349/mo; Katana from USD 299/mo; Odoo implementation in the low-to-mid five figures for manufacturing.
- Inventory error is expensive at retail scale (S13–S15); use only as analog (A12).

#### Business case

- Owner spending several hours per week reconciling stock and repricing can exceed a low SaaS fee via labor plus avoided stockouts and underpricing.
- Value proposition to validate in PRD: see true recipe cost in minutes, set a margin, avoid discovering a stockout after an order is promised.

#### Implications

- Do not compete on accounting, payroll, or omnichannel.
- Compete on recipe cost transparency plus operational control.
- Price and UX closer to Stocksmith than to Katana.
- Pick one default geography/vertical in PRD (Q1, Q2).

#### Sources (this dimension)

S1–S10, S13–S23.

---

### 2. Technical feasibility and requirements analysis

#### Key insights

- Costing formulas differ: sell = cost / (1 − margin) vs cost × (1 + markup). Lock in PRD (Q3, A16).
- MVP costing method: weighted average or last purchase, plus purchase price history. FIFO later (perishables).
- Agent architecture advises; it is not the ledger (R3).
- Runtime `crewai` is default and sufficient for “why unprofitable?” and “what to reorder?”
- MVP integrations: database, auth, CSV export. Later: QBO/Xero, Shopify/WhatsApp, barcode.
- Scale: single-tenant or few tenants. Bottlenecks: concurrent stock decrement, BOM recalc on price change, LLM cost if every widget calls a crew.

#### Agent catalog (intended)

| Agent | Job | Writes inventory? |
| --- | --- | --- |
| Costing | Explain contribution cost and recommended price from engine output | No |
| Inventory | Explain stock, alerts, reorder suggestions | No |
| Orders | Summarize pipeline and status | No |
| Insights / Dashboard | Narrate KPIs | No |

Authoritative writes: application services only.

#### Runtime controls (crewai)

- Sequential process.
- `allow_delegation=false`.
- `max_iter` <= 12.
- `max_retry_limit` >= 2.
- Memory default false.
- Tools least-privilege.

#### Technical risk → mitigation

| Risk | Mitigation | Maps to |
| --- | --- | --- |
| LLM invents costs | Server-side costing engine; agents narrate validated JSON | R3 |
| Price change vs historical margin | Separate current recipe cost from cost at time of sale | R1 |
| Negative stock / races | Transactional inventory; order state machine | R7 |
| Scope creep to full ERP | Explicit non-goals | R2, A20 |
| Runtime/API cost | Cache dashboard aggregates; crew on ask or digest | — |

#### Infrastructure (indicative)

- Web app + API + Postgres (or equivalent).
- Optional Redis.
- LLM via env (`OPENAI_API_KEY` or org gateway).
- Capstone model spend: tens of dollars if chat is bounded.

#### Implications

- SAD specifies a costing service as a non-agent component.
- PRD must fix Q3 and Q4.

#### Sources (this dimension)

S21, S25, S26; adapter-crewai / adapter-registry.

---

### 3. User experience and workflow analysis

#### Key insights

- Happy path is a weekly ops loop, not chatbot-only.
- Chat accelerates: “why did margin drop on Product A?”
- HITL required for prices, recipe edits, order status, reorder suggestions.
- Do not auto-place supplier POs in MVP (A20).
- If the first session does not produce a trustworthy unit cost and recommended price, users stay in Sheets (R6).
- UI language: “recipe,” not “MRP explosion.”

#### User journey

1. Sign up / login.
2. Add suppliers and raw materials (unit, last price, reorder point).
3. Create recipe: inputs + quantities → finished product.
4. Review cost contribution and recommended price (target margin).
5. Record purchase (updates price history and stock).
6. Register customer and create order (pending).
7. Move order `pending` → `in_progress` (produce) → `completed` (ship); inventory per PRD DEC-05 (**supersedes A17**).
8. Dashboard: revenue, costs, margins, low stock, order pipeline.
9. Optional chat: explanations and what-if (e.g. supplier price +10%).

#### Automation vs HITL

| Task | MVP | Later |
| --- | --- | --- |
| Unit cost from recipe | Full auto (deterministic) | Landed cost, waste %, labor |
| Recommended price | Auto from user margin | Competitive/price tests |
| Low-stock alert | Auto when below threshold | Demand forecast |
| Reorder quantity | Suggest only | Auto PO |
| Order status | User-driven | Shop-floor scan |
| Insights narrative | Agent | Scheduled digest |

#### Success metrics (product)

- Time to first costed SKU.
- Percent of SKUs with a recipe.
- Stockout incidents.
- Margin actual vs target.
- Weekly active use of dashboard/alerts.

#### Implications

- Frontend: dashboard + master data + orders; chat as copilot.
- E-commerce, barcode, multi-user: future unless PRD promotes them (Q5).

#### Sources (this dimension)

S25, S4 (gen-AI copilots), S16, S21.

---

### 4. Production and operations requirements

#### Key insights

- Capstone: single service or compose stack.
- Production SaaS later: multi-tenant, backups, migrations.
- Observability: crew start/stop, costing I/O (no secrets), inventory mutation ids, order transitions.
- Security: auth, tenant isolation, no secrets in git, dependency audit.
- If `aamad.config.yml` is copied from example: `security.require_security_assessment: true`.
- GDPR/LGPD applies if shipped in EU/BR (Q1).
- Not PCI unless payments are added (A20).
- Never silently change historical sale margins.

#### Ops risks

- Data loss without backups: halt-level for real users.
- Prompt injection via notes: R8.
- Availability: down app blocks sales recording; document local-run.

#### Cost structure (indicative, not a budget)

- Capstone: operator time + LLM API.
- Commercial: cloud + support + LLM.

#### Implications

- Security assessment before Deliver if config requires it.
- `.env.example` names keys only.

#### Sources (this dimension)

S26; Mordor cybersecurity-skills-gap narrative in S4.

---

### 5. Innovation and differentiation analysis

#### Key insights

- UVP: mini-ERP that starts from recipe cost and margin, not from the GL.
- Agentic layer differentiates only if grounded (R3).
- Emerging pattern: agentic ERP as system of action. MVP suggests; it does not execute purchases.
- Patent landscape: not searched at claim level (A11, R12).
- Monetization (post-capstone): freemium (limited SKUs) → subscription; optional accountant read-only; later connectors.
- Avoid usage-based order taxes that make Katana expensive for high-volume, low-ticket sellers.

#### Partnerships (later)

- Accountants.
- Packaging suppliers.
- Local SME agencies.
- Commerce platforms after the core loop is solid.

#### Implications

- Story: simple control + correct price, not autonomous factory.
- Document AI as advisory.

#### Sources (this dimension)

S12, S4, S19–S21, S8.

---

## Critical decision points

### Go / no-go

| Decision | Condition |
| --- | --- |
| Go | MVP produces trustworthy unit cost and recommended price from a recipe in the first session, persists stock, and shows order pipeline — without a consultant |
| No-go as commercial ERP | v1 requires native tax, multi-company, or shop-floor MES |
| No-go as agent demo | Crew may overwrite inventory without a transactional API |

### Technical architecture choices

- Default runtime: CrewAI, sequential specialists, YAML configs, no memory unless justified.
- Deterministic costing/inventory service + optional LLM narration.
- Single currency, single warehouse, **one-level BOM in P0** (A6; A7 superseded for P0 by PRD DEC-12).
- Order statuses: pending / in progress / completed with two-step inventory (PRD DEC-05 supersedes A17).

### Market positioning

- Primary: P1.
- Secondary: P2.
- Not: NP1–NP3.

### Resource requirements

- Define: this MRD → PRD → stories → SAD.
- Build: AAMAD crew (project manager, frontend, backend, integration, QA, security).
- Timeline: MVP in one AAMAD pass.
- Budget: LLM + hosting; no paid full analyst reports (A18).

---

## Actionable recommendations

### Immediate (48 hours)

1. Confirm Q1, Q3, Q4.
2. Run `@product-mgr` `*create-prd`.
3. Optional: copy `aamad.config.example.yml` → `aamad.config.yml`.
4. Set `AAMAD_TARGET_RUNTIME=crewai` before Build.

### Short-term (30 days)

- PRD + stories: materials, recipes/costing, pricing, inventory/alerts, parties, purchases/history, orders, reports/dashboard, copilot chat.
- SAD: costing service, data model, agent boundaries, evals (cost accuracy, alert correctness, latency).
- Prototype the cost-stack UI before expanding chat.

### Long-term (6–12 months)

- CSV import; accounting export; optional lots/expiry; RBAC; connectors.
- If commercializing: one vertical; Stocksmith Studio/Indie price band; first costed SKU under 30 minutes.
- Agentic “system of action” only after eval-gated suggestion quality.

---

## Sources

Vendor and analyst landing pages are directional, not purchased full reports (A18).

| ID | Source | URL / locator | Date |
| --- | --- | --- | --- |
| S1 | World Bank Group — SMEs Finance | https://www.worldbank.org/ext/en/topic/competitiveness/small-and-medium-enterprises-smes-finance | 2026-09-28 |
| S2 | World Bank Open Knowledge — SME share | https://openknowledge.worldbank.org/items/50dccfb5-81ec-4d9e-a1d9-3b9c266ab2f2 | 2026-09-28 |
| S3 | ICSB Global MSME Report 2025 | https://icsb.org/wp-content/uploads/2025/08/msme-report-2025_compressed.pdf | 2025 |
| S4 | Mordor — SMB Software Market | https://www.mordorintelligence.com/industry-reports/smb-software-market | 2026-09-28 |
| S5 | Mordor — SMBs Cloud ERP | https://www.mordorintelligence.com/industry-reports/smbs-cloud-enterprise-resource-planning-market | 2026-09-28 |
| S6 | Mordor — Cloud ERP | https://www.mordorintelligence.com/industry-reports/cloud-erp-market | 2026-09-28 |
| S7 | Business Research Insights — SMB Software | https://www.businessresearchinsights.com/market-reports/small-and-medium-business-smb-software-market-108773 | 2026-09-28 |
| S8 | Market Research Future — SMB Software | https://www.marketresearchfuture.com/reports/smb-software-market-27988 | 2026-09-28 |
| S9 | Straits Research — Cloud ERP | https://straitsresearch.com/report/cloud-erp-market | 2026-09-28 |
| S10 | Verified Market Reports — Small Business ERP | https://www.verifiedmarketreports.com/product/small-business-erp-software-market/ | 2026-09-28 |
| S11 | The Business Research Company — Cloud-Based ERP | https://www.thebusinessresearchcompany.com/report/cloud-based-erp-global-market-report | 2026-09-28 |
| S12 | Enersys — SME ERP Global Update 2026 | https://enersys.co.th/en/insights/sme-erp-global-update-services-manufacturing-2026 | 2026 |
| S13 | IHL — 2026 Inventory Distortion Study | https://www.ihlservices.com/product/inventory-distortion-study-2026/ | 2026 |
| S14 | IHL — Key research findings | https://www.ihlservices.com/news/ihl-research-findings/ | 2026-09-28 |
| S15 | Phys.org — spreadsheet errors (~94%) | https://phys.org/news/2024-08-business-spreadsheets-critical-errors.html | 2024-08-13 |
| S16 | inFlow — outgrown spreadsheets | https://www.inflowinventory.com/blog/spreadsheets-for-inventory/ | 2026-09-28 |
| S17 | Katana pricing | https://katanamrp.com/pricing/ | 2026-09-28 |
| S18 | Brahmin — Katana add-on totals | https://www.brahmin-solutions.com/blog/katana-pricing | 2026 |
| S19 | Software Connect — Stocksmith / Craftybase | https://softwareconnect.com/reviews/craftybase/ | 2026-09-28 |
| S20 | Costbench — Stocksmith plan ladder | https://costbench.com/software/inventory-management/craftybase/ | 2026-09-28 |
| S21 | TechUltra — Odoo vs Katana | https://www.techultrasolutions.com/compare/odoo-vs-katana | 2026 |
| S22 | PPTSS — Odoo manufacturing cost US (USD 15k–40k) | https://www.pptssolutions.com/blogs/odoo-manufacturing-cost-pricing-in-us-2026 | 2026 |
| S23 | Odoo Lab — implementation cost (small USD 8k–25k) | https://odoo-lab.com/blog/odoo-implementation-cost-2026/ | 2026 |
| S24 | Ramp — ERP vs accounting | https://ramp.com/blog/erp-vs-accounting | 2026-09-28 |
| S25 | Operator product concept | Cursor session, BusinessFlow mini-ERP | 2026-09-28 |
| S26 | AAMAD framework | `.cursor/templates/mrd-template.md`, `.cursor/agents/product-mgr.md`, `aamad.config.example.yml`, `AGENTS.md` | 2026-09-28 |

---

## Assumptions

| ID | Category | Assumption | If false |
| --- | --- | --- | --- |
| A1 | Artifact | MRD owned by `product-mgr` `*create-mrd` | Re-file; content still valid |
| A2 | Inputs | No system-description.md or prd.md at first authoring; S25 is the system description | Reconcile PRD with elicitation |
| A3 | Runtime | Target runtime is crewai | Rebuild adapter YAML; domain unchanged |
| A4 | MRD scope | Market-facing; MRD not skipped | Move skip rationale to PRD |
| A5 | Brand | Product name is BusinessFlow | Rename artifacts |
| A6 | MVP shape | Single location, single currency, owner-primary user | Add warehouse/FX/RBAC |
| A7 | Domain | **Superseded for P0 by PRD DEC-12** (one-level BOM). Two-level only if PRD FR-BOM2 (P1) is in scope. Original: at most two levels. | Nested BOM in P0 without FR-BOM2 |
| A8 | Agents | Chat is in scope; numbers still come from a deterministic engine | Chat can slip; engine cannot |
| A9 | Geography | Country/language unspecified; prices in USD | Relocalize copy, tax, compliance |
| A10 | SOM | Numeric SOM is not estimated | Needs firm-count and GTM |
| A11 | IP | Patent FTO not performed; no novelty claim | Legal review before launch |
| A12 | Analog data | IHL stats are retail analog only | Do not cite as TAM |
| A13 | Competitors | Craftybase and Stocksmith are the same line after 2026 rebrand | Split only if market splits |
| A14 | Pricing | Commercial band USD 15–80/month or freemium is inferred | Validate with interviews |
| A15 | WTP | P1/P2 WTP inferred from public list prices, not a survey | Do not use in a fundraise model |
| A16 | Formula | Likely default: margin on sell price, not markup on cost, until PRD locks Q3 | UI and tests change |
| A17 | Inventory | **Superseded by PRD DEC-05**: produce on `pending`→`in_progress` (consume RM, +FG); ship on `in_progress`→`completed` (−FG, cost-at-sale). Do not implement single-step complete consume. | Revert to single-step only if stakeholder overrides Q4 |
| A18 | Analyst data | Landing-page figures are directional | Re-verify before external pitch |
| A19 | Risk scores | Likelihood/impact are planning judgments | Fine for capstone |
| A20 | Non-goals | Out of MVP: native GL, tax engine, payments/PCI, multi-company, MES, auto-PO, e-commerce connectors | Any one is a new epic |

---

## Open questions

| ID | Question | Blocks | Related |
| --- | --- | --- | --- |
| Q1 | Target country, language, and currency? | Tax, LGPD/GDPR, food rules, copy | R4, A9 |
| Q2 | Vertical for MVP: food/cosmetics vs crafts/assembly vs both? | Lots, expiry, allergens | R4 |
| Q3 | Selling price: margin on sell price vs markup on cost? Labor/overhead/waste in v1? | **Locked in PRD** DEC-01, DEC-02 | R1, A16 |
| Q4 | Completing an order auto-consume recipe qty, or is production a separate transaction? | **Locked in PRD** DEC-05 (supersedes A17) | R7, A17 |
| Q5 | Multi-user and permissions in MVP? | Auth/RBAC | P2, A6 |
| Q6 | Accounting integration required, or is CSV enough? | P3, integrations | A20 |
| Q7 | Capstone graded on agents, domain, or both equally? | Scope of chat vs engine | R13 |
| Q8 | Which market-size series for slides? | Pitch integrity | R9 |
| Q9 | Confirm AAMAD_TARGET_RUNTIME if not crewai | Adapter YAML | A3, R11 |

---

## Audit

| Field | Value |
| --- | --- |
| Timestamp | 2026-09-28T18:10:00-03:00 |
| Persona id | product-mgr |
| Action | quality-pass patch (mark A7/A17 superseded by PRD DEC-12 / DEC-05; Q3/Q4 locked) |
| Resolved runtime | crewai |
| Style | Agent-readable Markdown: index, playbook, short table cells, one idea per bullet |
| Prompt trace | Prior create-mrd; PRD DEC-* locks; `.cursor/agents/product-mgr.md` |
| Tools | edit `project-context/1.define/mrd.md` |
