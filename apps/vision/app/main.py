from fastapi import FastAPI

from .settings import settings

app = FastAPI(title="Access Control Vision", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {
        "status": "scaffold-ready",
        "modelVersion": settings.model_version,
        "cameraProvider": settings.camera_provider,
    }
