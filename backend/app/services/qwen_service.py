import re
from typing import Any

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.voice import ListingDraft


class ListingExtractionError(Exception):
    """Raised when Qwen output cannot be validated into a listing draft."""


_JSON_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL | re.IGNORECASE)


def strip_json_fences(raw: str) -> str:
    match = _JSON_FENCE_RE.match(raw)
    if match is None:
        return raw.strip()
    return match.group(1).strip()


def _build_messages(transcript: str, language: str, validation_error: str | None = None) -> list[dict[str, str]]:
    user_content = (
        "Extract one listing draft from this elder voice transcript.\n"
        f"Language code: {language}\n"
        "Return exactly one JSON object with these snake_case fields: "
        "name, service_offer, category, price_amount, price_unit, capacity, "
        "dietary_tags, location_hint, language.\n"
        "Allowed categories: home_cooking, traditional_crafts, pet_sitting, "
        "household_help, other.\n"
        "Allowed price_unit values: per_meal, per_hour, per_day, per_month, null.\n"
        "Use null for unknown optional values. Preserve free-text fields in the "
        "speaker's language. Do not include markdown fences.\n\n"
        f"Transcript:\n{transcript}"
    )
    if validation_error is not None:
        user_content += (
            "\n\nYour previous response failed Pydantic validation. Return a corrected "
            f"JSON object only. Validation error:\n{validation_error}"
        )

    return [
        {
            "role": "system",
            "content": (
                "You extract structured service listing drafts for GingerGig. "
                "You must output only valid JSON matching the requested schema."
            ),
        },
        {"role": "user", "content": user_content},
    ]


async def _request_listing_json(
    client: AsyncOpenAI,
    transcript: str,
    language: str,
    validation_error: str | None = None,
) -> str:
    response = await client.chat.completions.create(
        model=getattr(settings, "dashscope_chat_model", "qwen-max"),
        messages=_build_messages(transcript, language, validation_error),
        response_format={"type": "json_object"},
        temperature=0,
    )
    content: Any = response.choices[0].message.content
    if not isinstance(content, str) or not content.strip():
        raise ListingExtractionError("Qwen response did not include JSON content.")
    return strip_json_fences(content)


async def extract_listing(transcript: str, language: str) -> ListingDraft:
    client = AsyncOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )

    try:
        raw_json = await _request_listing_json(client, transcript, language)
        return ListingDraft.model_validate_json(raw_json)
    except ValidationError as first_error:
        try:
            raw_json = await _request_listing_json(
                client,
                transcript,
                language,
                str(first_error),
            )
            return ListingDraft.model_validate_json(raw_json)
        except ValidationError as second_error:
            raise ListingExtractionError("Listing extraction failed") from second_error
