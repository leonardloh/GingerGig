import base64
import json
import time
from pathlib import Path

import pytest


def _urlsafe_json(data: dict) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


@pytest.mark.asyncio(loop_scope="session")
async def test_alg_none_token_is_rejected(client) -> None:
    payload = {
        "sub": "00000000-0000-0000-0000-000000000000",
        "exp": time.time() + 60,
    }
    token = ".".join(
        (
            _urlsafe_json({"alg": "none", "typ": "JWT"}),
            _urlsafe_json(payload),
            "",
        )
    )

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_missing_bearer_token_is_rejected(client) -> None:
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_auth_phase_does_not_use_bcrypt_runtime() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    runtime_files = (
        backend_dir / "app/routers/auth.py",
        backend_dir / "app/deps/auth.py",
        backend_dir / "app/core/security.py",
    )

    for runtime_file in runtime_files:
        contents = runtime_file.read_text()
        assert "bcrypt" not in contents
        assert "checkpw" not in contents
        assert "hashpw" not in contents
