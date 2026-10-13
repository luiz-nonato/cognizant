# BusinessFlow — Frontend (Week 3 Slice)

Persona: `@frontend.eng` (`frontend-eng`)  
Actions: `develop-fe`, `add-placeholders`, `style-ui`, `document-frontend`  
Artifact: `project-context/2.build/frontend.md`  
Resolved runtime (FE contract note): **`crewai`** — copilot UI is **non-streaming** (ADR-05 / backend.md `POST /copilot/chat`)

---

## 1. Scope delivered

Week 3 UI only (SAD Implementation Guidance; setup.md `@frontend.eng` next steps):

| Screen / element | Status |
| --- | --- |
| Material view (name, UoM, list / last price) | Done — one seeded material |
| Recipe view with explicit yield | Done |
| Cost stack / engine figures (unit cost, line contributions, recommended price) | Done |
| DEC-16 zero-cost label (`n/a / zero cost`) | Done — demo toggle on recipe screen |
| Copilot panel (message, `reply`, grounding cue, agent id) | Done — mock non-streaming |
| Future Work nav stubs (Dashboard, Inventory, Orders, etc.) | Done — visible, disabled |
| Live `fetch` / `axios` to API | **Not done** — reserved for `@integration.eng` |

---

## 2. Stack & UI prefs

| Item | Choice | Trace |
| --- | --- | --- |
| Framework | React **19.3.0** + Vite **6.4.4** + TypeScript **5.8.3** | setup.md pins; ADR-09 |
| Styling | Plain CSS, system `color-scheme`, minimal surfaces — **no Tailwind / no Next.js** | Operator + ADR-09; persona Tailwind note ignored |
| Theme | System light/dark via `prefers-color-scheme` | PRD Metadata `ui.theme: system` |
| Modals | None (`prefer_modals: false`) | ADR-09 |
| Language | English only | DEC-07 |
| Currency display | `VITE_CURRENCY_CODE` → `USD`=`$` or `BRL`=`R$` (default USD) | ADR-14 |

---

## 3. How to run

```powershell
cd frontend
npm install   # if needed
npm run dev   # Vite default http://localhost:5173
npm run build # typecheck + production bundle
```

Optional env (Vite-prefixed; copy names into `frontend/.env` or root env loaded by Vite):

| Name | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Reserved for live client (`http://127.0.0.1:8000`) — unused until integration |
| `VITE_CURRENCY_CODE` | `USD` or `BRL` for symbol display |

---

## 4. Application structure

```
frontend/src/
  App.tsx                 # Week 3 shell: load mock data, switch Material/Recipe
  api/types.ts            # Contracts matching backend.md schemas
  api/client.ts           # BusinessFlowApiClient + createMockApiClient (+ live stub)
  mocks/fixtures.ts       # Seed material/recipe/costing + zero-cost + mock reply
  config/currency.ts      # ADR-14 symbol formatting
  components/
    AppShell.tsx          # Nav + Future Work stubs
    MaterialView.tsx
    RecipeView.tsx
    CostStack.tsx
    CopilotPanel.tsx
    FutureWorkBadge.tsx
  index.css               # Minimal system theme
```

---

## 5. Mock vs live boundary (handoff to `@integration.eng`)

**Current behavior:** `apiClient` is `createMockApiClient()`. UI loads fixtures matching backend seed (`mat-flour-001`, `rcp-bread-001`). Copilot returns a grounded mock envelope with `agent: "costing_analyst"`.

**Do not change in FE epic:** domain formulas, real HTTP, auth headers, CORS.

**Integration replace points:**

1. Implement `createLiveApiClient(baseUrl)` in `frontend/src/api/client.ts` using `import.meta.env.VITE_API_BASE_URL`.
2. Swap `export const apiClient = createMockApiClient()` for live (or env-gated) client.
3. Keep `BusinessFlowApiClient` / types stable.
4. Map API `yield` JSON field to `Recipe.yield` / `CostingSnapshot.yield` (backend serialization alias).

### Expected Week 3 endpoints

| Method | Path | FE usage |
| --- | --- | --- |
| `GET` | `/materials` | List (optional) |
| `GET` | `/materials/{id}` | Material view |
| `GET` | `/recipes` | List (optional) |
| `GET` | `/recipes/{id}` | Recipe header / yield |
| `GET` | `/recipes/{id}/costing` | Cost stack + price |
| `POST` | `/copilot/chat` | Recipe copilot (non-streaming JSON) |
| `GET` | `/health` | Optional readiness (not called in Week 3 UI) |

Copilot request/response shapes: see backend.md §3 and `frontend/src/api/types.ts`.

---

## 6. DEC-16 zero-cost UI

When `recommended_sell_price === 0` and/or `recommended_price_label === "n/a / zero cost"`, the UI shows the label **n/a / zero cost** (not blank). A recipe-screen checkbox switches display to fixture `COSTING_ZERO` for local verification without a second seeded API recipe.

---

## 7. Future Work stubs

Disabled nav items with visible **Future Work** badge: Dashboard, Inventory, Orders, Suppliers, Customers, Purchases, Reports. Chat is in-panel on Recipes (not a separate nav item in Week 3).

---

## Sources

- `project-context/1.define/prd.md` (DEC-07, DEC-13, DEC-16, §6 UX, Metadata UI prefs)
- `project-context/1.define/sad.md` (ADR-05, ADR-09, ADR-14, ADR-15, §3 Frontend, Week 3 Implementation Guidance)
- `project-context/2.build/setup.md` (React+Vite+TS pins; `@frontend.eng` next steps)
- `project-context/2.build/backend.md` (schemas, endpoints, seed fixture, non-streaming copilot)
- `.cursor/rules/aamad-core.mdc`, adapter-registry / adapter-crewai (runtime contract for generated app)

## Assumptions

- Operator stack (React+Vite+TS, plain CSS) overrides persona-file Next.js/Tailwind mentions.
- In-memory mock client is acceptable for Week 3 FE module independence (development-workflow Module 3).
- `VITE_CURRENCY_CODE` mirrors backend `CURRENCY_CODE`; when unset, UI defaults to USD `$`.
- Zero-cost demo may use a local fixture (`rcp-zero-001`) not present in the live seed until backend adds it or integration maps a real zero-cost recipe.
- Copilot remains request/response (no SSE/WebSocket) under resolved runtime `crewai`.

## Open Questions

- Should `VITE_CURRENCY_CODE` be added to root `.env.example` formally, or should integration inject currency from `GET /health`?
- Prefer env-gated mock (`VITE_USE_MOCK=true`) vs compile-time swap when wiring live client?
- Confirm whether Chat remains recipe-panel-only until other specialists are implemented (ADR-15).

## Audit

| Field | Value |
| --- | --- |
| persona | `@frontend.eng` |
| action | `develop-fe` (+ `add-placeholders`, `style-ui`, `document-frontend`) |
| timestamp | `2026-10-13T15:50:00-03:00` |
| resolved_runtime | `crewai` (FE contract: non-streaming copilot) |
| prompt_trace | Omitted — UI scaffolding from PRD/SAD/backend contracts; no LLM generation of product copy beyond mock reply strings |
