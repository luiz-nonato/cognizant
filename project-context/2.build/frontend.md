# Nexo Custo — Frontend Implementation

Persona: `@frontend.eng` (`frontend-eng`)  
Action: `document-frontend`  
Artifact: `project-context/2.build/frontend.md`  
Resolved runtime (FE contract note): **`crewai`** — copilot UI is **non-streaming** request/response (`POST /copilot/chat`; ADR-05)

This document describes the **current** frontend under `frontend/` (Week 3 slice + Sprint 4 ops screens, catalog UX, i18n/theme, live API client). It replaces the prior Week-3 mock-only write-up.

---

## 1. Product branding

| Item | Implementation |
| --- | --- |
| Display name | **Nexo Custo** (DEC-26) — `index.html` `<title>`, `AppShell` `<h1>`, favicon |
| Logo | `/nexo-custo-logo.jpg` in header (`frontend/public/`) |
| Accent | Terracotta CSS vars `--bf-accent` (`#c45c26` light / `#e07a45` dark); active nav uses accent |
| Tagline | Localized via `app.tagline` |
| Legacy strings | Package name `businessflow-frontend`; user-menu meta still shows `BusinessFlow`; CSS/pref keys use `bf.*` prefixes |

---

## 2. Stack & UI preferences

| Item | Choice | Trace |
| --- | --- | --- |
| Framework | React **19.3.0** + Vite **6.4.4** + TypeScript **5.8.3** | setup.md; ADR-09 |
| Styling | Plain CSS (`index.css`); CSS variables; **no Tailwind / no Next.js** | Operator + ADR-09 |
| Visual style | Minimal / calm panels, tables, sparse chrome | `aamad.config.yml` `ui.visual_style: minimal`; DEC-23 |
| Theme | Light / dark / **system** toggle; persisted in `localStorage` (`bf.theme`); default **system** | DEC-21 / FR-THEME; `ui.theme: system` |
| i18n | Full UI catalogs **EN** (default), **PT**, **ES**; persisted (`bf.locale`) | DEC-22 / FR-I18N |
| Modals | `prefer_modals: false` in config; **implemented dialogs** for catalog create/edit, inventory adjust, order create, and DEC-25 stock warning (operator UX note in `aamad.config.yml`) | DEC-25 / PA22 + operator 2026-10-13 |
| Currency display | `VITE_CURRENCY_CODE` → `USD`=`$` or `BRL`=`R$` (default USD) | ADR-14 |
| Copilot transport | Non-streaming JSON | ADR-05; runtime `crewai` |

---

## 3. How to run

```powershell
cd frontend
npm install   # if needed
npm run dev   # Vite default http://localhost:5173
npm run build # tsc -b && vite build
npm run preview
```

Env vars are Vite-prefixed. Copy names from repo-root `.env.example` into root or `frontend/.env` (Vite loads env for the frontend package).

| Name | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | When set (and mock not forced), live `fetch` client base (e.g. `http://127.0.0.1:8000`) |
| `VITE_USE_MOCK` | `true` forces mock client even if base URL is set |
| `VITE_API_BEARER_TOKEN` | Optional `Authorization: Bearer …` for live mode (local MVP; do not ship production secrets in Vite builds) |
| `VITE_CURRENCY_CODE` | `USD` or `BRL` for symbol/formatting (mirrors backend `CURRENCY_CODE`) |

Banner under the header shows currency code/symbol and **Live** (with base URL) vs **Mock**.

---

## 4. Application structure

