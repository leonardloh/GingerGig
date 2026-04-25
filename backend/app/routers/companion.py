from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/companions", tags=["companion"])


@router.get("/__stub")
async def companion_stub() -> dict:
    """Phase 3 fills companion dashboard, alerts, timeline, and preferences."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Phase 3 will implement companion endpoints",
    )
