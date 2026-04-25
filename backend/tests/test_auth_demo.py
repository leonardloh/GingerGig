import uuid

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_demo_login_returns_token_for_all_seeded_accounts(client) -> None:
    for email in ("siti@gingergig.my", "amir@gingergig.my", "faiz@gingergig.my"):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "anything"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["tokenType"] == "bearer"
        assert body["expiresIn"] == 86400
        assert body["accessToken"]
        assert body["userId"]


async def test_invalid_demo_login_returns_api_error(client) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "demo"},
    )

    assert response.status_code == 401
    assert response.json() == {"status": 401, "message": "Invalid credentials"}


async def test_auth_me_returns_extended_profile(client) -> None:
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "siti@gingergig.my", "password": "demo"},
    )
    token = login_response.json()["accessToken"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    for field in (
        "id",
        "name",
        "role",
        "locale",
        "kycStatus",
        "avatarUrl",
        "area",
        "age",
        "phone",
        "initials",
    ):
        assert field in body


async def test_register_returns_token_and_elder_kyc_required(client) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Demo Elder",
            "email": f"elder-{uuid.uuid4()}@example.com",
            "phone": "+60111111111",
            "password": "demo",
            "role": "elder",
            "locale": "en",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["tokenType"] == "bearer"
    assert body["kycRequired"] is True
    assert body["kycStatus"] == "not_started"
    assert body["accessToken"]


async def test_register_duplicate_email_returns_409(client) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Makcik Siti",
            "email": "siti@gingergig.my",
            "phone": "+60123456789",
            "password": "demo",
            "role": "elder",
            "locale": "ms",
        },
    )

    assert response.status_code == 409
    assert response.json() == {"status": 409, "message": "Email already registered"}
