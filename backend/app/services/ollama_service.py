"""Dedicated Ollama service client for PiLLM.

Handles communication with the local Ollama daemon on http://127.0.0.1:11434.
Optimized for Raspberry Pi 5 CPU inference:
- Uses 4 threads (RPi 5 Cortex-A76 cores)
- Limits context window to conserve RAM
- Streams tokens progressively without full buffering
"""

import asyncio
import json
from typing import AsyncGenerator, Optional
import httpx

from app.config import settings
from app.core.logging import logger
from app.core.exceptions import OllamaServiceUnavailableError, ModelNotFoundError


class OllamaService:
    """Encapsulates all communication with the Ollama local HTTP API."""

    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL):
        self.base_url = base_url.rstrip("/")
        # Registry of active generation stop events keyed by conversation_id
        self._active_cancellations: dict[str, asyncio.Event] = {}

    async def check_availability(self) -> bool:
        """Check if Ollama daemon is reachable on localhost:11434."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception as e:
            logger.warning("Ollama availability check failed: %s", e)
            return False

    async def list_models(self) -> list[dict]:
        """Fetch all installed models from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    return data.get("models", [])
                return []
        except Exception as e:
            logger.error("Failed to list models from Ollama: %s", e)
            raise OllamaServiceUnavailableError() from e

    async def is_model_installed(self, model_name: str = settings.OLLAMA_MODEL) -> bool:
        """Check whether the required model is downloaded and ready."""
        try:
            models = await self.list_models()
            clean_target = model_name.lower().split(":")[0]
            for m in models:
                name = m.get("name", "").lower()
                if name == model_name.lower() or name.startswith(clean_target):
                    return True
            return False
        except Exception:
            return False

    def register_stream(self, conversation_id: str) -> asyncio.Event:
        """Register an in-flight stream cancellation event."""
        stop_event = asyncio.Event()
        self._active_cancellations[conversation_id] = stop_event
        return stop_event

    def unregister_stream(self, conversation_id: str) -> None:
        """Clean up cancellation event after stream finishes."""
        self._active_cancellations.pop(conversation_id, None)

    def cancel_stream(self, conversation_id: str) -> bool:
        """Signal an active generation stream to halt immediately."""
        stop_event = self._active_cancellations.get(conversation_id)
        if stop_event:
            stop_event.set()
            logger.info("Signaled stream cancellation for conversation: %s", conversation_id)
            return True
        return False

    async def stream_chat(
        self,
        conversation_id: str,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens progressively from Ollama.

        Yields individual text chunks as they arrive from Ollama.
        """
        target_model = model or settings.OLLAMA_MODEL
        target_temp = temperature if temperature is not None else settings.DEFAULT_TEMPERATURE

        # Build payload with system prompt if provided
        ollama_messages = []
        if system_prompt:
            ollama_messages.append({"role": "system", "content": system_prompt})
        ollama_messages.extend(messages)

        # Options tuned specifically for Raspberry Pi 5 ARM Cortex-A76 cores
        payload = {
            "model": target_model,
            "messages": ollama_messages,
            "stream": True,
            "options": {
                "num_thread": settings.OLLAMA_NUM_THREADS,
                "num_ctx": settings.OLLAMA_NUM_CTX,
                "temperature": target_temp,
            },
        }

        stop_event = self.register_stream(conversation_id)

        try:
            timeout = httpx.Timeout(
                connect=5.0,
                read=float(settings.OLLAMA_TIMEOUT_SECONDS),
                write=10.0,
                pool=5.0,
            )
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST", f"{self.base_url}/api/chat", json=payload
                ) as response:
                    if response.status_code == 404:
                        raise ModelNotFoundError(target_model)
                    if response.status_code != 200:
                        err_body = await response.aread()
                        logger.error("Ollama returned HTTP %d: %s", response.status_code, err_body.decode())
                        raise OllamaServiceUnavailableError(
                            f"Ollama returned HTTP {response.status_code}: {err_body.decode()}"
                        )

                    async for line in response.aiter_lines():
                        if stop_event.is_set():
                            logger.info("Generation aborted by user for conversation %s", conversation_id)
                            break

                        if not line.strip():
                            continue

                        try:
                            data = json.loads(line)
                            chunk = data.get("message", {}).get("content", "")
                            if chunk:
                                yield chunk

                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue

        except httpx.ConnectError as e:
            logger.error("Cannot connect to Ollama daemon on %s: %s", self.base_url, e)
            raise OllamaServiceUnavailableError() from e
        except httpx.ReadTimeout as e:
            logger.error("Ollama generation timed out after %d seconds: %s", settings.OLLAMA_TIMEOUT_SECONDS, e)
            raise PiLLMException("Inference timed out. The model may be processing a heavy load.", status_code=504) from e
        finally:
            self.unregister_stream(conversation_id)


ollama_service = OllamaService()
