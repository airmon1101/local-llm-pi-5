"""Settings management routes."""

from datetime import datetime, timezone
import json
from fastapi import APIRouter

from app.config import settings
from app.db.database import get_db
from app.schemas.settings import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "model": settings.OLLAMA_MODEL,
    "temperature": settings.DEFAULT_TEMPERATURE,
    "max_output_tokens": 2048,
    "system_prompt": settings.DEFAULT_SYSTEM_PROMPT,
    "theme": "dark",
    "auto_scroll": True,
    "compact_mode": False,
}


@router.get("", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    """Retrieve persisted application and inference settings."""
    current = dict(DEFAULT_SETTINGS)
    async with get_db() as db:
        async with db.execute("SELECT key, value FROM app_settings") as cursor:
            rows = await cursor.fetchall()
            for r in rows:
                k, v = r["key"], r["value"]
                try:
                    current[k] = json.loads(v)
                except Exception:
                    current[k] = v

    return SettingsResponse(**current)


@router.put("", response_model=SettingsResponse)
async def update_settings(payload: SettingsUpdate) -> SettingsResponse:
    """Update application and inference settings."""
    updates = payload.model_dump(exclude_unset=True)
    now = datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        for k, v in updates.items():
            val_str = json.dumps(v)
            await db.execute(
                """
                INSERT INTO app_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
                """,
                (k, val_str, now),
            )
        await db.commit()

    return await get_settings()
