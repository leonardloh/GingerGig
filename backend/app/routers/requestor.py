from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/requestor", tags=["requestor"])


@router.get("/__stub")
async def requestor_stub() -> dict:
    """Phase 3 fills listing search, listing detail, and requestor bookings."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Phase 3 will implement requestor endpoints",
    )
