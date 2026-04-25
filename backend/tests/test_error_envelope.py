"""D-17 #4: deliberate exceptions return ApiError envelopes without tracebacks."""

import httpx
import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_unhandled_exception_returns_api_error_envelope(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/__test__/boom")
    assert response.status_code == 500, response.text
    assert response.json() == {"status": 500, "message": "Internal server error"}
    assert "Traceback" not in response.text, "traceback leaked in response body"


async def test_404_returns_api_error_envelope(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/nonexistent-route")
    assert response.status_code == 404
    body = response.json()
    assert "status" in body and "message" in body
    assert body["status"] == 404
