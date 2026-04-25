from fastapi import APIRouter, HTTPException, status

router = APIRouter(tags=["elder"])


@router.get("/elders/__stub")
async def elder_stub() -> dict:
    """Phase 3 fills elder-owned listings, bookings, earnings, and responses."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Phase 3 will implement elder endpoints",
    )
