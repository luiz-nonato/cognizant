from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_auth_if_configured
from app.api.errors import error_payload
from app.deps import get_repository
from app.domain.models import Material
from app.repository.memory import InMemoryRepository
from app.schemas.materials import MaterialCreate, MaterialOut

router = APIRouter(
    prefix="/materials",
    tags=["materials"],
    dependencies=[Depends(require_auth_if_configured)],
)


def _to_out(material: Material) -> MaterialOut:
    return MaterialOut(
        id=material.id,
        name=material.name,
        uom=material.uom,
        list_price=material.list_price,
        reorder_point=material.reorder_point,
        last_purchase_price=material.last_purchase_price,
        supplier_id=material.supplier_id,
    )


@router.get("", response_model=list[MaterialOut])
async def list_materials(
    repo: InMemoryRepository = Depends(get_repository),
) -> list[MaterialOut]:
    return [_to_out(m) for m in repo.list_materials()]


@router.get("/{material_id}", response_model=MaterialOut)
async def get_material(
    material_id: str,
    repo: InMemoryRepository = Depends(get_repository),
) -> MaterialOut:
    material = repo.get_material(material_id)
    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_payload(
                "material_not_found",
                f"Material {material_id} not found",
                {"material_id": material_id},
            ),
        )
    return _to_out(material)


@router.post("", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def create_material(
    body: MaterialCreate,
    repo: InMemoryRepository = Depends(get_repository),
) -> MaterialOut:
    material = Material(
        id=body.id or "",
        name=body.name,
        uom=body.uom,
        list_price=body.list_price,
        reorder_point=body.reorder_point,
        last_purchase_price=body.last_purchase_price,
    )
    saved = repo.upsert_material(material)
    return _to_out(saved)


@router.put("/{material_id}", response_model=MaterialOut)
async def update_material(
    material_id: str,
    body: MaterialCreate,
    repo: InMemoryRepository = Depends(get_repository),
) -> MaterialOut:
    existing = repo.get_material(material_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_payload(
                "material_not_found",
                f"Material {material_id} not found",
                {"material_id": material_id},
            ),
        )
    material = Material(
        id=material_id,
        name=body.name,
        uom=body.uom,
        list_price=body.list_price,
        reorder_point=body.reorder_point,
        last_purchase_price=(
            body.last_purchase_price
            if body.last_purchase_price is not None
            else existing.last_purchase_price
        ),
        purchases=existing.purchases,
        supplier_id=existing.supplier_id,
    )
    saved = repo.upsert_material(material)
    return _to_out(saved)