```
frontend/
  index.html                 # Title + favicon Nexo Custo
  public/
    nexo-custo-logo.jpg
    favicon.jpg
  src/
    main.tsx                 # ThemeProvider → I18nProvider → App
    App.tsx                  # View routing; loads materials/recipes/ops/dashboard
    index.css                # Tokens, layout, terracotta accent, light/dark
    api/
      types.ts               # Material, Recipe, Costing, Inventory, Orders, HITL, Copilot, Dashboard
      client.ts              # createLiveApiClient / createMockApiClient / apiClient / isLiveApiMode
    mocks/fixtures.ts        # Seed flour/bread/costing/inventory + mock copilot/food
    config/
      currency.ts            # resolveCurrencyCode, formatMoney, formatPercent
      uom.ts                 # CURATED_UOMS (kg, g, L, ml, unit, pack)
      payment.ts             # cash, card, pix, bank_transfer, other
    prefs/storage.ts         # locale + theme localStorage
    theme/ThemeProvider.tsx
    i18n/
      I18nProvider.tsx
      messages.ts            # EN / PT / ES string catalogs
      formatters.ts          # UoM, demo names, cost method labels
    hooks/usePagination.ts   # Client-side paging (10/25/50)
    components/
      AppShell.tsx           # Brand, nav, Future Work stubs, UserMenu
      UserMenu.tsx           # Locale + theme controls
      NavIcons.tsx
      FutureWorkBadge.tsx
      DashboardView.tsx
      MaterialView.tsx       # List/create/edit + food-product lookup
      RecipeView.tsx         # List/create/edit + stock dialog + CostStack + Copilot
      CostStack.tsx
      CopilotPanel.tsx
      InventoryView.tsx      # Table + HITL adjust + HitlPanel
      OrdersView.tsx         # Table + HITL create/produce/ship + HitlPanel
      HitlPanel.tsx
      ModalDialog.tsx
      PaginationBar.tsx
```

Default landing view: **Dashboard** (`AppView = 'dashboard'`).

---

## 5. Screens (implemented today)

### 5.1 Shell & preferences

- **AppShell**: primary nav — Dashboard, Materials, Recipes, Inventory, Orders.
- **Future Work** (disabled + badge): Suppliers, Customers, Purchases, Reports.
- **UserMenu** (header): language EN/PT/ES; theme light/dark/system.
- No separate Chat nav item — copilot is an in-panel on Recipes.

### 5.2 Dashboard

- Loads `GET /dashboard` (or mock aggregate).
- KPIs: revenue, COGS, profit, margin %, low-stock count.
- Order pipeline counts: pending / in_progress / completed.
- Low-stock alerts table; top products by profit.
- Period copy reflects all-time (DEC-20 / ADR-10); no date-range filter in UI.
- Trace: FR-DSH.

### 5.3 Materials

- Paginated catalog table: name, UoM, list price, reorder point; row select + **Edit**.
- **Create / Edit** via `ModalDialog`: name, curated UoM select, list price ≥ 0, reorder point ≥ 0 → `POST`/`PUT /materials`.
- **External food lookup** panel: `GET /external/food-products?q=` — suggestions table (name, brand, qty label, barcode); advisory only (does not auto-create material).
- Trace: FR-MAT, DEC-24; external lookup per integration.

### 5.4 Recipes + cost stack + DEC-16

- Paginated recipe catalog; select recipe loads `GET /recipes/{id}/costing`.
- Detail: yield, FG SKU, target margin, line list; **CostStack** (total material, unit cost, recommended price, line contributions).
- **Zero-cost label**: when `unit_cost === 0` or `recommended_price_label === "n/a / zero cost"`, UI shows localized **n/a / zero cost** (DEC-16). Recipe checkbox swaps display to fixture `COSTING_ZERO` for local demo.
- **Create / Edit** dialog: name, yield, target margin, optional FG SKU, lines from **material catalog** (UoM locked to material UoM — DEC-18).
- **Stock warning dialog** (native `<dialog>`): on material pick with missing inventory row or on-hand ≤ 0 — dismissible advisory (DEC-25 / PA22).
- Trace: FR-RCP, FR-CST, FR-PRC, DEC-16/18/25.

### 5.5 Copilot (Recipes)

- `CopilotPanel` on selected recipe: message → `POST /copilot/chat` with `context.screen: "recipe"`, `entity_ids: [recipeId]`.
- Renders: `reply`, `agent`, `grounding_timestamp`.
- Optional Week-4 bonus fields when present: `crew_plan`, `agent_reasoning` (planning/reasoning blocks).
- Non-streaming; busy/error states. Mock path only supports `screen === "recipe"`.
- Trace: FR-AGT, ADR-05, ADR-15 (recipe → `costing_analyst`). Copilot narrative language may remain English (PA21) while chrome is localized.

