"""Application settings from environment variable names in `.env.example`."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    aamad_target_runtime: str = "crewai"
    currency_code: str = "USD"

    database_url: str = ""

    secret_key: str = ""
    auth_username: str = ""
    auth_password: str = ""

    openai_api_key: str = ""
    openai_api_base: str = ""
    llm_model: str = "gpt-4o-mini"

    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173"

    crewai_storage_dir: str = ""
    copilot_timeout_seconds: int = 60

    # External REST (Sprint 4 — Open Food Facts)
    open_food_facts_base_url: str = "https://world.openfoodfacts.org"
    external_http_timeout_seconds: float = 10.0

    # Crew budget pin (backend.md); not a product KPI.
    crew_max_rpm: int = 10

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_runtime(self) -> str:
        value = (self.aamad_target_runtime or "crewai").strip().lower()
        return value if value else "crewai"

    @property
    def llm_configured(self) -> bool:
        return bool(self.openai_api_key.strip())

    @property
    def auth_enabled(self) -> bool:
        """Bearer auth when SECRET_KEY is set; otherwise open local mode."""
        return bool(self.secret_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
