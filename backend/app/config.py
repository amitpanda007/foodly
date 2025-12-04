from pathlib import Path
from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BASE_DIR.parent


ENV_FILE_PATHS = (
    BASE_DIR / ".env",
    PROJECT_ROOT / ".env",
)


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://foodly:foodly_password@localhost:5432/foodly_db"
    
    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    
    # LLM Provider
    llm_provider: Literal["ollama", "openai", "gemini"] = "ollama"
    
    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    
    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-pro-preview"
    
    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    class Config:
        env_file = tuple(str(path) for path in ENV_FILE_PATHS)
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

