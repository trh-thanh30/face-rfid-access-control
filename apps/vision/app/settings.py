from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "access-control-vision"
    service_token: str = "development-vision-token"
    model_version: str = "fixture-face-v1"
    model_path: str | None = None
    model_checksum: str = "fixture"
    embedding_dimension: int = Field(default=512, ge=1, le=2048)
    camera_provider: str = "fixture"
    camera_index: int = Field(default=0, ge=0)
    capture_limit: int = Field(default=30, ge=1, le=120)
    minimum_face_size: float = Field(default=0.12, ge=0, le=1)
    minimum_brightness: float = Field(default=35, ge=0, le=255)
    maximum_brightness: float = Field(default=220, ge=0, le=255)
    minimum_sharpness: float = Field(default=45, ge=0)
    maximum_pose_degrees: float = Field(default=25, ge=0, le=90)
    duplicate_similarity: float = Field(default=0.995, ge=-1, le=1)

    model_config = SettingsConfigDict(env_prefix="VISION_", extra="ignore")


settings = Settings()
