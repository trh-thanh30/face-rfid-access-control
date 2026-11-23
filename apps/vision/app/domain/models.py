from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class Frame:
    captured_at: datetime
    payload: Any


@dataclass(frozen=True)
class FaceQuality:
    brightness: float
    sharpness: float
    face_size: float
    yaw: float = 0
    pitch: float = 0
    roll: float = 0

    def as_dict(self) -> dict[str, float]:
        return {
            "brightness": self.brightness,
            "sharpness": self.sharpness,
            "faceSize": self.face_size,
            "yaw": self.yaw,
            "pitch": self.pitch,
            "roll": self.roll,
        }


@dataclass(frozen=True)
class FaceObservation:
    embedding: list[float]
    quality: FaceQuality


@dataclass(frozen=True)
class AnalysedFrame:
    captured_at: datetime
    faces: list[FaceObservation] = field(default_factory=list)
    timings_ms: dict[str, float] = field(default_factory=dict)