### 5.6 Inventory

- Paginated RM/FG table: type, SKU, name, UoM, on-hand, reorder, unit cost; low-stock highlighting where applicable.
- **Propose adjust** dialog → HITL `inventory_adjust` (sku, item_type, delta, reason).
- Embedded **HitlPanel** for pending approvals.
- Trace: FR-INV, DEC-15 (manual adjust via HITL).

### 5.7 Orders

- Paginated orders: product, FG SKU, qty, sell price, payment method, status; actions by state:
  - `pending` → propose **produce** (`order_produce`)
  - `in_progress` → propose **ship** (`order_ship`)
  - `completed` → done
- **Create order** dialog: recipe with FG SKU, qty, sell price (suggested from costing), payment method (`cash`/`card`/`pix`/`bank_transfer`/`other`), notes → HITL `order_create`.
- Embedded **HitlPanel**.
- Trace: FR-ORD; payment prefs in FE `config/payment.ts`.

### 5.8 HITL panel

- Lists pending proposals (`GET /hitl/proposals?status=pending`).
- Shows summary, action code, JSON payload; feedback textarea.
- Approve (optional feedback) / Reject (feedback required).
- Used on Inventory and Orders; mutations are proposal-based (agents do not write stock/orders — DEC-11).

### 5.9 Future Work badges

- Nav stubs: Suppliers, Customers, Purchases, Reports — disabled buttons with localized **Future Work** badge.
- Not implemented as screens: full FR-SUP/CUS/PUR/RPT UI, CSV export, FR-AUTH product login UI, inventory/order/dashboard specialist copilots in-panel.

---

## 6. Live vs mock API boundary

**Resolver** (`api/client.ts` → `isLiveApiMode` / `resolveApiClient`):

1. `VITE_USE_MOCK=true` → mock  
2. Else non-empty `VITE_API_BASE_URL` → `createLiveApiClient`  
3. Else mock  

Integration has already wired the live client; FE no longer requires a compile-time swap.

| Capability | Live (`fetch`) | Mock |
| --- | --- | --- |
| Materials list/get/create/update | Yes | In-memory seed + create/update |
| Recipes list/get/create/update + costing | Yes | Seed bread + local costing recompute |
| Copilot chat | Yes | Recipe-only mock reply |
| Inventory / orders GET | Yes | Seed inventory; orders start empty |
| HITL create/list/approve/reject | Yes | Session-local queue; approve mutates mock inv/orders |
| Food products search | Yes | Fixture filter |
| Dashboard | Yes | Built from mock orders/inventory |
| `GET /health` | Documented in `SPRINT4_ENDPOINTS`; **not called by UI** | — |

Endpoint map constant: `SPRINT4_ENDPOINTS` in `client.ts` (alias `WEEK3_ENDPOINTS` deprecated).

Types live in `frontend/src/api/types.ts` and align with FastAPI schemas (including optional `crew_plan` / `agent_reasoning` on copilot response).

---

## 7. Currency, UoM, payment prefs

| Concern | Behavior |
| --- | --- |
| Currency | Deployment code from `VITE_CURRENCY_CODE`; amounts via `formatMoney` with locale-aware number grouping + `$` / `R$` |
| UoM | Curated set only: `kg`, `g`, `L`, `ml`, `unit`, `pack` (`config/uom.ts`); labels localized; recipe lines inherit material UoM |
| Payment | Order create select: cash, card, pix, bank_transfer, other (`config/payment.ts`); labels localized |

---

## 8. i18n & theme details

- Catalogs: `MESSAGES.en` / `.pt` / `.es` covering nav, forms, HITL, dashboard, errors, pager, Future Work, payment/status labels.
- Demo seed names (Flour / Simple Bread) can be localized via formatters when ids match seed.
- Theme applies `data-theme` + `color-scheme` on `<html>`; system follows `prefers-color-scheme` and updates on change.
- Number/percent formatting uses BCP-47 from active locale (`en`, `pt-BR`, `es`).

---

## 9. Known gaps / future work (visible or deferred)

