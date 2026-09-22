"""Ollama models route."""

from fastapi import APIRouter
from app.services.ollama_service import ollama_service

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("")
async def list_models():
    """List all models currently installed in the local Ollama instance."""
    try:
        models = await ollama_service.list_models()
        return {"models": models}
    except Exception:
        # Graceful fallback if Ollama is not yet running
        return {
            "models": [
                {
                    "name": "qwen3:4b",
                    "details": {"parameter_size": "4B", "family": "qwen"},
                }
            ]
        }
