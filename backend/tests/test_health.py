"""Tests for health monitoring endpoints."""

import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_health_endpoint_structure(client):
    """Test GET /api/health returns valid structured JSON matching schema."""
    with patch("app.services.ollama_service.ollama_service.check_availability", new_callable=AsyncMock) as mock_avail, \
         patch("app.services.ollama_service.ollama_service.is_model_installed", new_callable=AsyncMock) as mock_model:
        mock_avail.return_value = True
        mock_model.return_value = True

        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()

        assert data["backend"] == "online"
        assert data["database"] == "online"
        assert data["ollama"] == "online"
        assert data["model_available"] is True
        assert data["model_name"] == "qwen3:4b"
        assert data["network_mode"] == "LOCAL LAN ONLY"
        assert "storage" in data
        assert "total_gb" in data["storage"]
        assert "free_gb" in data["storage"]
        assert data["status"] in ("healthy", "degraded", "unhealthy")


@pytest.mark.asyncio
async def test_health_degraded_when_ollama_offline(client):
    """Test health reports degraded status when Ollama daemon is offline."""
    with patch("app.services.ollama_service.ollama_service.check_availability", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = False

        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()

        assert data["ollama"] == "offline"
        assert data["model_available"] is False
        assert data["status"] == "degraded"
