import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _env_files() -> tuple[Path, ...]:
    # backend/.env always; ENV_FILE=.env.test or .env.demo is layered on top (its values win),
    # so tests and demos change only the database, the inbox, the secret and the LLM address.
    files = [BACKEND_ROOT / ".env"]
    extra = os.environ.get("ENV_FILE")
    if extra:
        files.append(BACKEND_ROOT / extra)
    return tuple(files)


class Settings(BaseSettings):
    """Every setting comes from the environment (documented in README.md). Process variables win over files."""

    # utf-8-sig: a .env saved by Windows tools may start with a byte-order mark.
    model_config = SettingsConfigDict(env_file=_env_files(), env_file_encoding="utf-8-sig", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    port: int = 4000
    log_level: str = "info"

    mongodb_uri: str

    jwt_secret: str = Field(min_length=32)
    frontend_url: str = "http://localhost:5173"

    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_pass: str
    smtp_from: str

    # Mail to a reserved .test address (demo and test accounts) goes to this Ethereal inbox, never
    # through Brevo. Empty: such mail is not sent at all.
    demo_smtp_host: str = ""
    demo_smtp_port: int = 587
    demo_smtp_user: str = ""
    demo_smtp_pass: str = ""

    # Any OpenAI-compatible chat API: Groq for real use, the local stub (e2e/mocks/llm-stub.js) in tests and
    # demos. Only these values change between them, never the code.
    llm_base_url: str
    llm_model: str = "openai/gpt-oss-120b"
    llm_api_key: str = ""
    llm_timeout_seconds: float = Field(default=30, gt=0, le=120)
    # How long a reasoning model may think before answering ("" sends nothing: other models
    # don't know the setting). gpt-oss needs "low", or its thinking uses up the answer's tokens.
    llm_reasoning_effort: Literal["", "low", "medium", "high"] = ""

    rate_limits_enabled: bool = True

    demo_mode: bool = False
    demo_password: str = Field(default="", max_length=72)

    # A folder with the built frontend (frontend/dist). When set, the API also serves the app, so one
    # service is the whole site on one origin (the Docker image sets it). See app/core/frontend.py.
    static_dir: str | None = None

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
