import asyncio
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from ..domain.errors import (
    CameraBusyError,
    CaptureTimeoutError,
    IncompatibleReferenceError,
    InvalidReferenceError,
)
from ..domain.ports import CameraProvider, FaceEngine
from ..domain.quality import QualityPolicy
from ..domain.vectors import cosine_similarity, normalize, session_similarity
from .schemas import (
    EnrollmentRequest,
    EnrollmentResponse,
    EnrollmentTemplate,
    VerificationRequest,
    VerificationResponse,
)


class CaptureCoordinator:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def exclusive(self):
        if self._lock.locked():
            raise CameraBusyError("Camera is serving another session")
        await self._lock.acquire()
        try:
            yield
        finally:
            self._lock.release()


class VisionUseCases:
    def __init__(
        self,
        camera: CameraProvider,
        engine: FaceEngine,
        quality: QualityPolicy,
        coordinator: CaptureCoordinator,
        capture_limit: int,
        duplicate_similarity: float,
    ) -> None:
        self.camera = camera
        self.engine = engine
        self.quality = quality
        self.coordinator = coordinator
        self.capture_limit = capture_limit
        self.duplicate_similarity = duplicate_similarity

    async def enroll(self, request: EnrollmentRequest) -> EnrollmentResponse:
        started = time.perf_counter()
        accepted: list[EnrollmentTemplate] = []
        rejected = 0
        quality_scores: list[float] = []
        analysis_ms = 0.0
        async with self.coordinator.exclusive():
            for frame in self.camera.capture(deadline=request.deadline, limit=self.capture_limit):
                self._assert_fresh(frame.captured_at, request.deadline)
                analysed = self.engine.analyse(frame)
                analysis_ms += sum(analysed.timings_ms.values())
                if len(analysed.faces) != 1:
                    rejected += 1
                    continue
                face = analysed.faces[0]
                if self.quality.violations(face.quality):
                    rejected += 1
                    continue
                embedding = normalize(face.embedding, self.engine.embedding_dimension)
                if any(
                    cosine_similarity(embedding, item.embedding) >= self.duplicate_similarity
                    for item in accepted
                ):
                    rejected += 1
                    continue
                score = self.quality.score(face.quality)
                accepted.append(
                    EnrollmentTemplate(
                        embedding=embedding,
                        qualityScore=score,
                        modelVersion=self.engine.model_version,
                        pipelineFingerprint=self.engine.pipeline_fingerprint,
                    )
                )
                quality_scores.append(score)
                if len(accepted) == request.sample_count:
                    break
        if len(accepted) < request.sample_count:
            raise InvalidReferenceError(
                f"Only {len(accepted)} valid, distinct enrollment samples captured"
            )
        return EnrollmentResponse(
            templates=accepted,
            rejectedFrameCount=rejected,
            modelVersion=self.engine.model_version,
            pipelineFingerprint=self.engine.pipeline_fingerprint,
            quality={
                "meanScore": sum(quality_scores) / len(quality_scores),
                "analysisMs": analysis_ms,
            },
            latencyMs=int((time.perf_counter() - started) * 1000),
        )

    async def verify(self, request: VerificationRequest) -> VerificationResponse:
        started = time.perf_counter()
        references = self._validate_references(request)
        valid: list[list[float]] = []
        rejected = {"noFace": 0, "multipleFaces": 0, "lowQuality": 0}
        analysis_ms = 0.0
        async with self.coordinator.exclusive():
            for frame in self.camera.capture(deadline=request.deadline, limit=self.capture_limit):
                self._assert_fresh(frame.captured_at, request.deadline)
                analysed = self.engine.analyse(frame)
                analysis_ms += sum(analysed.timings_ms.values())
                if len(analysed.faces) == 0:
                    rejected["noFace"] += 1
                elif len(analysed.faces) > 1:
                    rejected["multipleFaces"] += 1
                elif self.quality.violations(analysed.faces[0].quality):
                    rejected["lowQuality"] += 1
                else:
                    valid.append(
                        normalize(analysed.faces[0].embedding, self.engine.embedding_dimension)
                    )
                if len(valid) >= request.minimum_valid_frames:
                    break
        quality = {key: float(value) for key, value in rejected.items()}
        quality["analysisMs"] = analysis_ms
        if len(valid) < request.minimum_valid_frames:
            reason = max(rejected, key=rejected.get) if any(rejected.values()) else "noFace"
            reason_code = {
                "noFace": "NO_FACE",
                "multipleFaces": "MULTIPLE_FACES",
                "lowQuality": "LOW_QUALITY",
            }[reason]
            return self._verification_result(started, False, None, reason_code, quality, len(valid))
        similarity = session_similarity(valid, references)
        matched = similarity >= request.threshold
        return self._verification_result(
            started, matched, similarity, None if matched else "FACE_MISMATCH", quality, len(valid)
        )

    def _validate_references(self, request: VerificationRequest) -> list[list[float]]:
        if not request.references:
            raise InvalidReferenceError("At least one reference is required")
        normalized = []
        for reference in request.references:
            if (
                reference.model_version != self.engine.model_version
                or reference.pipeline_fingerprint != self.engine.pipeline_fingerprint
            ):
                raise IncompatibleReferenceError(
                    "Reference model or pipeline does not match the active engine"
                )
            try:
                normalized.append(normalize(reference.embedding, self.engine.embedding_dimension))
            except ValueError as error:
                raise IncompatibleReferenceError(str(error)) from error
        return normalized

    def _assert_fresh(self, captured_at: datetime, deadline: datetime) -> None:
        now = datetime.now(UTC)
        deadline = deadline.astimezone(UTC)
        if captured_at.astimezone(UTC) > deadline or now > deadline:
            raise CaptureTimeoutError("Frame captured outside session deadline")

    def _verification_result(
        self,
        started: float,
        matched: bool,
        similarity: float | None,
        reason_code: str | None,
        quality: dict[str, float],
        valid_count: int = 0,
    ) -> VerificationResponse:
        return VerificationResponse(
            matched=matched,
            similarity=similarity,
            validFrameCount=valid_count,
            modelVersion=self.engine.model_version,
            pipelineFingerprint=self.engine.pipeline_fingerprint,
            latencyMs=int((time.perf_counter() - started) * 1000),
            reasonCode=reason_code,
            quality=quality,
        )
