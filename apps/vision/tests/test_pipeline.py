import asyncio
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.adapters.cameras import FixtureCameraProvider
from app.adapters.engines import FixtureFaceEngine, pipeline_fingerprint
from app.application.schemas import EnrollmentRequest, VerificationRequest, VisionReference
from app.application.use_cases import CaptureCoordinator, VisionUseCases
from app.domain.errors import (
    CameraBusyError,
    CaptureTimeoutError,
    IncompatibleReferenceError,
    InvalidReferenceError,
)
from app.domain.models import Frame
from app.domain.quality import QualityPolicy


def make_use_cases(frames=None, dimension: int = 8) -> VisionUseCases:
    return VisionUseCases(
        FixtureCameraProvider(frames),
        FixtureFaceEngine(dimension=dimension),
        QualityPolicy(35, 220, 45, 0.12, 25),
        CaptureCoordinator(),
        capture_limit=30,
        duplicate_similarity=0.9999,
    )


def deadline() -> datetime:
    return datetime.now(UTC) + timedelta(seconds=5)


def reference(engine: FixtureFaceEngine, identity="fixture-positive") -> VisionReference:
    analysed = engine.analyse(
        Frame(datetime.now(UTC), {"faces": [{"identity": identity, "seed": 0}]})
    )
    return VisionReference(
        templateId=uuid4(),
        embedding=analysed.faces[0].embedding,
        modelVersion=engine.model_version,
        pipelineFingerprint=engine.pipeline_fingerprint,
    )


def verification_request(
    use_cases: VisionUseCases, identity="fixture-positive", **changes
) -> VerificationRequest:
    values = {
        "sessionId": uuid4(),
        "correlationId": "test-correlation",
        "deadline": deadline(),
        "minimumValidFrames": 3,
        "threshold": 0.9,
        "references": [reference(use_cases.engine, identity)],
    }
    values.update(changes)
    return VerificationRequest(**values)


def test_enrollment_returns_distinct_quality_checked_templates() -> None:
    use_cases = make_use_cases()
    result = asyncio.run(
        use_cases.enroll(
            EnrollmentRequest(
                sessionId=uuid4(), correlationId="enroll", deadline=deadline(), sampleCount=5
            )
        )
    )
    assert len(result.templates) == 5
    assert all(len(item.embedding) == 8 for item in result.templates)
    assert result.pipeline_fingerprint == use_cases.engine.pipeline_fingerprint


def test_enrollment_rejects_insufficient_valid_samples() -> None:
    use_cases = make_use_cases([{"faces": []}] * 10)
    with pytest.raises(InvalidReferenceError):
        asyncio.run(
            use_cases.enroll(
                EnrollmentRequest(
                    sessionId=uuid4(), correlationId="enroll", deadline=deadline(), sampleCount=5
                )
            )
        )


def test_positive_and_negative_one_to_one_verification() -> None:
    use_cases = make_use_cases()
    positive = asyncio.run(use_cases.verify(verification_request(use_cases)))
    negative = asyncio.run(
        use_cases.verify(verification_request(use_cases, identity="another-person"))
    )
    assert positive.matched is True
    assert positive.valid_frame_count == 3
    assert negative.matched is False
    assert negative.reason_code == "FACE_MISMATCH"


@pytest.mark.parametrize(
    ("frames", "reason"),
    [
        ([{"faces": []}] * 4, "NO_FACE"),
        ([{"faces": [{}, {}]}] * 4, "MULTIPLE_FACES"),
        ([{"faces": [{"sharpness": 1}]}] * 4, "LOW_QUALITY"),
    ],
)
def test_invalid_frames_fail_closed(frames, reason: str) -> None:
    use_cases = make_use_cases(frames)
    result = asyncio.run(use_cases.verify(verification_request(use_cases)))
    assert result.matched is False
    assert result.reason_code == reason
    assert result.valid_frame_count == 0


def test_incompatible_reference_is_rejected_before_capture() -> None:
    use_cases = make_use_cases()
    request = verification_request(use_cases)
    request.references[0].model_version = "wrong-model"
    with pytest.raises(IncompatibleReferenceError):
        asyncio.run(use_cases.verify(request))


def test_expired_deadline_fails_closed() -> None:
    use_cases = make_use_cases()
    request = verification_request(use_cases, deadline=datetime.now(UTC) - timedelta(seconds=1))
    with pytest.raises(CaptureTimeoutError):
        asyncio.run(use_cases.verify(request))


def test_camera_busy_is_explicit() -> None:
    use_cases = make_use_cases()

    async def exercise() -> None:
        await use_cases.coordinator._lock.acquire()
        try:
            with pytest.raises(CameraBusyError):
                await use_cases.verify(verification_request(use_cases))
        finally:
            use_cases.coordinator._lock.release()

    asyncio.run(exercise())


def test_pipeline_fingerprint_is_stable_and_configuration_sensitive() -> None:
    assert pipeline_fingerprint({"b": 2, "a": 1}) == pipeline_fingerprint({"a": 1, "b": 2})
    assert pipeline_fingerprint({"a": 1}) != pipeline_fingerprint({"a": 2})
