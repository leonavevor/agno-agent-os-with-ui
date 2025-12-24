"""Session-based memory manager using PostgreSQL for persistent chat history."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from db.url import get_db_url

Base = declarative_base()


class ChatMessage(Base):
    """Persistent chat message with session tracking."""

    __tablename__ = "chat_messages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    message_metadata = Column(Text, nullable=True)  # JSON string for tool calls, etc


class SessionMemory(Base):
    """Session-level metadata and learned facts."""

    __tablename__ = "session_memory"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(String(255), nullable=False, unique=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    learned_facts = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MemoryManager:
    """Manages persistent chat history and session memory."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        url = database_url or get_db_url()
        self.engine = create_engine(url, pool_pre_ping=True)
        self.SessionLocal = sessionmaker(bind=self.engine, expire_on_commit=False)
        Base.metadata.create_all(self.engine)

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        message_metadata: Optional[str] = None,
    ) -> UUID:
        """Store a chat message."""
        with self.SessionLocal() as session:
            message = ChatMessage(
                session_id=session_id,
                role=role,
                content=content,
                message_metadata=message_metadata,
            )
            session.add(message)
            session.commit()
            return message.id

    def get_chat_history(
        self,
        session_id: str,
        limit: int = 50,
    ) -> List[dict]:
        """Retrieve recent chat messages for a session."""
        with self.SessionLocal() as session:
            messages = (
                session.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.timestamp.desc())
                .limit(limit)
                .all()
            )
            return [
                {
                    "id": str(msg.id),
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.message_metadata,
                }
                for msg in reversed(messages)
            ]

    def initialize_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Create or update session metadata."""
        with self.SessionLocal() as session:
            existing = (
                session.query(SessionMemory)
                .filter(SessionMemory.session_id == session_id)
                .first()
            )
            if not existing:
                session_mem = SessionMemory(
                    session_id=session_id,
                    user_id=user_id,
                )
                session.add(session_mem)
                session.commit()

    def update_learned_facts(
        self,
        session_id: str,
        facts: str,
    ) -> None:
        """Store learned facts for a session."""
        with self.SessionLocal() as session:
            session_mem = (
                session.query(SessionMemory)
                .filter(SessionMemory.session_id == session_id)
                .first()
            )
            if session_mem:
                session_mem.learned_facts = facts
                session_mem.updated_at = datetime.utcnow()
                session.commit()

    def get_learned_facts(self, session_id: str) -> Optional[str]:
        """Retrieve learned facts for a session."""
        with self.SessionLocal() as session:
            session_mem = (
                session.query(SessionMemory)
                .filter(SessionMemory.session_id == session_id)
                .first()
            )
            return session_mem.learned_facts if session_mem else None

    def clear_session(self, session_id: str) -> None:
        """Delete all messages and memory for a session."""
        with self.SessionLocal() as session:
            session.query(ChatMessage).filter(
                ChatMessage.session_id == session_id
            ).delete()
            session.query(SessionMemory).filter(
                SessionMemory.session_id == session_id
            ).delete()
            session.commit()

    def list_sessions(
        self,
        limit: int = 100,
        user_id: Optional[str] = None,
    ) -> List[dict]:
        """List all sessions with metadata."""
        with self.SessionLocal() as session:
            query = session.query(SessionMemory)
            if user_id:
                query = query.filter(SessionMemory.user_id == user_id)

            sessions = (
                query.order_by(SessionMemory.updated_at.desc()).limit(limit).all()
            )

            result = []
            for sess in sessions:
                # Count messages for this session
                message_count = (
                    session.query(ChatMessage)
                    .filter(ChatMessage.session_id == sess.session_id)
                    .count()
                )

                result.append(
                    {
                        "session_id": sess.session_id,
                        "user_id": sess.user_id,
                        "message_count": message_count,
                        "has_facts": bool(sess.learned_facts),
                        "created_at": (
                            sess.created_at.isoformat() if sess.created_at else None
                        ),
                        "updated_at": (
                            sess.updated_at.isoformat() if sess.updated_at else None
                        ),
                        "learned_facts": sess.learned_facts,
                    }
                )

            return result

    def get_stats(self) -> dict:
        """Get memory statistics across all sessions."""
        with self.SessionLocal() as session:
            total_sessions = session.query(SessionMemory).count()
            total_messages = session.query(ChatMessage).count()
            sessions_with_facts = (
                session.query(SessionMemory)
                .filter(SessionMemory.learned_facts.isnot(None))
                .count()
            )

            return {
                "total_sessions": total_sessions,
                "total_messages": total_messages,
                "sessions_with_facts": sessions_with_facts,
                "average_messages_per_session": (
                    total_messages / total_sessions if total_sessions > 0 else 0
                ),
            }

    def clear_all_sessions(self) -> int:
        """Delete all sessions and messages."""
        with self.SessionLocal() as session:
            count = session.query(SessionMemory).count()
            session.query(ChatMessage).delete()
            session.query(SessionMemory).delete()
            session.commit()
            return count

    def search_messages(
        self,
        query: str,
        session_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[dict]:
        """Search messages by content."""
        with self.SessionLocal() as session:
            query_obj = session.query(ChatMessage)

            # Filter by content (case-insensitive)
            query_obj = query_obj.filter(ChatMessage.content.ilike(f"%{query}%"))

            # Filter by session if provided
            if session_id:
                query_obj = query_obj.filter(ChatMessage.session_id == session_id)

            messages = (
                query_obj.order_by(ChatMessage.timestamp.desc()).limit(limit).all()
            )

            return [
                {
                    "id": str(msg.id),
                    "session_id": msg.session_id,
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.message_metadata,
                }
                for msg in messages
            ]
