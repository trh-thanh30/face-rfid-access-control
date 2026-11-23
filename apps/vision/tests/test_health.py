import asyncio
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from httpx import ASGITransport, AsyncClient

from app.main import app, health
from app.settings import settings


def test_health() -> None:
    payload = health()

    assert payload["status"] == "ok"
    assert payload["service"] == "access-control-vision"


def test_internal_api_requires_service_credential() -> None:
    async def exercise() -> None:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://vision"
        ) as client:
            response = await client.post("/internal/v1/enrollments", json={})
            assert response.status_code == 401

    asyncio.run(exercise())


def test_enrollment_templates_can_be_used_for_one_to_one_verification() -> None:
    async def exercise() -> None:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://vision"
        ) as client:
            headers = {"authorization": f"Bearer {settings.service_token}"}
            deadline = (datetime.now(UTC) + timedelta(seconds=10)).isoformat()
            enrollment = await client.post(
                "/internal/v1/enrollments",
                headers=headers,
                json={
                    "sessionId": str(uuid4()),
                    "correlationId": "enrollment-contract-test",
                    "deadline": deadline,
                    "sampleCount": 5,
                },
            )
            assert enrollment.status_code == 200, enrollment.text
            template = enrollment.json()["templates"][0]
            verification = await client.post(
                "/internal/v1/verifications",
                headers=headers,
                json={
                    "sessionId": str(uuid4()),
                    "correlationId": "verification-contract-test",
                    "deadline": deadline,
                    "minimumValidFrames": 3,
                    "threshold": 0.9,
                    "references": [
                        {
                            "templateId": str(uuid4()),
                            "embedding": template["embedding"],
                            "modelVersion": template["modelVersion"],
                            "pipelineFingerprint": template["pipelineFingerprint"],
                        }
                    ],
                },
            )
            assert verification.status_code == 200
            assert verification.json()["matched"] is True

    asyncio.run(exercise())
