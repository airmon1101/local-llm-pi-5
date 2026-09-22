"""System metrics and MicroSD storage telemetry routes."""

from fastapi import APIRouter

from app.config import settings
from app.services.system_service import system_service
from app.services.ollama_service import ollama_service
from app.schemas.system import StorageInfoResponse, SystemInfoResponse

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/storage", response_model=StorageInfoResponse)
async def get_storage() -> StorageInfoResponse:
    """Retrieve detailed storage metrics for the MicroSD card."""
    return system_service.get_storage_info()


@router.get("/info", response_model=SystemInfoResponse)
async def get_system_info() -> SystemInfoResponse:
    """Retrieve safe system metadata (CPU, RAM, OS, LAN IP, Ollama status)."""
    ollama_ok = await ollama_service.check_availability()
    ollama_status = "Online" if ollama_ok else "Offline"
    return system_service.get_system_info(
        ollama_status=ollama_status,
        active_model=settings.OLLAMA_MODEL,
    )
