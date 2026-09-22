"""Tests for conversation and message endpoints."""

import pytest


@pytest.mark.asyncio
async def test_create_and_list_conversations(client):
    """Test creating conversations and listing them."""
    # Create conversation
    res = await client.post("/api/chats", json={"title": "Test Chat", "model": "qwen3:4b"})
    assert res.status_code == 201
    created = res.json()
    assert created["title"] == "Test Chat"
    assert created["model"] == "qwen3:4b"
    assert "id" in created

    # List conversations
    res = await client.get("/api/chats")
    assert res.status_code == 200
    chats = res.json()
    assert len(chats) >= 1
    assert any(c["id"] == created["id"] for c in chats)


@pytest.mark.asyncio
async def test_get_and_update_conversation(client):
    """Test retrieving details and updating conversation title."""
    res = await client.post("/api/chats", json={"title": "Initial Title"})
    chat_id = res.json()["id"]

    # Retrieve
    res = await client.get(f"/api/chats/{chat_id}")
    assert res.status_code == 200
    assert res.json()["title"] == "Initial Title"

    # Rename
    res = await client.patch(f"/api/chats/{chat_id}", json={"title": "Updated Title"})
    assert res.status_code == 200
    assert res.json()["title"] == "Updated Title"

    # Verify updated
    res = await client.get(f"/api/chats/{chat_id}")
    assert res.json()["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_delete_conversation_cascades_messages(client):
    """Test deleting conversation removes it and cascades message cleanup."""
    res = await client.post("/api/chats", json={"title": "To Delete"})
    chat_id = res.json()["id"]

    # Delete
    del_res = await client.delete(f"/api/chats/{chat_id}")
    assert del_res.status_code == 204

    # Verify 404
    get_res = await client.get(f"/api/chats/{chat_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_nonexistent_chat_returns_404(client):
    """Test accessing invalid chat ID returns 404."""
    res = await client.get("/api/chats/non-existent-id")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
