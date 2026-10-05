from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="VANCE_", env_file=".env")

    database_url: str = "postgresql://vance@localhost:5432/vance"
    redis_url: str = "redis://localhost:6379/0"

    tick_interval_seconds: float = Field(default=5.0, gt=0)
    idle_refresh_seconds: float = Field(default=300.0, gt=0)
    cache_ttl_seconds: int = Field(default=30, gt=0)

    db_pool_min_size: int = Field(default=2, ge=1)
    db_pool_max_size: int = Field(default=16, ge=1)

    # Shared secret the UE5 dedicated server presents on the ingest socket.
    server_ingest_token: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
