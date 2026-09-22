"""Streaming chat generation and cancellation endpoints using Server-Sent Events (SSE)."""

import json
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.config import settings
from app.core.logging import logger
from app.core.exceptions import (
    OllamaServiceUnavailableError,
    ModelNotFoundError,
    ConversationNotFoundError,
    StorageCapacityCriticalError,
)
from app.schemas.chat import ChatStreamRequest, ChatStopRequest, ChatStreamChunk
from app.services.chat_manager import chat_manager
from app.services.ollama_service import ollama_service
from app.services.system_service import system_service

router = APIRouter(prefix="/chat", tags=["Inference"])


def _format_sse(data: dict) -> str:
    """Format dictionary as a compliant Server-Sent Event frame."""
    return f"data: {json.dumps(data)}\n\n"


@router.post("")
async def stream_chat(payload: ChatStreamRequest) -> StreamingResponse:
    """Stream AI response tokens progressively via Server-Sent Events (SSE).

    Persists user message, gathers conversation context, streams Ollama tokens,
    and commits the generated assistant message upon completion.
    """
    # 1. MicroSD Storage Check
    storage_info = system_service.get_storage_info()
    if storage_info.is_low:
        logger.warning("Storage check failed before inference: %s GB remaining", storage_info.free_gb)
        raise HTTPException(
            status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
            detail=f"Low storage on MicroSD ({storage_info.free_gb:.1f} GB free). Please delete old chats or free space."
        )

    # 2. Verify Conversation exists
    try:
        conversation = await chat_manager.get_conversation(payload.conversation_id)
    except ConversationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)

    # 3. Store the user's prompt in the database
    user_message = await chat_manager.add_message(
        chat_id=payload.conversation_id,
        role="user",
        content=payload.message.strip(),
    )

    # Update title if it's the first message
    await chat_manager.auto_generate_title_if_needed(
        payload.conversation_id, payload.message
    )

    # 4. Assemble context from conversation history
    history = await chat_manager.get_messages(payload.conversation_id)
    ollama_messages = [{"role": m.role, "content": m.content} for m in history]

    # Model and Prompt resolution
    model_to_use = payload.model or conversation.model or settings.OLLAMA_MODEL
    system_prompt = payload.system_prompt or conversation.system_prompt or settings.DEFAULT_SYSTEM_PROMPT

    async def event_generator() -> AsyncGenerator[str, None]:
        accumulated_response = []
        try:
            async for token in ollama_service.stream_chat(
                conversation_id=payload.conversation_id,
                messages=ollama_messages,
                model=model_to_use,
                temperature=payload.temperature,
                system_prompt=system_prompt,
            ):
                accumulated_response.append(token)
                yield _format_sse({"chunk": token, "done": False})

            full_text = "".join(accumulated_response).strip()

            if full_text:
                # Store the completed assistant response
                assistant_msg = await chat_manager.add_message(
                    chat_id=payload.conversation_id,
                    role="assistant",
                    content=full_text,
                )
                yield _format_sse({
                    "chunk": "",
                    "done": True,
                    "message_id": assistant_msg.id,
                })
            else:
                yield _format_sse({
                    "chunk": "",
                    "done": True,
                    "error": "Generation was cancelled or produced no output.",
                })

        except (OllamaServiceUnavailableError, ModelNotFoundError) as e:
            logger.error("Inference service error: %s", e)
            yield _format_sse({"chunk": "", "done": True, "error": str(e.message)})
        except Exception as e:
            logger.error("Unexpected error during streaming inference: %s", e)
            yield _format_sse({
                "chunk": "",
                "done": True,
                "error": "An unexpected error occurred during token generation."
            })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disables Nginx buffering for SSE
        },
    )


@router.post("/stop")
async def stop_generation(payload: ChatStopRequest):
    """Signal an active generation stream to stop immediately."""
    stopped = ollama_service.cancel_stream(payload.conversation_id)
    return {
        "status": "stopped" if stopped else "not_active",
        "conversation_id": payload.conversation_id,
    }
