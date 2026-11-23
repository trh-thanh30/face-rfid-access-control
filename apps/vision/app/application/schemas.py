from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        alias_generator=lambda name: name.split("_")[0]
        + "".join(part.title() for part in name.split("_")[1:]),
        populate_by_name=True,
        serialize_by_alias=True,
    )


class EnrollmentRequest(StrictModel):
    session_id: UUID
    correlation_id: str = Field(min_length=1, max_length=128)
    deadline: datetime
    sample_count: int = Field(ge=5, le=10)


class EnrollmentTemplate(StrictModel):
    embedding: list[float]
    quality_score: float = Field(ge=0, le=1)
    model_version: str
    pipeline_fingerprint: str


class EnrollmentResponse(StrictModel):
    templates: list[EnrollmentTemplate]
    rejected_frame_count: int = Field(ge=0)
    model_version: str
    pipeline_fingerprint: str
    quality: dict[str, float]
    latency_ms: int = Field(ge=0)


class VisionReference(StrictModel):
    template_id: UUID
    embedding: list[float] = Field(min_length=1, max_length=2048)
    model_version: str = Field(min_length=1, max_length=128)
    pipeline_fingerprint: str = Field(min_length=1, max_length=256)


class VerificationRequest(StrictModel):
    session_id: UUID
    correlation_id: str = Field(min_length=1, max_length=128)
    deadline: datetime
    minimum_valid_frames: int = Field(ge=1, le=30)
    threshold: float = Field(ge=-1, le=1)
    references: list[VisionReference] = Field(min_length=1, max_length=20)


class VerificationResponse(StrictModel):
    matched: bool
    similarity: float | None
    valid_frame_count: int = Field(ge=0)
    model_version: str
    pipeline_fingerprint: str
    latency_ms: int = Field(ge=0)
    reason_code: (
        Literal[
            "FACE_MISMATCH",
            "NO_FACE",
            "MULTIPLE_FACES",
            "LOW_QUALITY",
            "CAMERA_BUSY",
            "SESSION_EXPIRED",
            "NO_FACE_PROFILE",
            "INTERNAL_ERROR",
        ]
        | None
    ) = None
    quality: dict[str, float]
