import os
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    """Load configuration from environment variables."""

    # Database - support SQLite for local dev, PostgreSQL for production
    database_url: str = "sqlite:///./equitylens_dev.db"
    sqlalchemy_echo: bool = False

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # FastAPI
    debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = (
        "http://localhost:3000,http://localhost:5173,http://localhost:8080"
    )

    # Storage
    upload_dir: str = "./uploads"
    max_file_size: int = 104857600  # 100 MB

    # Firebase
    firebase_project_id: str = "equitylens-dev"
    firebase_api_key: str = ""
    firebase_config_json: str = ""  # Service account JSON or path to JSON file

    # Weaviate Vector DB
    weaviate_url: str = "http://localhost:8080"
    weaviate_api_key: str = ""

    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    ai_rate_limit: int = 100
    ai_rate_window: int = 86400

    # Environment
    environment: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
