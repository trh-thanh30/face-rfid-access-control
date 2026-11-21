from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "access-control-vision"
    model_version: str = "not-loaded"
    camera_provider: str = "fixture"

    model_config = SettingsConfigDict(env_prefix="VISION_", extra="ignore")


settings = Settings()