| Gap | Notes |
| --- | --- |
| Nav Future Work | Suppliers, Customers, Purchases, Reports — stub only |
| Copilot screens | Only recipe panel; inventory/orders/dashboard specialists not exposed in UI |
| Auth UI | No FR-AUTH login screen; optional Bearer via env for local API |
| User-menu meta | Still shows legacy `BusinessFlow` string |
| Currency source | FE uses `VITE_CURRENCY_CODE`, not `GET /health` |
| Reports / CSV | Not in FE |
| Streaming | Deferred (ADR-05) |
| Modal breadth | Catalog/order/inventory forms use dialogs beyond the DEC-25 stock-only exception (recorded in config comments) |
| ES string parity | ES catalog exists; PRD-Q13 sequencing nuance remains a product open question |

---

## 10. Traceability summary

| Area | PRD / SAD |
| --- | --- |
| Brand Nexo Custo + terracotta | DEC-26 |
| Dashboard home + all-time | FR-DSH, DEC-20, ADR-10 |
| Materials create/list/edit + curated UoM | FR-MAT, DEC-24, PA23 |
| Recipe picker + stock dialog | FR-RCP, DEC-25, PA22 |
| Cost stack / zero-cost label | FR-CST, FR-PRC, DEC-16 |
| Inventory adjust via HITL | FR-INV, DEC-15 |
| Orders three-state + HITL | FR-ORD |
| Theme + minimal style | FR-THEME, DEC-21, DEC-23, NFR-U4 |
| Locales EN/PT/ES | FR-I18N, DEC-22 |
| Currency USD/BRL | ADR-14, DEC-07 |
| Non-streaming copilot | ADR-05, FR-AGT, ADR-15 |
| Stack pin | ADR-09, setup.md |

---

## Sources

- `project-context/1.define/prd.md` (DEC-07, DEC-16, DEC-18, DEC-20–DEC-26, FR-MAT/RCP/CST/INV/ORD/DSH/AGT/I18N/THEME, PA21–PA23)
- `project-context/1.define/sad.md` (ADR-05, ADR-09, ADR-10, ADR-14, ADR-15, §3 Frontend, Week 3 guidance)
- `project-context/2.build/setup.md` (React+Vite+TS pins, env names)
- `project-context/2.build/integration.md` (live/mock gating, Sprint 4 endpoints)
- `aamad.config.yml` (`ui.theme`, `ui.visual_style`, `prefer_modals`, runtime `crewai`)
- Code: `frontend/src/**` (App, components, api/client, i18n, theme, prefs, config)

## Assumptions

- Operator stack (React+Vite+TS, plain CSS) remains authoritative over any persona-file Tailwind/Next.js mentions.
- Live mode is considered Integration-owned wiring; this artifact documents FE consumption only.
- Mock client remains valid for Module-3-style UI work without a running API.
- `VITE_CURRENCY_CODE` defaults to USD when unset/invalid, independent of backend until env is aligned.
- Copilot remains request/response under resolved runtime `crewai`.
- Focused dialogs for catalog/order forms are accepted operator UX even though config `prefer_modals` is false (stock warning remains the PRD-named exception).

## Open Questions

- Should currency display prefer `GET /health` over `VITE_CURRENCY_CODE`? (also in integration.md)
- Rename remaining `BusinessFlow` / `bf.*` chrome and storage keys to Nexo Custo for Capstone polish?
- Keep create/edit catalog dialogs, or move non-stock flows to full-page/inline forms to match `prefer_modals: false` more strictly?
- When should inventory/orders/dashboard copilots appear in UI (ADR-15 specialists beyond recipe)?
- ES string completion sequencing vs EN/PT (PRD-Q13)?

## Audit

| Field | Value |
| --- | --- |
| persona_id | `frontend-eng` |
| persona | `@frontend.eng` |
| action | `document-frontend` |
| timestamp | `2026-10-13T19:53:22Z` |
| resolved_runtime | `crewai` (FE contract: non-streaming copilot; optional `crew_plan` / `agent_reasoning` display when API returns them) |
| prompt_trace | Omitted — documentation-only pass from PRD/SAD/setup/config and inspected `frontend/` source; no LLM generation of product UI |
