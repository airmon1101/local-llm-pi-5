"""Conversation and message history management routes."""

from fastapi import APIRouter, HTTPException, status

from app.services.chat_manager import chat_manager
from app.schemas.chat import (
    ConversationResponse,
    ConversationDetailResponse,
    ConversationCreate,
    ConversationUpdate,
    MessageResponse,
)
from app.core.exceptions import ConversationNotFoundError

router = APIRouter(prefix="/chats", tags=["Chats"])


@router.get("", response_model=list[ConversationResponse])
async def list_chats() -> list[ConversationResponse]:
    """Retrieve all conversations ordered by most recently active."""
    return await chat_manager.list_conversations()


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(payload: ConversationCreate) -> ConversationResponse:
    """Initialize a new conversation thread."""
    return await chat_manager.create_conversation(
        title=payload.title,
        model=payload.model or "qwen3:4b",
        system_prompt=payload.system_prompt,
    )


@router.get("/{chat_id}", response_model=ConversationDetailResponse)
async def get_chat(chat_id: str) -> ConversationDetailResponse:
    """Retrieve conversation details along with full message history."""
    try:
        return await chat_manager.get_conversation(chat_id)
    except ConversationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch("/{chat_id}", response_model=ConversationResponse)
async def update_chat(chat_id: str, payload: ConversationUpdate) -> ConversationResponse:
    """Update conversation title or custom system prompt."""
    try:
        return await chat_manager.update_conversation(
            chat_id=chat_id,
            title=payload.title,
            system_prompt=payload.system_prompt,
        )
    except ConversationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(chat_id: str):
    """Delete conversation and cascade delete all associated messages."""
    try:
        await chat_manager.delete_conversation(chat_id)
        return None
    except ConversationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.get("/{chat_id}/messages", response_model=list[MessageResponse])
async def get_chat_messages(chat_id: str) -> list[MessageResponse]:
    """Retrieve chronological messages for a conversation."""
    try:
        # Verify conversation exists
        await chat_manager.get_conversation(chat_id)
        return await chat_manager.get_messages(chat_id)
    except ConversationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
