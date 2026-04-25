from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Body, Request, Response, status
from pydantic import BaseModel

router = APIRouter(prefix="/kyc", tags=["kyc"])


KycStatus = Literal["not_started", "pending", "approved", "failed", "manual_review"]


class KycUploadUrls(BaseModel):
    sessionId: str
    frontUrl: str
    backUrl: str
    selfieUrl: str


class StartVerificationPayload(BaseModel):
    sessionId: str


class StartVerificationResponse(BaseModel):
    jobId: str
    status: KycStatus
    estimatedSeconds: int


class ExtractedIdData(BaseModel):
    fullName: str
    icNumber: str
    dateOfBirth: str
    address: str
    nationality: str
    gender: Literal["M", "F"]
    confidence: float


class FaceMatchResult(BaseModel):
    matched: bool
    similarity: float
    livenessScore: float | None = None


class KycVerificationResult(BaseModel):
    jobId: str
    status: KycStatus
    extractedData: ExtractedIdData | None = None
    faceMatch: FaceMatchResult | None = None
    failureReason: str | None = None


def _upload_urls(request: Request, session_id: str) -> KycUploadUrls:
    return KycUploadUrls(
        sessionId=session_id,
        frontUrl=str(request.url_for("upload_kyc_document", session_id=session_id, kind="front")),
        backUrl=str(request.url_for("upload_kyc_document", session_id=session_id, kind="back")),
        selfieUrl=str(request.url_for("upload_kyc_document", session_id=session_id, kind="selfie")),
    )


@router.post("/session", response_model=KycUploadUrls)
async def initiate_kyc_session(request: Request) -> KycUploadUrls:
    """Create local presigned-upload stand-ins for the onboarding flow.

    Production replaces these same route contracts with real browser-direct S3 URLs.
    The local endpoint consumes and discards upload bytes so the app can run without
    storing IC images in the backend.
    """

    return _upload_urls(request, f"kyc-session-{uuid4().hex}")


@router.put("/uploads/{session_id}/{kind}", status_code=status.HTTP_204_NO_CONTENT)
async def upload_kyc_document(
    session_id: str,
    kind: Literal["front", "back", "selfie"],
    _body: bytes = Body(default=b"", media_type="application/octet-stream"),
) -> Response:
    _ = (session_id, kind)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/verify", response_model=StartVerificationResponse)
async def start_kyc_verification(payload: StartVerificationPayload) -> StartVerificationResponse:
    return StartVerificationResponse(
        jobId=f"kyc-job-{payload.sessionId}",
        status="pending",
        estimatedSeconds=3,
    )


@router.get("/status/{job_id}", response_model=KycVerificationResult)
async def get_kyc_status(job_id: str) -> KycVerificationResult:
    return KycVerificationResult(
        jobId=job_id,
        status="approved",
        extractedData=ExtractedIdData(
            fullName="SITI BINTI HASSAN",
            icNumber="620415-14-5678",
            dateOfBirth="1962-04-15",
            address="NO 12 JALAN KEPONG 5, KEPONG, 52100 KUALA LUMPUR",
            nationality="WARGANEGARA",
            gender="F",
            confidence=97.4,
        ),
        faceMatch=FaceMatchResult(matched=True, similarity=94.1),
    )


@router.post("/retry", response_model=KycUploadUrls)
async def retry_kyc(request: Request) -> KycUploadUrls:
    return _upload_urls(request, f"kyc-session-{uuid4().hex}")
