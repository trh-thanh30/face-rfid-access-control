from secrets import compare_digest

from fastapi import Depends, FastAPI, Header, HTTPException, status
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .adapters.cameras import FixtureCameraProvider, OpenCVCameraProvider
from .adapters.engines import FixtureFaceEngine, InsightFaceEngine
from .application.schemas import (
    EnrollmentRequest,
    EnrollmentResponse,
    VerificationRequest,
    VerificationResponse,
)
from .application.use_cases import CaptureCoordinator, VisionUseCases
from .domain.errors import VisionError
from .domain.quality import QualityPolicy
from .settings import Settings, settings


def build_use_cases(configuration: Settings) -> VisionUseCases:
    if configuration.camera_provider == "fixture":
        camera = FixtureCameraProvider()
        engine = FixtureFaceEngine(configuration.model_version, configuration.embedding_dimension)
    elif configuration.camera_provider == "opencv":
        if not configuration.model_path:
            raise RuntimeError("VISION_MODEL_PATH is required for the OpenCV provider")
        camera = OpenCVCameraProvider(configuration.camera_index)
        engine = InsightFaceEngine(
            configuration.model_version,
            configuration.model_path,
            configuration.model_checksum,
            configuration.embedding_dimension,
        )
    else:
        raise RuntimeError(f"Unsupported camera provider: {configuration.camera_provider}")
    quality = QualityPolicy(
        configuration.minimum_brightness,
        configuration.maximum_brightness,
        configuration.minimum_sharpness,
        configuration.minimum_face_size,
        configuration.maximum_pose_degrees,
    )
    return VisionUseCases(
        camera,
        engine,
        quality,
        CaptureCoordinator(),
        configuration.capture_limit,
        configuration.duplicate_similarity,
    )


use_cases = build_use_cases(settings)
app = FastAPI(title="Access Control Vision", version="0.2.0")
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.trusted_host_list,
)


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    expected = f"Bearer {settings.service_token}"
    if authorization is None or not compare_digest(authorization, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_SERVICE_CREDENTIAL"
        )


@app.exception_handler(VisionError)
async def vision_error_handler(_request, error: VisionError):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=422, content={"reasonCode": error.reason_code, "detail": str(error)}
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name}


@app.get("/ready")
def ready() -> dict[str, str]:
    if not use_cases.engine.ready:
        raise HTTPException(status_code=503, detail="MODEL_NOT_READY")
    return {
        "status": "ready",
        "modelVersion": use_cases.engine.model_version,
        "pipelineFingerprint": use_cases.engine.pipeline_fingerprint,
        "cameraProvider": settings.camera_provider,
    }


@app.post(
    "/internal/v1/enrollments",
    response_model=EnrollmentResponse,
    response_model_by_alias=True,
    dependencies=[Depends(require_service_token)],
)
async def enroll(request: EnrollmentRequest) -> EnrollmentResponse:
    return await use_cases.enroll(request)


@app.post(
    "/internal/v1/verifications",
    response_model=VerificationResponse,
    response_model_by_alias=True,
    dependencies=[Depends(require_service_token)],
)
async def verify(request: VerificationRequest) -> VerificationResponse:
    return await use_cases.verify(request)
