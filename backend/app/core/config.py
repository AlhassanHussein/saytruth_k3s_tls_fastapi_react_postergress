from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parents[3]
DEFAULT_SQLITE_PATH = BASE_DIR / "database/sqlite/saytruth.db"
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"


class Settings(BaseSettings):
    app_name: str = "SayTruth API"
    api_prefix: str = "/api"
    secret_key: str = "change-this-secret"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = DEFAULT_SQLITE_URL
    algorithm: str = "HS256"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def get_settings() -> Settings:
    return Settings()
