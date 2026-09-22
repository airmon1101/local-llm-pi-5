"""Test configuration and fixtures for PiLLM backend."""

import os
import tempfile
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Point to temporary test database before importing app
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db_path = temp_db.name
temp_db.close()

os.environ["DATABASE_PATH"] = temp_db_path
os.environ["STORAGE_WARNING_THRESHOLD_PERCENT"] = "1.0"
os.environ["STORAGE_WARNING_THRESHOLD_GB"] = "0.1"

from app.config import settings
settings.DATABASE_PATH = temp_db_path

from app.main import app
from app.db.database import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    """Ensure database schema is fresh for each test run."""
    await init_db()
    yield
    # Cleanup data between tests
    from app.db.database import get_db
    async with get_db() as db:
        await db.execute("DELETE FROM messages")
        await db.execute("DELETE FROM conversations")
        await db.execute("DELETE FROM app_settings")
        await db.commit()


@pytest_asyncio.fixture
async def client():
    """Asynchronous HTTP test client using ASGITransport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
