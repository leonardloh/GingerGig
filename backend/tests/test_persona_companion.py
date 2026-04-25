import pytest
from sqlalchemy import select

from app.core.ids import entity_id
from app.models.companion_alert_preference import CompanionAlertPreference

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


async def test_faiz_can_read_siti_companion_dashboard(client) -> None:
    siti_id = entity_id("user", "siti")
    headers = await login_headers(client, FAIZ_EMAIL)

    response = await client.get(
        f"/api/v1/companions/elders/{siti_id}/dashboard",
        headers=headers,
    )

    assert response.status_code == 200
    dashboard = response.json()
    assert "status" in dashboard
    assert isinstance(dashboard["weeklyEarnings"], int | float)
    assert isinstance(dashboard["activeDays"], int)
    assert isinstance(dashboard["completedBookings"], int)
    assert dashboard["elder"] == {
        "id": str(siti_id),
        "name": "Makcik Siti",
        "initials": "SH",
        "area": "Kepong, Kuala Lumpur",
        "portraitUrl": dashboard["elder"]["portraitUrl"],
    }


async def test_faiz_can_read_siti_companion_alerts(client) -> None:
    siti_id = entity_id("user", "siti")
    headers = await login_headers(client, FAIZ_EMAIL)

    response = await client.get(
        f"/api/v1/companions/elders/{siti_id}/alerts",
        headers=headers,
    )

    assert response.status_code == 200
    alerts = response.json()
    assert alerts
    for alert in alerts:
        for field in ("id", "type", "title", "message", "createdAt"):
            assert field in alert
        assert alert["type"] in {"care", "celebration"}


async def test_faiz_can_read_siti_companion_timeline(client) -> None:
    siti_id = entity_id("user", "siti")
    headers = await login_headers(client, FAIZ_EMAIL)

    response = await client.get(
        f"/api/v1/companions/elders/{siti_id}/timeline",
        headers=headers,
    )

    assert response.status_code == 200
    timeline = response.json()
    assert timeline
    for item in timeline:
        for field in ("id", "text", "time", "occurredAt"):
            assert field in item


async def test_faiz_can_replace_alert_preferences(client, db_session) -> None:
    siti_id = entity_id("user", "siti")
    faiz_id = entity_id("user", "faiz")
    headers = await login_headers(client, FAIZ_EMAIL)
    payload = {
        "inactivity24h": False,
        "overworkSignals": True,
        "earningsMilestones": False,
        "newBookings": True,
        "reviews": False,
    }

    response = await client.put(
        f"/api/v1/companions/elders/{siti_id}/alert-preferences",
        headers=headers,
        json=payload,
    )

    assert response.status_code == 204
    assert response.content == b""

    result = await db_session.execute(
        select(CompanionAlertPreference).where(
            CompanionAlertPreference.companion_user_id == faiz_id,
            CompanionAlertPreference.elder_user_id == siti_id,
        )
    )
    preferences = result.scalar_one()
    assert preferences.inactivity_24h is False
    assert preferences.overwork_signals is True
    assert preferences.earnings_milestones is False
    assert preferences.new_bookings is True
    assert preferences.reviews is False


async def test_elder_and_requestor_cannot_access_companion_endpoints(client) -> None:
    siti_id = entity_id("user", "siti")

    for email in (SITI_EMAIL, AMIR_EMAIL):
        headers = await login_headers(client, email)
        for path in (
            f"/api/v1/companions/elders/{siti_id}/dashboard",
            f"/api/v1/companions/elders/{siti_id}/alerts",
            f"/api/v1/companions/elders/{siti_id}/timeline",
        ):
            response = await client.get(path, headers=headers)

            assert response.status_code == 403
            assert_api_error(response.json())

        preference_response = await client.put(
            f"/api/v1/companions/elders/{siti_id}/alert-preferences",
            headers=headers,
            json={
                "inactivity24h": True,
                "overworkSignals": True,
                "earningsMilestones": True,
                "newBookings": True,
                "reviews": True,
            },
        )
        assert preference_response.status_code == 403
        assert_api_error(preference_response.json())
