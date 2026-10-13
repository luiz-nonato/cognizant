from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.errors import error_payload
from app.auth import require_auth_if_configured
from app.deps import get_repository
from app.domain.engine import CostingError
from app.domain.models import Recipe, RecipeLine
from app.repository.memory import InMemoryRepository
from app.schemas.recipes import RecipeCreate, RecipeLineOut, RecipeOut
from app.services.costing import costing_snapshot_for_recipe

router = APIRouter(
    prefix="/recipes",
    tags=["recipes"],
    dependencies=[Depends(require_auth_if_configured)],
)


def _to_out(recipe: Recipe) -> RecipeOut:
    return RecipeOut(
        id=recipe.id,
        name=recipe.name,
        yield_qty=recipe.yield_qty,
        target_margin=recipe.target_margin,
        finished_product_sku=recipe.finished_product_sku,
        lines=[
            RecipeLineOut(
                material_id=line.material_id,
                quantity=line.quantity,
                uom=line.uom,
            )
            for line in recipe.lines
        ],
    )


@router.get("", response_model=list[RecipeOut])
async def list_recipes(
    repo: InMemoryRepository = Depends(get_repository),
) -> list[RecipeOut]:
    return [_to_out(r) for r in repo.list_recipes()]


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(
    recipe_id: str,
    repo: InMemoryRepository = Depends(get_repository),
) -> RecipeOut:
    recipe = repo.get_recipe(recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_payload(
                "recipe_not_found",
                f"Recipe {recipe_id} not found",
                {"recipe_id": recipe_id},
            ),
        )
    return _to_out(recipe)


@router.get("/{recipe_id}/costing")
async def get_recipe_costing(
    recipe_id: str,
    repo: InMemoryRepository = Depends(get_repository),
) -> dict[str, Any]:
    try:
        return costing_snapshot_for_recipe(repo, recipe_id)
    except CostingError as exc:
        status_code = 404 if exc.code in {"recipe_not_found", "material_not_found"} else 400
        raise HTTPException(
            status_code=status_code,
            detail=error_payload(exc.code, exc.message, exc.details),
        ) from exc


@router.post("", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    body: RecipeCreate,
    repo: InMemoryRepository = Depends(get_repository),
) -> RecipeOut:
    # Validate UoM against materials up front (DEC-18).
    for line in body.lines:
        material = repo.get_material(line.material_id)
        if material is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_payload(
                    "material_not_found",
                    f"Material {line.material_id} not found",
                    {"material_id": line.material_id},
                ),
            )
        if line.uom != material.uom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_payload(
                    "uom_mismatch",
                    "Recipe line UoM must equal the material UoM",
                    {
                        "material_id": material.id,
                        "line_uom": line.uom,
                        "material_uom": material.uom,
                    },
                ),
            )

    recipe = Recipe(
        id=body.id or "",
        name=body.name,
        yield_qty=body.yield_qty,
        target_margin=body.target_margin,
        finished_product_sku=body.finished_product_sku,
        lines=[
            RecipeLine(
                material_id=line.material_id,
                quantity=line.quantity,
                uom=line.uom,
            )
            for line in body.lines
        ],
    )
    saved = repo.upsert_recipe(recipe)
    return _to_out(saved)
