import hashlib
import json
import time
from pathlib import Path
from typing import Any

from ..domain.errors import ModelUnavailableError
from ..domain.models import AnalysedFrame, FaceObservation, FaceQuality, Frame
from ..domain.vectors import normalize


def pipeline_fingerprint(configuration: dict[str, Any]) -> str:
    canonical = json.dumps(configuration, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def verify_model_checksum(path: str, expected: str) -> None:
    try:
        digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    except OSError as error:
        raise ModelUnavailableError("Model file is unavailable") from error
    if digest != expected.lower():
        raise ModelUnavailableError("Model checksum mismatch")


class FixtureFaceEngine:
    def __init__(self, model_version: str = "fixture-face-v1", dimension: int = 8) -> None:
        self._model_version = model_version
        self._dimension = dimension
        self._fingerprint = pipeline_fingerprint(
            {
                "engine": "fixture",
                "model": model_version,
                "dimension": dimension,
                "alignment": "none",
            }
        )

    @property
    def ready(self) -> bool:
        return True

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def embedding_dimension(self) -> int:
        return self._dimension

    @property
    def pipeline_fingerprint(self) -> str:
        return self._fingerprint

    def analyse(self, frame: Frame) -> AnalysedFrame:
        started = time.perf_counter()
        payload = frame.payload if isinstance(frame.payload, dict) else {}
        observations: list[FaceObservation] = []
        for face in payload.get("faces", []):
            identity = str(face.get("identity", "fixture-positive"))
            seed = int(face.get("seed", 0))
            vector = self._embedding(identity, seed)
            observations.append(
                FaceObservation(
                    embedding=vector,
                    quality=FaceQuality(
                        brightness=float(face.get("brightness", 128)),
                        sharpness=float(face.get("sharpness", 100)),
                        face_size=float(face.get("faceSize", 0.35)),
                        yaw=float(face.get("yaw", 0)),
                        pitch=float(face.get("pitch", 0)),
                        roll=float(face.get("roll", 0)),
                    ),
                )
            )
        elapsed = (time.perf_counter() - started) * 1000
        return AnalysedFrame(frame.captured_at, observations, {"analyse": elapsed})

    def _embedding(self, identity: str, seed: int) -> list[float]:
        digest = hashlib.sha256(f"{identity}:{seed}".encode()).digest()
        base = hashlib.sha256(identity.encode()).digest()
        values = [
            ((base[index % len(base)] - 127.5) / 127.5)
            + ((digest[index % len(digest)] - 127.5) / 800)
            for index in range(self._dimension)
        ]
        return normalize(values, self._dimension)


class InsightFaceEngine:
    """Lazy CPU-first InsightFace adapter; imported only in real-camera deployments."""

    def __init__(self, model_version: str, model_path: str, checksum: str, dimension: int) -> None:
        self._model_version = model_version
        self._dimension = dimension
        self._model_path = model_path
        self._checksum = checksum
        self._app = None
        self._load_error: ModelUnavailableError | None = None
        self._fingerprint = pipeline_fingerprint(
            {
                "engine": "insightface",
                "model": model_version,
                "checksum": checksum,
                "dimension": dimension,
                "alignment": "insightface-default",
            }
        )

    @property
    def ready(self) -> bool:
        try:
            self._load()
        except ModelUnavailableError as error:
            self._load_error = error
            return False
        return True

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def embedding_dimension(self) -> int:
        return self._dimension

    @property
    def pipeline_fingerprint(self) -> str:
        return self._fingerprint

    def analyse(self, frame: Frame) -> AnalysedFrame:
        self._load()
        started = time.perf_counter()
        faces = self._app.get(frame.payload)
        observations = []
        height, width = frame.payload.shape[:2]
        for face in faces:
            x1, y1, x2, y2 = face.bbox
            face_size = ((x2 - x1) * (y2 - y1)) / max(1, width * height)
            crop = frame.payload[max(0, int(y1)) : int(y2), max(0, int(x1)) : int(x2)]
            # OpenCV metrics remain local; the source frame is never persisted.
            import cv2  # type: ignore[import-not-found]

            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            observations.append(
                FaceObservation(
                    embedding=normalize(face.normed_embedding.tolist(), self._dimension),
                    quality=FaceQuality(
                        float(gray.mean()),
                        float(cv2.Laplacian(gray, cv2.CV_64F).var()),
                        float(face_size),
                        *[float(value) for value in face.pose],
                    ),
                )
            )
        elapsed = (time.perf_counter() - started) * 1000
        return AnalysedFrame(frame.captured_at, observations, {"analyse": elapsed})

    def _load(self) -> None:
        if self._app is not None:
            return
        if self._load_error is not None:
            raise self._load_error
        verify_model_checksum(self._model_path, self._checksum)
        try:
            from insightface.app import FaceAnalysis  # type: ignore[import-not-found]
        except ImportError as error:
            raise ModelUnavailableError(
                "Install the vision-real extra to use InsightFace"
            ) from error
        self._app = FaceAnalysis(
            name=Path(self._model_path).stem,
            root=str(Path(self._model_path).parent),
        )
        self._app.prepare(ctx_id=-1)
