from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Resume Screening & Ranking System"
    database_url: str = "sqlite:///./data/resume_screening.db"
    upload_dir: Path = Path("data/uploads")
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    admin_token: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    email_from: str = "recruiting@example.com"
    outbox_path: Path = Path("data/outbox.log")
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    Path("data").mkdir(exist_ok=True)
    return settings
