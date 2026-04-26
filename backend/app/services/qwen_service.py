import logging
import re
from typing import Any, cast

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.voice import ListingDraft

LISTING_EXTRACTION_FAILED_MSG = "Listing extraction failed"
logger = logging.getLogger(__name__)


class ListingExtractionError(Exception):
    """Raised when Qwen output cannot be validated into a listing draft."""


_JSON_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL | re.IGNORECASE)


def strip_json_fences(raw: str) -> str:
    match = _JSON_FENCE_RE.match(raw)
    if match is None:
        return raw.strip()
    return match.group(1).strip()


def _build_messages(
    transcript: str,
    language: str,
    validation_error: str | None = None,
) -> list[dict[str, str]]:
    user_content = (
        "Extract one listing draft from this elder voice transcript.\n"
        f"Language code: {language}\n"
        "Return exactly one JSON object with these snake_case fields: "
        "name, service_offer, category, price_amount, price_unit, capacity, "
        "dietary_tags, location_hint, language.\n"
        "Allowed categories: home_cooking, traditional_crafts, pet_sitting, "
        "household_help, other.\n"
        "Allowed price_unit values: per_meal, per_hour, per_day, per_month, null.\n"
        "Field rules:\n"
        "- service_offer must be a concise display title naming the main "
        "service, skill, or item offered. Use a noun phrase, ideally 2-6 words.\n"
        "- Do not copy the whole transcript into service_offer. Remove first-person "
        "phrasing, capacity, price, schedule, and location from service_offer.\n"
        "- Put quantities such as people, meals, pets, or items into capacity when "
        "an integer limit is stated.\n"
        "- Preserve extracted free-text labels in the speaker's language, but "
        "summarize them into listing fields instead of quoting the transcript.\n"
        'Example transcript: "I can cook fried rice for 10 people"\n'
        'Example JSON excerpt: {"service_offer": "Fried rice", '
        '"category": "home_cooking", "capacity": 10}\n'
        "Use null for unknown optional values. Do not include markdown fences.\n\n"
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
    create_completion = cast(Any, client.chat.completions.create)
    response = await create_completion(
        model=settings.dashscope_chat_model,
        messages=_build_messages(transcript, language, validation_error),
        response_format={"type": "json_object"},
        temperature=0,
    )
    content: Any = response.choices[0].message.content
    if not isinstance(content, str) or not content.strip():
        raise ListingExtractionError("Qwen response did not include JSON content.")
    return strip_json_fences(content)


async def extract_listing(transcript: str, language: str) -> ListingDraft:
    try:
        client = AsyncOpenAI(
            api_key=settings.dashscope_api_key,
            base_url=settings.dashscope_base_url,
        )
    except Exception as exc:
        logger.exception("qwen_listing_extraction_client_init_failed")
        raise ListingExtractionError(LISTING_EXTRACTION_FAILED_MSG) from exc

    validation_error: str | None = None
    for attempt in range(2):
        try:
            raw_json = await _request_listing_json(
                client,
                transcript,
                language,
                validation_error,
            )
            return _validate_listing_json(raw_json, language)
        except ValidationError as exc:
            if attempt == 0:
                validation_error = str(exc)
                continue
            raise ListingExtractionError(LISTING_EXTRACTION_FAILED_MSG) from exc
        except ListingExtractionError as exc:
            raise ListingExtractionError(LISTING_EXTRACTION_FAILED_MSG) from exc
        except Exception as exc:
            logger.exception("qwen_listing_extraction_transport_failed")
            raise ListingExtractionError(LISTING_EXTRACTION_FAILED_MSG) from exc

    raise ListingExtractionError(LISTING_EXTRACTION_FAILED_MSG)


def _validate_listing_json(raw_json: str, language: str) -> ListingDraft:
    listing = ListingDraft.model_validate_json(raw_json)
    if listing.language != language:
        logger.warning(
            "qwen_listing_language_mismatch",
            extra={"requested_language": language, "returned_language": listing.language},
        )
        listing = listing.model_copy(update={"language": language})
    return listing
