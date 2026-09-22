"""Pydantic schemas for user and AI settings."""

from typing import Optional
from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    model: str
    temperature: float
    max_output_tokens: int
    system_prompt: str
    theme: str  # 'dark', 'light', 'system'
    auto_scroll: bool
    compact_mode: bool


class SettingsUpdate(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_output_tokens: Optional[int] = Field(None, ge=128, le=8192)
    system_prompt: Optional[str] = None
    theme: Optional[str] = None
    auto_scroll: Optional[bool] = None
    compact_mode: Optional[bool] = None
