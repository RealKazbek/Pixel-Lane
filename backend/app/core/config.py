from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Pixel Lane API"
    environment: str = "development"
    debug: bool = False

    database_url: str = "postgresql+psycopg://pixel_lane:pixel_lane@localhost:5432/pixel_lane"

    # Comma-separated list of allowed origins for CORS. Never use "*" in production.
    cors_allow_origins: str = "http://localhost:3000"

    # Safeguard against oversized nested JSON payloads (e.g. a City Model
    # submission). Not a full quota system, just a sane upper bound.
    max_request_body_bytes: int = 2_000_000

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
