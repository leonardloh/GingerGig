import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.routers import voice as voice_router
from app.schemas.voice import ListingDraft
from app.services.qwen_service import ListingExtractionError, extract_listing


def _valid_listing(**overrides: object) -> str:
    payload: dict[str, object] = {
        "name": "Aunty Mei",
        "service_offer": "Home-cooked nasi lemak",
        "category": "home_cooking",
        "price_amount": 40,
        "price_unit": "per_meal",
        "capacity": 12,
        "dietary_tags": ["halal"],
        "location_hint": "Taman Desa",
        "language": "en-US",
    }
    payload.update(overrides)
    return json.dumps(payload)


def _completion(content: str) -> SimpleNamespace:
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def _mock_async_openai(*contents: str) -> Mock:
    create = AsyncMock(side_effect=[_completion(content) for content in contents])
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    patched_client = Mock(return_value=client)
    patched_client.created_client = client
    patched_client.create = create
    return patched_client


@pytest.mark.asyncio
async def test_extract_listing_strips_markdown_fences() -> None:
    content = f"```json\n{_valid_listing()}\n```"
    patched_client = _mock_async_openai(content)

    with patch("app.services.qwen_service.AsyncOpenAI", patched_client):
        listing = await extract_listing("I cook nasi lemak for neighbours.", "en-US")

    assert listing.service_offer == "Home-cooked nasi lemak"
    assert patched_client.create.await_count == 1
    assert patched_client.create.await_args.kwargs["response_format"] == {"type": "json_object"}


@pytest.mark.asyncio
async def test_extract_listing_prompt_requests_concise_service_title() -> None:
    patched_client = _mock_async_openai(_valid_listing(service_offer="Fried rice", capacity=10))

    with patch("app.services.qwen_service.AsyncOpenAI", patched_client):
        listing = await extract_listing("I can cook fried rice for 10 people", "en-US")

    prompt = patched_client.create.await_args.kwargs["messages"][-1]["content"]
    assert "service_offer must be a concise display title" in prompt
    assert "Do not copy the whole transcript into service_offer" in prompt
    assert "Example transcript: \"I can cook fried rice for 10 people\"" in prompt
    assert '"service_offer": "Fried rice"' in prompt
    assert '"capacity": 10' in prompt
    assert listing.service_offer == "Fried rice"
    assert listing.capacity == 10


@pytest.mark.asyncio
async def test_extract_listing_retries_once_after_validation_error() -> None:
    invalid = json.dumps(
        {
            "name": "Aunty Mei",
            "category": "home_cooking",
            "price_amount": 40,
            "price_unit": "per_meal",
            "capacity": 12,
            "dietary_tags": ["halal"],
            "location_hint": "Taman Desa",
            "language": "en-US",
        }
    )
    patched_client = _mock_async_openai(invalid, _valid_listing())

    with patch("app.services.qwen_service.AsyncOpenAI", patched_client):
        listing = await extract_listing("I cook nasi lemak for neighbours.", "en-US")

    assert listing.service_offer == "Home-cooked nasi lemak"
    assert patched_client.create.await_count == 2
    retry_messages = patched_client.create.await_args_list[1].kwargs["messages"]
    assert "Validation error" in retry_messages[-1]["content"]


@pytest.mark.asyncio
async def test_extract_listing_converts_transport_errors_to_safe_error() -> None:
    create = AsyncMock(side_effect=RuntimeError("dashscope timeout with request id abc123"))
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))

    with patch("app.services.qwen_service.AsyncOpenAI", Mock(return_value=client)):
        with pytest.raises(ListingExtractionError, match="Listing extraction failed"):
            await extract_listing("I cook nasi lemak for neighbours.", "en-US")

    create.assert_awaited_once()


@pytest.mark.asyncio
async def test_extract_listing_converts_retry_transport_errors_to_safe_error() -> None:
    invalid = json.dumps({"category": "not_a_category"})
    create = AsyncMock(
        side_effect=[
            _completion(invalid),
            RuntimeError("dashscope retry timeout with request id abc123"),
        ]
    )
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))

    with patch("app.services.qwen_service.AsyncOpenAI", Mock(return_value=client)):
        with pytest.raises(ListingExtractionError, match="Listing extraction failed"):
            await extract_listing("I cook nasi lemak for neighbours.", "en-US")

    assert create.await_count == 2


@pytest.mark.asyncio
async def test_extract_listing_overrides_model_language_with_requested_language() -> None:
    patched_client = _mock_async_openai(_valid_listing(language="zh-CN"))

    with patch("app.services.qwen_service.AsyncOpenAI", patched_client):
        listing = await extract_listing("I cook nasi lemak for neighbours.", "en-US")

    assert listing.language == "en-US"
    assert patched_client.create.await_count == 1


@pytest.mark.asyncio
async def test_extract_listing_raises_typed_error_after_two_validation_failures() -> None:
    invalid = json.dumps({"category": "not_a_category"})
    patched_client = _mock_async_openai(invalid, invalid)

    with patch("app.services.qwen_service.AsyncOpenAI", patched_client):
        with pytest.raises(ListingExtractionError, match="Listing extraction failed"):
            await extract_listing("I cook nasi lemak for neighbours.", "en-US")

    assert patched_client.create.await_count == 2


def test_listing_draft_coerces_currency_price_string() -> None:
    listing = ListingDraft.model_validate_json(_valid_listing(price_amount="RM 40"))

    assert listing.price_amount == 40.0


def test_text_fallback_distills_service_offer_from_transcript() -> None:
    listing = voice_router._fallback_listing_draft(
        "I can cook fried rice for 10 people.",
        "en-US",
    )

    assert listing.service_offer == "Fried rice"
    assert listing.category == "home_cooking"
    assert listing.capacity == 10
