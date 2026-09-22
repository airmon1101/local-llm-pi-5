"""Pydantic schemas for health monitoring and diagnostics."""

from typing import Literal
from pydantic import BaseModel, Field


class StorageHealth(BaseModel):
    total_gb: float
    used_gb: float
    free_gb: float
    used_percent: float
    is_low: bool


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    backend: Literal["online", "offline"] = "online"
    database: Literal["online", "offline"]
    ollama: Literal["online", "offline"]
    model_available: bool
    model_name: str
    storage: StorageHealth
    network_mode: str = "LOCAL LAN ONLY"
    version: str
    timestamp: str
