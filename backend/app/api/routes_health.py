"""Health monitoring route."""

from datetime import datetime, timezone
from fastapi import APIRouter

from app.config import settings
from app.db.database import check_db_health
from app.services.ollama_service import ollama_service
from app.services.system_service import system_service
from app.schemas.health import HealthResponse, StorageHealth

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Comprehensive health check of all PiLLM subsystems."""
    # 1. Check Database
    db_ok = await check_db_health()

    # 2. Check Ollama daemon
    ollama_ok = await ollama_service.check_availability()

    # 3. Check Qwen3 4B Model presence
    model_ok = False
    if ollama_ok:
        model_ok = await ollama_service.is_model_installed(settings.OLLAMA_MODEL)

    # 4. Check Storage
    storage_info = system_service.get_storage_info()
    storage_health = StorageHealth(
        total_gb=storage_info.total_gb,
        used_gb=storage_info.used_gb,
        free_gb=storage_info.free_gb,
        used_percent=storage_info.used_percent,
        is_low=storage_info.is_low,
    )

    # Determine composite system state
    if db_ok and ollama_ok and model_ok and not storage_info.is_low:
        overall_status = "healthy"
    elif db_ok and (not ollama_ok or not model_ok or storage_info.is_low):
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"

    return HealthResponse(
        status=overall_status,
        backend="online",
        database="online" if db_ok else "offline",
        ollama="online" if ollama_ok else "offline",
        model_available=model_ok,
        model_name=settings.OLLAMA_MODEL,
        storage=storage_health,
        network_mode="LOCAL LAN ONLY",
        version=settings.APP_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
