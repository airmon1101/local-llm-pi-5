"""Conversation and message management coordinating with SQLite."""

import uuid
from datetime import datetime, timezone
from typing import Optional
import aiosqlite

from app.db.database import get_db
from app.core.exceptions import ConversationNotFoundError
from app.schemas.chat import (
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
)


def _now_iso() -> str:
    """Return ISO 8601 UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


class ChatManager:
    """Manages conversations and messages in SQLite."""

    async def create_conversation(
        self,
        title: Optional[str] = None,
        model: str = "qwen3:4b",
        system_prompt: Optional[str] = None,
    ) -> ConversationResponse:
        chat_id = str(uuid.uuid4())
        now = _now_iso()
        clean_title = (title or "New Chat").strip()

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (chat_id, clean_title, model, system_prompt, now, now),
            )
            await db.commit()

        return ConversationResponse(
            id=chat_id,
            title=clean_title,
            model=model,
            system_prompt=system_prompt,
            created_at=now,
            updated_at=now,
            message_count=0,
        )

    async def list_conversations(self) -> list[ConversationResponse]:
        async with get_db() as db:
            query = """
                SELECT c.id, c.title, c.model, c.system_prompt, c.created_at, c.updated_at,
                       COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                GROUP BY c.id
                ORDER BY c.updated_at DESC
            """
            async with db.execute(query) as cursor:
                rows = await cursor.fetchall()
                return [
                    ConversationResponse(
                        id=row["id"],
                        title=row["title"],
                        model=row["model"],
                        system_prompt=row["system_prompt"],
                        created_at=row["created_at"],
                        updated_at=row["updated_at"],
                        message_count=row["message_count"],
                    )
                    for row in rows
                ]

    async def get_conversation(self, chat_id: str) -> ConversationDetailResponse:
        async with get_db() as db:
            async with db.execute(
                "SELECT id, title, model, system_prompt, created_at, updated_at FROM conversations WHERE id = ?",
                (chat_id,),
            ) as cursor:
                conv_row = await cursor.fetchone()
                if not conv_row:
                    raise ConversationNotFoundError(chat_id)

            async with db.execute(
                "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (chat_id,),
            ) as cursor:
                msg_rows = await cursor.fetchall()
                messages = [
                    MessageResponse(
                        id=r["id"],
                        conversation_id=r["conversation_id"],
                        role=r["role"],
                        content=r["content"],
                        created_at=r["created_at"],
                    )
                    for r in msg_rows
                ]

            return ConversationDetailResponse(
                id=conv_row["id"],
                title=conv_row["title"],
                model=conv_row["model"],
                system_prompt=conv_row["system_prompt"],
                created_at=conv_row["created_at"],
                updated_at=conv_row["updated_at"],
                message_count=len(messages),
                messages=messages,
            )

    async def update_conversation(
        self,
        chat_id: str,
        title: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> ConversationResponse:
        now = _now_iso()
        async with get_db() as db:
            # Check existence
            async with db.execute("SELECT * FROM conversations WHERE id = ?", (chat_id,)) as cursor:
                conv = await cursor.fetchone()
                if not conv:
                    raise ConversationNotFoundError(chat_id)

            new_title = title.strip() if title else conv["title"]
            new_prompt = system_prompt if system_prompt is not None else conv["system_prompt"]

            await db.execute(
                "UPDATE conversations SET title = ?, system_prompt = ?, updated_at = ? WHERE id = ?",
                (new_title, new_prompt, now, chat_id),
            )
            await db.commit()

            return ConversationResponse(
                id=conv["id"],
                title=new_title,
                model=conv["model"],
                system_prompt=new_prompt,
                created_at=conv["created_at"],
                updated_at=now,
                message_count=0,
            )

    async def delete_conversation(self, chat_id: str) -> bool:
        async with get_db() as db:
            async with db.execute("DELETE FROM conversations WHERE id = ?", (chat_id,)) as cursor:
                await db.commit()
                if cursor.rowcount == 0:
                    raise ConversationNotFoundError(chat_id)
                return True

    async def get_messages(self, chat_id: str) -> list[MessageResponse]:
        async with get_db() as db:
            async with db.execute(
                "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (chat_id,),
            ) as cursor:
                rows = await cursor.fetchall()
                return [
                    MessageResponse(
                        id=r["id"],
                        conversation_id=r["conversation_id"],
                        role=r["role"],
                        content=r["content"],
                        created_at=r["created_at"],
                    )
                    for r in rows
                ]

    async def add_message(
        self, chat_id: str, role: str, content: str
    ) -> MessageResponse:
        message_id = str(uuid.uuid4())
        now = _now_iso()

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (message_id, chat_id, role, content, now),
            )
            # Touch conversations.updated_at
            await db.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, chat_id),
            )
            await db.commit()

        return MessageResponse(
            id=message_id,
            conversation_id=chat_id,
            role=role,
            content=content,
            created_at=now,
        )

    async def auto_generate_title_if_needed(self, chat_id: str, first_user_message: str) -> None:
        """Derive a friendly conversation title from the first prompt if title is 'New Chat'."""
        clean_text = first_user_message.strip().split("\n")[0]
        if len(clean_text) > 40:
            clean_text = clean_text[:37] + "..."

        async with get_db() as db:
            async with db.execute("SELECT title FROM conversations WHERE id = ?", (chat_id,)) as cursor:
                row = await cursor.fetchone()
                if row and row["title"] == "New Chat":
                    await db.execute(
                        "UPDATE conversations SET title = ? WHERE id = ?",
                        (clean_text, chat_id),
                    )
                    await db.commit()


chat_manager = ChatManager()
