"""Pydantic schemas for safe system information and storage monitoring."""

from typing import Optional
from pydantic import BaseModel


class StorageInfoResponse(BaseModel):
    total_bytes: int
    used_bytes: int
    free_bytes: int
    total_gb: float
    used_gb: float
    free_gb: float
    used_percent: float
    is_low: bool
    warning_threshold_percent: float
    mount_point: str


class SystemInfoResponse(BaseModel):
    hostname: str
    lan_ip: str
    os_name: str
    architecture: str
    cpu_model: str
    cpu_cores: int
    ram_total_gb: float
    ram_available_gb: float
    ram_used_percent: float
    storage: StorageInfoResponse
    ollama_status: str
    active_model: str
    app_version: str
    uptime_seconds: Optional[float] = None
