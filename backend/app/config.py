"""Configuration management for PiLLM backend using Pydantic Settings."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings tuned for Raspberry Pi 5 deployment."""

    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False
    APP_VERSION: str = "1.0.0"
    APP_NAME: str = "PiLLM"
    APP_DESCRIPTION: str = "Private Local AI Chat Server on Raspberry Pi 5"

    # Ollama integration
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen3:4b"
    OLLAMA_TIMEOUT_SECONDS: int = 180
    OLLAMA_NUM_THREADS: int = 4  # RPi 5 has 4 Cortex-A76 cores
    OLLAMA_NUM_CTX: int = 2048  # Conserve RAM on 8GB shared architecture

    # SQLite Database (MicroSD optimized)
    DATABASE_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data", "pillm.db"
    )

    # Storage monitoring (64GB MicroSD wear prevention)
    STORAGE_WARNING_THRESHOLD_PERCENT: float = 10.0
    STORAGE_WARNING_THRESHOLD_GB: float = 5.0

    # Default AI behavior
    DEFAULT_SYSTEM_PROMPT: str = (
        "You are PiLLM, a helpful AI assistant running locally on a Raspberry Pi. "
        "Provide accurate, practical, and easy-to-understand answers. "
        "When answering technical questions, provide useful examples."
    )
    DEFAULT_TEMPERATURE: float = 0.7

    # CORS settings - LAN only
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://127.0.0.1",
        "http://raspberrypi.local",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
