"""
Central settings for HerBalancedCycle backend.
Loads config from environment variables (.env in dev) via pydantic-settings,
which gives us automatic type validation for free — e.g. it will refuse to
boot if DATABASE_URL is missing, rather than crashing later mid-request.

Import `settings` anywhere you need a value — never read os.environ directly elsewhere.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- PostgreSQL ---
    # Format: postgresql+psycopg://username:password@host:port/database_name
    DATABASE_URL: str

    # --- Ollama (local LLM) ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"

    # --- App ---
    ENVIRONMENT: str = "development"

    # --- CORS ---
    # Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins_list(self) -> list[str]:
        """Split ALLOWED_ORIGINS into a list for the CORS middleware."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def debug(self) -> bool:
        return self.ENVIRONMENT == "development"


# Instantiated once, imported everywhere else (`from app.core.config import settings`).
# If DATABASE_URL is missing from .env, this line itself raises a clear validation
# error the instant the app starts — not 10 minutes into testing.
settings = Settings()
