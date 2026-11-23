from dataclasses import dataclass

from .models import FaceQuality


@dataclass(frozen=True)
class QualityPolicy:
    minimum_brightness: float
    maximum_brightness: float
    minimum_sharpness: float
    minimum_face_size: float
    maximum_pose_degrees: float

    def violations(self, quality: FaceQuality) -> list[str]:
        failures: list[str] = []
        if quality.brightness < self.minimum_brightness:
            failures.append("TOO_DARK")
        if quality.brightness > self.maximum_brightness:
            failures.append("TOO_BRIGHT")
        if quality.sharpness < self.minimum_sharpness:
            failures.append("BLURRY")
        if quality.face_size < self.minimum_face_size:
            failures.append("FACE_TOO_SMALL")
        if max(abs(quality.yaw), abs(quality.pitch), abs(quality.roll)) > self.maximum_pose_degrees:
            failures.append("POSE_OUT_OF_RANGE")
        return failures

    def score(self, quality: FaceQuality) -> float:
        brightness_center = (self.minimum_brightness + self.maximum_brightness) / 2
        brightness_span = max(1, (self.maximum_brightness - self.minimum_brightness) / 2)
        brightness_score = max(
            0.0, 1 - abs(quality.brightness - brightness_center) / brightness_span
        )
        sharpness_score = min(1.0, quality.sharpness / max(1, self.minimum_sharpness * 2))
        size_score = min(1.0, quality.face_size / max(0.01, self.minimum_face_size * 2))
        pose_score = max(
            0.0,
            1
            - max(abs(quality.yaw), abs(quality.pitch), abs(quality.roll))
            / max(1, self.maximum_pose_degrees),
        )
        return round((brightness_score + sharpness_score + size_score + pose_score) / 4, 6)
