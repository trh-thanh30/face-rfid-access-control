from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from ..domain.errors import CaptureTimeoutError, ModelUnavailableError
from ..domain.models import Frame


class FixtureCameraProvider:
    """Deterministic, non-biometric camera used by tests and software-only demos."""

    def __init__(self, frames: list[Any] | None = None) -> None:
        self.frames = frames or [
            {"faces": [{"seed": index, "identity": "fixture-positive"}]} for index in range(12)
        ]

    def capture(self, *, deadline: datetime, limit: int) -> list[Frame]:
        now = datetime.now(UTC)
        if now >= deadline:
            raise CaptureTimeoutError("Capture deadline has passed")
        return [Frame(captured_at=now, payload=payload) for payload in self.frames[:limit]]


class UploadedFrameProvider(FixtureCameraProvider):
    """Adapter for decoded frames supplied by a trusted internal caller."""


class OpenCVCameraProvider:
    def __init__(self, camera_index: int = 0, clock: Callable[[], datetime] | None = None) -> None:
        self.camera_index = camera_index
        self.clock = clock or (lambda: datetime.now(UTC))

    def capture(self, *, deadline: datetime, limit: int) -> list[Frame]:
        try:
            import cv2  # type: ignore[import-not-found]
        except ImportError as error:
            raise ModelUnavailableError("Install the vision-real extra to use OpenCV") from error
        camera = cv2.VideoCapture(self.camera_index)
        if not camera.isOpened():
            camera.release()
            raise ModelUnavailableError(f"Camera {self.camera_index} is unavailable")
        frames: list[Frame] = []
        try:
            while len(frames) < limit and self.clock() < deadline:
                ok, image = camera.read()
                if ok:
                    frames.append(Frame(captured_at=self.clock(), payload=image))
        finally:
            camera.release()
        if not frames and self.clock() >= deadline:
            raise CaptureTimeoutError("Capture timed out")
        return frames
