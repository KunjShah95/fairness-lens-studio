import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Load configuration from environment variables."""
    
    # Database
    database_url: str = "postgresql://equitylens:equitylens_password@localhost:5432/equitylens_db"
    sqlalchemy_echo: bool = True
    
    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    
    # FastAPI
    debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Storage
    upload_dir: str = "./uploads"
    max_file_size: int = 104857600  # 100 MB
    
    # Firebase
    firebase_project_id: str = "equitylens-dev"
    firebase_api_key: str = ""
    
    # Environment
    environment: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
