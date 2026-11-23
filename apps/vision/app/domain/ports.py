from datetime import datetime
from typing import Protocol

from .models import AnalysedFrame, Frame


class CameraProvider(Protocol):
    def capture(self, *, deadline: datetime, limit: int) -> list[Frame]: ...


class FaceEngine(Protocol):
    @property
    def ready(self) -> bool: ...

    @property
    def model_version(self) -> str: ...

    @property
    def embedding_dimension(self) -> int: ...

    @property
    def pipeline_fingerprint(self) -> str: ...

    def analyse(self, frame: Frame) -> AnalysedFrame: ...
