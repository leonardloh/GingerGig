"""D-17 #1: GET /health returns 200 with body {"status":"ok"} exactly."""

import httpx
import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_health_returns_ok(client: httpx.AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200, response.text
    assert response.json() == {"status": "ok"}, response.json()
