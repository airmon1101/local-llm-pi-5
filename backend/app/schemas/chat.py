"""Pydantic schemas for Chat and Conversation management."""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class MessageBase(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: str
    conversation_id: str
    created_at: str


class ConversationBase(BaseModel):
    title: str = Field(default="New Chat", max_length=200)
    model: str = Field(default="qwen3:4b")
    system_prompt: Optional[str] = None


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default="New Chat", max_length=200)
    model: Optional[str] = Field(default="qwen3:4b")
    system_prompt: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    system_prompt: Optional[str] = None


class ConversationResponse(ConversationBase):
    id: str
    created_at: str
    updated_at: str
    message_count: int = 0


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse] = []


class ChatStreamRequest(BaseModel):
    """Payload sent by client when initiating a generation stream."""
    conversation_id: str
    message: str = Field(..., min_length=1, max_length=32768)
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    system_prompt: Optional[str] = None


class ChatStopRequest(BaseModel):
    """Payload to abort an active generation stream."""
    conversation_id: str


class ChatStreamChunk(BaseModel):
    """JSON payload format streamed inside SSE data frames."""
    chunk: str = ""
    done: bool = False
    message_id: Optional[str] = None
    error: Optional[str] = None
