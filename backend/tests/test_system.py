"""Tests for system information and storage monitoring endpoints."""

import pytest


@pytest.mark.asyncio
async def test_get_storage_endpoint(client):
    """Test storage telemetry endpoint returns positive disk metrics."""
    response = await client.get("/api/system/storage")
    assert response.status_code == 200
    data = response.json()

    assert data["total_bytes"] > 0
    assert data["free_bytes"] > 0
    assert 0.0 <= data["used_percent"] <= 100.0
    assert "is_low" in data
    assert "mount_point" in data


@pytest.mark.asyncio
async def test_get_system_info_safe_output(client):
    """Test system info returns expected keys and does not leak secrets."""
    response = await client.get("/api/system/info")
    assert response.status_code == 200
    data = response.json()

    # Required hardware/OS fields
    assert "hostname" in data
    assert "lan_ip" in data
    assert "os_name" in data
    assert "architecture" in data
    assert "cpu_cores" in data
    assert data["cpu_cores"] > 0
    assert data["ram_total_gb"] > 0
    assert "storage" in data
    assert "app_version" in data

    # Verify no sensitive leaked fields
    raw_text = response.text.lower()
    assert "password" not in raw_text
    assert "secret" not in raw_text
    assert "token" not in raw_text
