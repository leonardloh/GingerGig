import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from app.routers import voice as voice_router
from app.schemas.voice import ListingDraft
from app.services import qwen_service
from app.services.qwen_service import LISTING_EXTRACTION_FAILED_MSG

pytestmark = pytest.mark.asyncio(loop_scope="session")


class FakeS3Client:
    def __init__(self) -> None:
        self.presign_calls: list[dict[str, object]] = []

    def generate_presigned_url(self, **kwargs: object) -> str:
        self.presign_calls.append(kwargs)
        return "https://example.test/audio-put"


class SpySessionMaker:
    def __init__(self, session: object) -> None:
        self._session = session
        self.enter_count = 0

    def __call__(self):
        self.enter_count += 1
        return self

    async def __aenter__(self) -> object:
        return self._session

    async def __aexit__(self, *args: object) -> None:
        return None


async def _login(client, email: str) -> tuple[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "demo"},
    )
    assert response.status_code == 200
    body = response.json()
    return body["accessToken"], body["userId"]


def _install_voice_mocks(monkeypatch: pytest.MonkeyPatch, db_session: object) -> SimpleNamespace:
    monkeypatch.setattr(voice_router.settings, "s3_audio_bucket", "test-audio-bucket")
    fake_s3 = FakeS3Client()

    def fake_boto3_client(service_name: str, **kwargs: object) -> FakeS3Client:
        assert kwargs["region_name"] == "ap-southeast-1"
        if service_name == "s3":
            return fake_s3
        raise AssertionError(f"Unexpected live AWS client: {service_name}")

    monkeypatch.setattr("app.integrations.s3_audio.boto3.client", fake_boto3_client)
    monkeypatch.setattr(
        voice_router.transcribe_batch,
        "start_batch_job",
        MagicMock(return_value=None),
    )
    monkeypatch.setattr(
        voice_router.transcribe_batch,
        "poll_until_done",
        MagicMock(return_value="Saya jual nasi lemak RM 8 satu bungkus."),
    )
    listing = ListingDraft(
        name="Makcik Siti",
        service_offer="Nasi lemak homemade",
        category="home_cooking",
        price_amount=8,
        price_unit="per_meal",
        capacity=20,
        dietary_tags=["halal"],
        location_hint="TTDI",
        language="ms-MY",
    )
    extractor = AsyncMock(return_value=listing)
    monkeypatch.setattr(voice_router, "extract_listing", extractor)

    spy_sessionmaker = SpySessionMaker(db_session)
    monkeypatch.setattr(voice_router, "get_sessionmaker", lambda _: spy_sessionmaker)
    scheduled_jobs = []
    monkeypatch.setattr(voice_router, "_schedule_batch_job", scheduled_jobs.append)
    return SimpleNamespace(
        fake_s3=fake_s3,
        extractor=extractor,
        spy_sessionmaker=spy_sessionmaker,
        scheduled_jobs=scheduled_jobs,
        start_batch_job=voice_router.transcribe_batch.start_batch_job,
        poll_until_done=voice_router.transcribe_batch.poll_until_done,
    )


