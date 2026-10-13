"""FastAPI entrypoint for BusinessFlow backend (Week 3 + Sprint 4)."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import copilot, external, health, hitl, inventory, materials, orders, recipes
from app.api.errors import error_payload
from app.settings import get_settings

# Load repo-root .env when present (names from .env.example).
_repo_root = Path(__file__).resolve().parents[2]
load_dotenv(_repo_root / ".env")
load_dotenv()  # also cwd


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="BusinessFlow API",
        version="0.3.0",
        description=(
            "Materials, recipe costing, inventory, orders, recipe copilot, "
            "HITL proposals, Open Food Facts lookup"
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list or ["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc: StarletteHTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "error" in detail:
            return JSONResponse(status_code=exc.status_code, content=detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload("http_error", str(detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=error_payload(
                "validation_error",
                "Request validation failed",
                {"errors": exc.errors()},
            ),
        )

    app.include_router(health.router)
    app.include_router(materials.router)
    app.include_router(recipes.router)
    app.include_router(inventory.router)
    app.include_router(orders.router)
    app.include_router(hitl.router)
    app.include_router(external.router)
    app.include_router(copilot.router)
    return app


app = create_app()
