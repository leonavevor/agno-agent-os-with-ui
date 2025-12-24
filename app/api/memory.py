"""Memory management API endpoints for session history and learned facts."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.memory_manager import MemoryManager

router = APIRouter(prefix="/memory", tags=["memory"])

# Initialize memory manager singleton
memory_manager = MemoryManager()


class MessageCreate(BaseModel):
    """Request to add a message to session history."""

    session_id: str = Field(..., min_length=1)
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)
    metadata: Optional[str] = None


class MessageResponse(BaseModel):
    """Single chat message response."""

    id: str
    role: str
    content: str
    timestamp: str
    metadata: Optional[str] = None


class SessionInitRequest(BaseModel):
    """Request to initialize a session."""

    session_id: str = Field(..., min_length=1)
    user_id: Optional[str] = None


class SessionResponse(BaseModel):
    """Session status response."""

    session_id: str
    status: str


class ChatHistoryResponse(BaseModel):
    """Chat history response."""

    session_id: str
    messages: List[MessageResponse]
    total: int


class LearnedFactsRequest(BaseModel):
    """Request to update learned facts."""

    session_id: str = Field(..., min_length=1)
    facts: str = Field(..., min_length=1)


class LearnedFactsResponse(BaseModel):
    """Learned facts response."""

    session_id: str
    facts: Optional[str] = None


@router.post("/sessions", response_model=SessionResponse)
async def initialize_session(payload: SessionInitRequest) -> SessionResponse:
    """Initialize a new session or update existing one."""
    try:
        memory_manager.initialize_session(
            session_id=payload.session_id,
            user_id=payload.user_id,
        )
        return SessionResponse(
            session_id=payload.session_id,
            status="initialized",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/messages", response_model=MessageResponse)
async def add_message(payload: MessageCreate) -> MessageResponse:
    """Add a message to session history."""
    try:
        message_id = memory_manager.add_message(
            session_id=payload.session_id,
            role=payload.role,
            content=payload.content,
            message_metadata=payload.metadata,  # Fixed: use message_metadata parameter name
        )
        return MessageResponse(
            id=str(message_id),
            role=payload.role,
            content=payload.content,
            timestamp="",  # Will be filled by manager
            metadata=payload.metadata,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    limit: int = 50,
) -> ChatHistoryResponse:
    """Retrieve chat history for a session."""
    try:
        messages = memory_manager.get_chat_history(
            session_id=session_id,
            limit=limit,
        )
        return ChatHistoryResponse(
            session_id=session_id,
            messages=[MessageResponse(**msg) for msg in messages],
            total=len(messages),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/facts", response_model=LearnedFactsResponse)
async def update_learned_facts(
    session_id: str,
    payload: LearnedFactsRequest,
) -> LearnedFactsResponse:
    """Update learned facts for a session."""
    try:
        memory_manager.update_learned_facts(
            session_id=session_id,
            facts=payload.facts,
        )
        return LearnedFactsResponse(
            session_id=session_id,
            facts=payload.facts,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/facts", response_model=LearnedFactsResponse)
async def get_learned_facts(session_id: str) -> LearnedFactsResponse:
    """Retrieve learned facts for a session."""
    try:
        facts = memory_manager.get_learned_facts(session_id=session_id)
        return LearnedFactsResponse(
            session_id=session_id,
            facts=facts,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/sessions/{session_id}")
async def clear_session(session_id: str) -> SessionResponse:
    """Clear all messages and memory for a session."""
    try:
        memory_manager.clear_session(session_id=session_id)
        return SessionResponse(
            session_id=session_id,
            status="cleared",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/sessions")
async def list_sessions(
    limit: int = 100,
    user_id: Optional[str] = None,
) -> dict:
    """List all sessions with metadata."""
    try:
        sessions = memory_manager.list_sessions(limit=limit, user_id=user_id)
        return {
            "sessions": sessions,
            "total": len(sessions),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/stats")
async def get_memory_stats() -> dict:
    """Get memory statistics across all sessions."""
    try:
        stats = memory_manager.get_stats()
        return stats
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/sessions")
async def clear_all_sessions() -> dict:
    """Clear all sessions and messages."""
    try:
        count = memory_manager.clear_all_sessions()
        return {
            "status": "cleared",
            "sessions_deleted": count,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/search")
async def search_messages(
    query: str,
    session_id: Optional[str] = None,
    limit: int = 50,
) -> dict:
    """Search messages by content."""
    try:
        results = memory_manager.search_messages(
            query=query,
            session_id=session_id,
            limit=limit,
        )
        return {
            "results": results,
            "total": len(results),
            "query": query,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
