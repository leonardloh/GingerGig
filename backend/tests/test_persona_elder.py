import pytest

from app.core.ids import entity_id

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


def assert_listing_shape(listing: dict) -> None:
    for field in (
        "id",
        "elderId",
        "title",
        "category",
        "price",
        "priceUnit",
        "rating",
        "reviewCount",
        "halal",
        "days",
        "menu",
        "titleMs",
        "titleEn",
        "titleZh",
        "titleTa",
        "isActive",
    ):
        assert field in listing


async def test_siti_can_list_own_elder_listings(client) -> None:
    siti_id = entity_id("user", "siti")
    headers = await login_headers(client, SITI_EMAIL)

    response = await client.get(
        f"/api/v1/elders/{siti_id}/listings",
        headers=headers,
    )

    assert response.status_code == 200
    listings = response.json()
    assert len(listings) >= 2
    for listing in listings:
        assert_listing_shape(listing)
        assert listing["elderId"] == str(siti_id)


async def test_requestor_cannot_read_siti_elder_listings(client) -> None:
    siti_id = entity_id("user", "siti")
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.get(
        f"/api/v1/elders/{siti_id}/listings",
        headers=headers,
    )

    assert response.status_code == 403
    assert_api_error(response.json())


async def test_siti_can_patch_own_listing_and_receive_full_shape(client) -> None:
    listing_id = entity_id("listing", "siti-listing-1")
    headers = await login_headers(client, SITI_EMAIL)

    response = await client.patch(
        f"/api/v1/listings/{listing_id}",
        headers=headers,
        json={
            "description": "Updated demo description",
            "halal": True,
            "days": ["Mon", "Wed", "Fri"],
            "isActive": True,
        },
    )

    assert response.status_code == 200
    listing = response.json()
    assert_listing_shape(listing)
    assert listing["id"] == str(listing_id)
    assert listing["description"] == "Updated demo description"
    assert listing["halal"] is True
    assert listing["days"] == ["Mon", "Wed", "Fri"]
    assert listing["isActive"] is True


async def test_non_owners_cannot_patch_siti_listing(client) -> None:
    listing_id = entity_id("listing", "siti-listing-1")

    for email in (AMIR_EMAIL, FAIZ_EMAIL):
        headers = await login_headers(client, email)
        response = await client.patch(
            f"/api/v1/listings/{listing_id}",
            headers=headers,
            json={"isActive": False},
        )

        assert response.status_code == 403
        assert_api_error(response.json())


async def test_siti_elder_bookings_include_denormalised_snapshots(client) -> None:
    siti_id = entity_id("user", "siti")
    headers = await login_headers(client, SITI_EMAIL)

    response = await client.get(
        f"/api/v1/elders/{siti_id}/bookings",
        headers=headers,
    )

    assert response.status_code == 200
    bookings = response.json()
    statuses = {booking["status"] for booking in bookings}
    assert {"pending", "confirmed", "completed"}.issubset(statuses)
    for booking in bookings:
        for field in (
            "requestorInitials",
            "requestorAvatarUrl",
            "listingTitle",
            "qty",
            "itemDescription",
        ):
            assert field in booking


async def test_siti_can_accept_pending_booking_once(client) -> None:
    booking_id = entity_id("booking", "siti-b1")
    headers = await login_headers(client, SITI_EMAIL)

    response = await client.post(
        f"/api/v1/bookings/{booking_id}/respond",
        headers=headers,
        json={"action": "accept"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"

    second_response = await client.post(
        f"/api/v1/bookings/{booking_id}/respond",
        headers=headers,
        json={"action": "accept"},
    )

    assert second_response.status_code == 409
    assert_api_error(second_response.json())


async def test_siti_earnings_summary_has_numeric_totals(client) -> None:
    siti_id = entity_id("user", "siti")
    headers = await login_headers(client, SITI_EMAIL)

    response = await client.get(
        f"/api/v1/elders/{siti_id}/earnings/summary",
        headers=headers,
    )

    assert response.status_code == 200
    summary = response.json()
    assert isinstance(summary["monthTotal"], int | float)
    assert isinstance(summary["lifetimeTotal"], int | float)
    assert isinstance(summary["completedCount"], int)
