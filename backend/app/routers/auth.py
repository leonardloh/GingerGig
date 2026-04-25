from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/__stub")
async def auth_stub() -> dict:
    """Phase 2 fills /auth/register, /auth/login, /auth/me."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Phase 2 will implement auth endpoints",
    )
