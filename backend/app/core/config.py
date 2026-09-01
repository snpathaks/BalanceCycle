"""
Central settings for HerBalancedCycle backend.
Loads config from environment variables (.env in dev) via pydantic-settings,
which gives us automatic type validation for free — e.g. it will refuse to
boot if DATABASE_URL is missing, rather than crashing later mid-request.

Import `settings` anywhere you need a value — never read os.environ directly elsewhere.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- PostgreSQL ---
    # Format: postgresql+psycopg://username:password@host:port/database_name
    DATABASE_URL: str

    # --- Ollama (local LLM) ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"

    # --- JWT Auth ---
    SECRET_KEY: str                                # 32-byte random hex, e.g. openssl rand -hex 32
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- App ---
    ENVIRONMENT: str = "development"

    # --- CORS ---
    # Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173" or "*"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """
        Render and various PaaS providers provide DATABASE_URL starting with
        'postgres://' or 'postgresql://'. SQLAlchemy 2.0 with psycopg3 driver
        requires 'postgresql+psycopg://'.
        """
        if not v:
            return v
        v = v.strip()
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg://", 1)
        elif v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        """Split ALLOWED_ORIGINS into a list for the CORS middleware."""
        if not self.ALLOWED_ORIGINS or self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def debug(self) -> bool:
        return self.ENVIRONMENT == "development"


# Instantiated once, imported everywhere else (`from app.core.config import settings`).
# If DATABASE_URL is missing from .env, this line itself raises a clear validation
# error the instant the app starts — not 10 minutes into testing.
settings = Settings()
