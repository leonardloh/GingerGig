"""Local KYC contract used by the merged onboarding flow."""

import httpx
import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_local_kyc_flow_returns_approved_result(client: httpx.AsyncClient) -> None:
    session_response = await client.post("/api/v1/kyc/session")
    assert session_response.status_code == 200, session_response.text
    session = session_response.json()

    upload_response = await client.put(
        session["frontUrl"].replace("http://test", ""),
        content=b"fake-image-bytes",
        headers={"Content-Type": "image/jpeg"},
    )
    assert upload_response.status_code == 204, upload_response.text

    verify_response = await client.post(
        "/api/v1/kyc/verify",
        json={"sessionId": session["sessionId"]},
    )
    assert verify_response.status_code == 200, verify_response.text
    job_id = verify_response.json()["jobId"]

    status_response = await client.get(f"/api/v1/kyc/status/{job_id}")
    assert status_response.status_code == 200, status_response.text
    assert status_response.json()["status"] == "approved"
