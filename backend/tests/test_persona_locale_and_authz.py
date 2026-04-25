from pathlib import Path

import pytest

from app.core.ids import entity_id
from app.models.listing import Listing
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")

SITI_EMAIL = "siti@gingergig.my"
AMIR_EMAIL = "amir@gingergig.my"
FAIZ_EMAIL = "faiz@gingergig.my"


async def login_headers(client, email: str) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "demo"},
    )
    assert response.status_code == 200
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def assert_api_error(body: dict) -> None:
    assert "status" in body
    assert "message" in body


async def test_missing_bearer_token_returns_api_error_for_each_persona(client) -> None:
    siti_id = entity_id("user", "siti")

    for path in (
        f"/api/v1/elders/{siti_id}/listings",
        "/api/v1/requestor/listings/search",
        f"/api/v1/companions/elders/{siti_id}/dashboard",
    ):
        response = await client.get(path)

        assert response.status_code == 401
        assert_api_error(response.json())


async def test_companion_alert_messages_project_from_authenticated_user_locale(
    client,
    db_session,
) -> None:
    faiz_id = entity_id("user", "faiz")
    siti_id = entity_id("user", "siti")
    faiz = await db_session.get(User, faiz_id)
    assert faiz is not None

    faiz.locale = "ms"
    await db_session.flush()
    ms_headers = await login_headers(client, FAIZ_EMAIL)
    ms_response = await client.get(
        f"/api/v1/companions/elders/{siti_id}/alerts",
        headers=ms_headers,
    )
    assert ms_response.status_code == 200
    ms_alerts = ms_response.json()
    assert any("Mak" in alert["message"] for alert in ms_alerts)

    faiz.locale = "en"
    await db_session.flush()
    en_headers = await login_headers(client, FAIZ_EMAIL)
    en_response = await client.get(
        f"/api/v1/companions/elders/{siti_id}/alerts",
        headers=en_headers,
    )
    assert en_response.status_code == 200
    en_alerts = en_response.json()
    assert any("Mum" in alert["message"] for alert in en_alerts)
    assert {alert["message"] for alert in ms_alerts} != {
        alert["message"] for alert in en_alerts
    }


async def test_requestor_listing_search_falls_back_to_english_when_locale_column_null(
    client,
    db_session,
) -> None:
    amir_id = entity_id("user", "amir")
    listing_id = entity_id("listing", "siti-listing-1")
    amir = await db_session.get(User, amir_id)
    listing = await db_session.get(Listing, listing_id)
    assert amir is not None
    assert listing is not None

    amir.locale = "zh"
    listing.title_zh = None
    await db_session.flush()

    headers = await login_headers(client, AMIR_EMAIL)
    response = await client.get(
        "/api/v1/requestor/listings/search",
        headers=headers,
        params={"query": "traditional"},
    )

    assert response.status_code == 200
    matching_listing = next(
        item for item in response.json() if item["id"] == str(listing_id)
    )
    assert matching_listing["title"] == matching_listing.get(
        "titleEn",
        "Traditional Malay Cooking",
    )


def test_locale_expr_uses_sqlalchemy_coalesce_label() -> None:
    from sqlalchemy.sql.elements import Label

    from app.services.persona_queries import locale_expr

    expr = locale_expr(Listing, "title", "zh")

    assert isinstance(expr, Label)
    assert expr.name == "title"
    assert "coalesce" in str(expr).lower()


def test_phase3_runtime_code_does_not_import_live_ai_dependencies() -> None:
    forbidden_terms = ("qwen", "DashScope", "DASHSCOPE", "openai")
    runtime_files = (
        Path("app/routers/requestor.py"),
        Path("app/services/persona_queries.py"),
    )

    for path in runtime_files:
        source = path.read_text()
        source_lower = source.lower()
        for term in forbidden_terms:
            assert term.lower() not in source_lower
