"""Database connection and initialization module using aiosqlite."""

import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import aiosqlite

from app.config import settings
from app.core.logging import logger

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


async def get_db_path() -> str:
    """Ensure data directory exists and return absolute database path."""
    db_path = Path(settings.DATABASE_PATH).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return str(db_path)


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Provide an asynchronous connection to SQLite with MicroSD-optimized pragmas."""
    db_path = await get_db_path()
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row

    try:
        # MicroSD endurance & performance pragmas
        await conn.execute("PRAGMA foreign_keys = ON;")
        await conn.execute("PRAGMA journal_mode = WAL;")
        await conn.execute("PRAGMA synchronous = NORMAL;")
        await conn.execute("PRAGMA temp_store = MEMORY;")
        await conn.execute("PRAGMA busy_timeout = 5000;")
        yield conn
    finally:
        await conn.close()


async def init_db() -> None:
    """Initialize SQLite database tables and indexes from schema file."""
    logger.info("Initializing SQLite database at: %s", settings.DATABASE_PATH)
    db_path = await get_db_path()

    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema file not found at {SCHEMA_PATH}")

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    async with get_db() as db:
        await db.executescript(schema_sql)
        await db.commit()

    logger.info("Database initialized successfully with WAL mode enabled.")


async def check_db_health() -> bool:
    """Verify database responsiveness for health check."""
    try:
        async with get_db() as db:
            async with db.execute("SELECT 1") as cursor:
                row = await cursor.fetchone()
                return bool(row and row[0] == 1)
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        return False
