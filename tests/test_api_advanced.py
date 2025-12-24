"""Tests for memory and reference API endpoints."""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ============================================================================
# Memory API Tests
# ============================================================================


def test_initialize_memory_session():
    """Test session initialization endpoint."""
    response = client.post(
        "/memory/sessions",
        json={"session_id": "test_session_api", "user_id": "test_user"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test_session_api"
    assert data["status"] == "initialized"


def test_add_memory_message():
    """Test adding messages to session."""
    # Initialize session first
    client.post(
        "/memory/sessions",
        json={"session_id": "test_msg_session"},
    )

    # Add message
    response = client.post(
        "/memory/messages",
        json={
            "session_id": "test_msg_session",
            "role": "user",
            "content": "Hello API",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "user"
    assert data["content"] == "Hello API"


def test_get_chat_history():
    """Test retrieving chat history."""
    session_id = "test_history_session"

    # Initialize and add messages
    client.post("/memory/sessions", json={"session_id": session_id})
    client.post(
        "/memory/messages",
        json={"session_id": session_id, "role": "user", "content": "Message 1"},
    )
    client.post(
        "/memory/messages",
        json={"session_id": session_id, "role": "assistant", "content": "Reply 1"},
    )

    # Get history
    response = client.get(f"/memory/sessions/{session_id}/history?limit=10")

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id
    assert len(data["messages"]) == 2
    assert data["total"] == 2


def test_update_and_get_learned_facts():
    """Test learned facts storage and retrieval."""
    session_id = "test_facts_session"

    # Initialize session
    client.post("/memory/sessions", json={"session_id": session_id})

    # Update facts
    facts_data = '{"preference": "technical", "timezone": "UTC"}'
    update_response = client.post(
        f"/memory/sessions/{session_id}/facts",
        json={"session_id": session_id, "facts": facts_data},
    )

    assert update_response.status_code == 200
    assert update_response.json()["facts"] == facts_data

    # Retrieve facts
    get_response = client.get(f"/memory/sessions/{session_id}/facts")

    assert get_response.status_code == 200
    assert get_response.json()["facts"] == facts_data


def test_clear_memory_session():
    """Test clearing session memory."""
    session_id = "test_clear_session"

    # Initialize and populate
    client.post("/memory/sessions", json={"session_id": session_id})
    client.post(
        "/memory/messages",
        json={"session_id": session_id, "role": "user", "content": "Test"},
    )

    # Clear session
    clear_response = client.delete(f"/memory/sessions/{session_id}")

    assert clear_response.status_code == 200
    assert clear_response.json()["status"] == "cleared"

    # Verify cleared
    history_response = client.get(f"/memory/sessions/{session_id}/history")
    assert len(history_response.json()["messages"]) == 0


# ============================================================================
# Reference Search API Tests
# ============================================================================


def test_keyword_reference_search():
    """Test keyword-based reference search."""
    response = client.post(
        "/references/search",
        json={
            "query": "agent tools",
            "limit": 3,
            "use_vector": False,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "agent tools"
    assert data["search_type"] == "keyword"
    assert "results" in data


def test_get_embedding_status():
    """Test checking embedding status for a skill."""
    response = client.get("/references/skills/agno_docs/status")

    assert response.status_code == 200
    data = response.json()
    assert "skill_id" in data
    assert "is_embedded" in data
    assert "chunk_count" in data


@pytest.mark.skipif(
    True,  # Skip by default - requires OpenAI API key
    reason="Requires OpenAI API key for embeddings",
)
def test_embed_skill_references():
    """Test embedding skill references."""
    response = client.post(
        "/references/embed",
        json={"skill_id": "agno_docs", "chunk_size": 800},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["skill_id"] == "agno_docs"
    assert "chunks_indexed" in data


@pytest.mark.skipif(
    True,  # Skip by default - requires embeddings
    reason="Requires pre-embedded references",
)
def test_vector_reference_search():
    """Test vector-based semantic search."""
    response = client.post(
        "/references/search",
        json={
            "query": "How to create custom tools",
            "skill_id": "agno_docs",
            "limit": 5,
            "use_vector": True,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["search_type"] == "vector"
    assert all("similarity" in result for result in data["results"])


def test_search_with_skill_filter():
    """Test reference search with skill filtering."""
    response = client.post(
        "/references/search",
        json={
            "query": "stock price",
            "skill_id": "finance_research",
            "limit": 5,
            "use_vector": False,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "stock price"


def test_invalid_session_id():
    """Test handling of invalid session ID."""
    response = client.get("/memory/sessions/nonexistent_session/history")

    # Should return empty history, not error
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 0


def test_invalid_skill_id_embed():
    """Test embedding with non-existent skill ID."""
    response = client.post(
        "/references/embed",
        json={"skill_id": "nonexistent_skill"},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"]