async def test_audio_upload_url_returns_elder_scoped_presigned_put(
    client,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mocks = _install_voice_mocks(monkeypatch, db_session)
    token, elder_id = await _login(client, "siti@gingergig.my")

    response = await client.post(
        "/api/v1/voice-to-profile/audio-upload-url",
        headers={"Authorization": f"Bearer {token}"},
        json={"contentType": "audio/wav", "language": "ms-MY"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["uploadUrl"] == "https://example.test/audio-put"
    assert body["s3Key"].startswith(f"elders/{elder_id}/voice/")
    assert body["s3Key"].endswith(".wav")
    assert body["expiresIn"] == 3600
    assert mocks.fake_s3.presign_calls[0]["ClientMethod"] == "put_object"
    assert mocks.fake_s3.presign_calls[0]["Params"]["ContentType"] == "audio/wav"


async def test_batch_submit_returns_pending_and_status_ready(
    client,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mocks = _install_voice_mocks(monkeypatch, db_session)
    token, elder_id = await _login(client, "siti@gingergig.my")
    s3_key = f"elders/{elder_id}/voice/test.wav"

    started_at = time.monotonic()
    submit = await client.post(
        "/api/v1/voice-to-profile/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"s3Key": s3_key, "language": "ms-MY"},
    )
    elapsed = time.monotonic() - started_at

    assert submit.status_code == 201
    body = submit.json()
    assert body["status"] == "pending"
    assert body["estimatedSeconds"] == 10
    assert body["jobId"]
    assert elapsed < 2

    assert len(mocks.scheduled_jobs) == 1
    await mocks.scheduled_jobs[0]
    status_response = await client.get(
        f"/api/v1/voice-to-profile/batch/{body['jobId']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert status_response.status_code == 200
    status_body = status_response.json()
    assert status_body["status"] == "ready"
    assert status_body["jobId"] == body["jobId"]
    assert status_body["listing"]["service_offer"] == "Nasi lemak homemade"
    assert mocks.spy_sessionmaker.enter_count >= 1
    mocks.start_batch_job.assert_called_once()
    mocks.poll_until_done.assert_called_once()
    mocks.extractor.assert_awaited_once()


async def test_batch_status_hides_other_users_jobs(
    client,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mocks = _install_voice_mocks(monkeypatch, db_session)
    siti_token, elder_id = await _login(client, "siti@gingergig.my")
    amir_token, _amir_id = await _login(client, "amir@gingergig.my")

    submit = await client.post(
        "/api/v1/voice-to-profile/batch",
        headers={"Authorization": f"Bearer {siti_token}"},
        json={"s3Key": f"elders/{elder_id}/voice/test.wav", "language": "ms-MY"},
    )
    assert submit.status_code == 201
    assert len(mocks.scheduled_jobs) == 1
    await mocks.scheduled_jobs[0]

    response = await client.get(
        f"/api/v1/voice-to-profile/batch/{submit.json()['jobId']}",
        headers={"Authorization": f"Bearer {amir_token}"},
    )

    assert response.status_code == 404


async def test_batch_rejects_cross_elder_s3_key(
    client,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_voice_mocks(monkeypatch, db_session)
    token, _elder_id = await _login(client, "siti@gingergig.my")

    response = await client.post(
        "/api/v1/voice-to-profile/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"s3Key": "elders/not-siti/voice/test.wav", "language": "ms-MY"},
    )

    assert response.status_code == 403


async def test_batch_rejects_audio_key_extensions_not_allowed_by_upload_policy(
    client,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mocks = _install_voice_mocks(monkeypatch, db_session)
    token, elder_id = await _login(client, "siti@gingergig.my")

    response = await client.post(
        "/api/v1/voice-to-profile/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"s3Key": f"elders/{elder_id}/voice/test.mp4", "language": "ms-MY"},
    )

    assert response.status_code == 400
    assert response.json() == {"status": 400, "message": "Unsupported audio format"}
    assert mocks.scheduled_jobs == []


async def test_batch_status_sanitizes_raw_infrastructure_errors(
    client,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mocks = _install_voice_mocks(monkeypatch, db_session)
    sensitive_error = RuntimeError(
        "AccessDenied for s3://secret-audio-bucket/elders/user/voice/test.wav"
    )
    mocks.poll_until_done.side_effect = sensitive_error
    token, elder_id = await _login(client, "siti@gingergig.my")

    submit = await client.post(
        "/api/v1/voice-to-profile/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"s3Key": f"elders/{elder_id}/voice/test.wav", "language": "ms-MY"},
    )
    assert submit.status_code == 201
    assert len(mocks.scheduled_jobs) == 1
    await mocks.scheduled_jobs[0]

    response = await client.get(
        f"/api/v1/voice-to-profile/batch/{submit.json()['jobId']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["message"] == voice_router.VOICE_BATCH_PROCESSING_FAILED_MSG
    assert "secret-audio-bucket" not in json.dumps(body)
    assert "AccessDenied" not in json.dumps(body)


async def test_batch_qwen_failure_maps_to_502(
    client,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mocks = _install_voice_mocks(monkeypatch, db_session)
    invalid = json.dumps({"category": "not_a_category"})
    create = AsyncMock(
        side_effect=[
            SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=invalid))]),
            SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=invalid))]),
        ]
    )
    qwen_client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    monkeypatch.setattr(voice_router, "extract_listing", qwen_service.extract_listing)
    token, elder_id = await _login(client, "siti@gingergig.my")

    with patch("app.services.qwen_service.AsyncOpenAI", Mock(return_value=qwen_client)):
        submit = await client.post(
            "/api/v1/voice-to-profile/batch",
            headers={"Authorization": f"Bearer {token}"},
            json={"s3Key": f"elders/{elder_id}/voice/test.wav", "language": "ms-MY"},
        )
        assert submit.status_code == 201
        assert len(mocks.scheduled_jobs) == 1
        await mocks.scheduled_jobs[0]

    assert create.await_count == 2

    response = await client.get(
        f"/api/v1/voice-to-profile/batch/{submit.json()['jobId']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 502
    assert response.json() == {"status": 502, "message": LISTING_EXTRACTION_FAILED_MSG}
