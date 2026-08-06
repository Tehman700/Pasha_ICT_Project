"""Settings, read from .env at the repo root."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", Path(".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://rukhsat_app:devpassword@localhost:5432/rukhsat"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "dev-only-change-me"
    jwt_expires_seconds: int = 86400
    jwt_algorithm: str = "HS256"

    qr_signing_private_key_path: str = "./keys/qr_private.pem"
    qr_signing_public_key_path: str = "./keys/qr_public.pem"
    fcm_service_account_json_path: str = "./keys/fcm-service-account.json"

    geofence_radius_m: int = 1000
    # The classroom announcement fires on ETA, not on the geofence ring —
    # 1–2 minutes is ~500-650m and varies with traffic.
    announce_eta_seconds: int = 120
    # Foreground tracking auto-stops after this, so no session is left running.
    trip_max_minutes: int = 90

    environment: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:8081,http://localhost:8082"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
