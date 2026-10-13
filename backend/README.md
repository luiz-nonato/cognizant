# BusinessFlow backend (Week 3)

FastAPI + deterministic costing engine + CrewAI `costing_analyst` for the recipe screen.

Full documentation: `project-context/2.build/backend.md`.

## Quick start

```powershell
# From repo root
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

- Health: `GET http://127.0.0.1:8000/health`
- Costing snapshot: `GET http://127.0.0.1:8000/recipes/rcp-bread-001/costing`
- Copilot: `POST /copilot/chat` with `context.screen="recipe"` (grounded fallback if `OPENAI_API_KEY` unset)

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```
