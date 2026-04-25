from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/voice-to-profile", tags=["voice"])


@router.get("/__stub")
async def voice_stub() -> dict:
    """Phase 5 fills WebSocket streaming, batch submit, and status endpoints."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Phase 5 will implement voice-to-profile endpoints",
    )
