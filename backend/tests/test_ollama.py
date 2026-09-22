"""Tests for Ollama integration and streaming chat endpoints."""

import json
import pytest
from unittest.mock import patch, AsyncMock
from app.services.ollama_service import ollama_service


@pytest.mark.asyncio
async def test_ollama_stream_chat_mock(client):
    """Test streaming chat endpoint returns SSE stream and commits assistant message."""
    # Create conversation first
    conv_res = await client.post("/api/chats", json={"title": "Stream Test"})
    chat_id = conv_res.json()["id"]

    # Mock Ollama stream_chat generator
    async def mock_generator(*args, **kwargs):
        tokens = ["Hello", " ", "from", " ", "Qwen3", "!"]
        for token in tokens:
            yield token

    with patch.object(ollama_service, "stream_chat", side_effect=mock_generator):
        response = await client.post(
            "/api/chat",
            json={
                "conversation_id": chat_id,
                "message": "Say hello",
            },
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        # Parse SSE lines
        chunks = []
        is_done = False
        message_id = None
        for line in response.text.split("\n"):
            if line.startswith("data: "):
                payload = json.loads(line[6:])
                if payload.get("chunk"):
                    chunks.append(payload["chunk"])
                if payload.get("done"):
                    is_done = True
                    message_id = payload.get("message_id")

        full_message = "".join(chunks)
        assert full_message == "Hello from Qwen3!"
        assert is_done is True
        assert message_id is not None

        # Verify assistant message was saved to database
        chat_details = await client.get(f"/api/chats/{chat_id}")
        messages = chat_details.json()["messages"]
        assert len(messages) == 2  # user message + assistant message
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Say hello"
        assert messages[1]["role"] == "assistant"
        assert messages[1]["content"] == "Hello from Qwen3!"


@pytest.mark.asyncio
async def test_chat_stop_endpoint(client):
    """Test /api/chat/stop signals cancellation on active stream."""
    conv_res = await client.post("/api/chats", json={"title": "Stop Test"})
    chat_id = conv_res.json()["id"]

    # Register stream event
    stop_event = ollama_service.register_stream(chat_id)
    assert not stop_event.is_set()

    # Call stop endpoint
    stop_res = await client.post("/api/chat/stop", json={"conversation_id": chat_id})
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "stopped"
    assert stop_event.is_set()


@pytest.mark.asyncio
async def test_chat_stream_invalid_chat_id(client):
    """Test initiating chat stream on non-existent chat returns 404."""
    response = await client.post(
        "/api/chat",
        json={
            "conversation_id": "non-existent-id",
            "message": "Hello",
        },
    )
    assert response.status_code == 404
