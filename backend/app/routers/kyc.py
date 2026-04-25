from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/kyc", tags=["kyc"])


@router.get("/__stub")
async def kyc_stub() -> dict:
    """Phase 4 fills /kyc/session, /kyc/verify, /kyc/status/{jobId}, and /kyc/retry."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Phase 4 will implement KYC endpoints",
    )
