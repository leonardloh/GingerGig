from uuid import UUID

import pytest
from sqlalchemy import select

from app.core.ids import entity_id
from app.models.booking import Booking as BookingModel

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


def assert_search_listing_shape(listing: dict) -> None:
    for field in (
        "id",
        "elderId",
        "title",
        "description",
        "price",
        "priceUnit",
        "category",
        "rating",
        "reviewCount",
        "halal",
        "isActive",
        "elderName",
        "elderInitials",
        "elderArea",
        "elderPortraitUrl",
        "distance",
        "matchScore",
        "matchReason",
        "menu",
    ):
        assert field in listing


async def test_amir_searches_active_listings_with_seeded_match_fields(client) -> None:
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.get(
        "/api/v1/requestor/listings/search",
        headers=headers,
        params={
            "query": "",
            "max_distance_km": "",
            "halal_only": "false",
            "open_now": "false",
        },
    )

    assert response.status_code == 200
    listings = response.json()
    assert listings
    for listing in listings:
        assert_search_listing_shape(listing)
        assert listing["isActive"] is True
        assert isinstance(listing["matchScore"], int)
        assert 0 <= listing["matchScore"] <= 100
        assert listing["matchReason"]


async def test_halal_only_search_excludes_non_halal_listings(client) -> None:
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.get(
        "/api/v1/requestor/listings/search",
        headers=headers,
        params={"halal_only": "true"},
    )

    assert response.status_code == 200
    listings = response.json()
    assert listings
    assert all(listing["halal"] is True for listing in listings)


async def test_query_search_filters_seeded_title_or_description(client) -> None:
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.get(
        "/api/v1/requestor/listings/search",
        headers=headers,
        params={"query": "nasi"},
    )

    assert response.status_code == 200
    listings = response.json()
    assert listings
    for listing in listings:
        haystack = f"{listing['title']} {listing['description']}".lower()
        assert "nasi" in haystack


async def test_query_search_matches_provider_card_fields(client) -> None:
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.get(
        "/api/v1/requestor/listings/search",
        headers=headers,
        params={"query": "kepong"},
    )

    assert response.status_code == 200
    listings = response.json()
    assert listings
    assert any(
        listing["elderName"] == "Makcik Siti"
        and "kepong" in (listing["elderArea"] or "").lower()
        for listing in listings
    )
    for listing in listings:
        haystack = " ".join(
            str(value or "")
            for value in (
                listing["title"],
                listing["description"],
                listing["elderName"],
                listing["elderArea"],
                listing["distance"],
                listing["matchReason"],
            )
        ).lower()
        assert "kepong" in haystack


async def test_listing_detail_returns_reviews_and_full_menu(client) -> None:
    listing_id = entity_id("listing", "siti-listing-1")
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.get(
        f"/api/v1/listings/{listing_id}",
        headers=headers,
    )

    assert response.status_code == 200
    listing = response.json()
    assert listing["id"] == str(listing_id)
    assert "reviews" in listing
    assert isinstance(listing["reviews"], list)
    assert listing["reviews"]
    assert "menu" in listing
    assert isinstance(listing["menu"], list)
    assert listing["menu"]


async def test_amir_can_create_pending_booking_with_denormalised_snapshot(client) -> None:
    listing_id = entity_id("listing", "siti-listing-1")
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.post(
        "/api/v1/requestor/bookings",
        headers=headers,
        json={
            "listingId": str(listing_id),
            "scheduledAt": "2026-04-27T10:00:00+08:00",
            "notes": "Demo booking",
        },
    )

    assert response.status_code in (200, 201)
    booking = response.json()
    assert booking["status"] == "pending"
    assert booking["listingId"] == str(listing_id)
    for field in (
        "requestorName",
        "requestorInitials",
        "requestorAvatarUrl",
        "listingTitle",
        "qty",
        "itemDescription",
    ):
        assert field in booking


async def test_create_booking_for_missing_listing_returns_404(client) -> None:
    missing_listing_id = entity_id("listing", "missing-listing")
    headers = await login_headers(client, AMIR_EMAIL)

    response = await client.post(
        "/api/v1/requestor/bookings",
        headers=headers,
        json={
            "listingId": str(missing_listing_id),
            "scheduledAt": "2026-04-27T10:00:00+08:00",
            "notes": "Demo booking",
        },
    )

    assert response.status_code == 404
    assert_api_error(response.json())


async def test_amir_requestor_bookings_are_filtered_to_his_bookings(client, db_session) -> None:
    headers = await login_headers(client, AMIR_EMAIL)
    amir_id = entity_id("user", "amir")

    response = await client.get(
        "/api/v1/requestor/bookings",
        headers=headers,
    )

    assert response.status_code == 200
    bookings = response.json()
    assert bookings
    booking_ids = [UUID(booking["id"]) for booking in bookings]
    result = await db_session.execute(
        select(BookingModel.requestor_user_id).where(BookingModel.id.in_(booking_ids))
    )
    assert all(requestor_id == amir_id for requestor_id in result.scalars())


async def test_elder_and_companion_cannot_use_requestor_booking_endpoints(client) -> None:
    listing_id = entity_id("listing", "siti-listing-1")

    for email in (SITI_EMAIL, FAIZ_EMAIL):
        headers = await login_headers(client, email)

        get_response = await client.get(
            "/api/v1/requestor/bookings",
            headers=headers,
        )
        assert get_response.status_code == 403
        assert_api_error(get_response.json())

        post_response = await client.post(
            "/api/v1/requestor/bookings",
            headers=headers,
            json={
                "listingId": str(listing_id),
                "scheduledAt": "2026-04-27T10:00:00+08:00",
                "notes": "Demo booking",
            },
        )
        assert post_response.status_code == 403
        assert_api_error(post_response.json())
