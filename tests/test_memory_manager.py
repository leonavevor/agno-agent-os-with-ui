"""Tests for session-based memory manager."""

import pytest
from core.memory_manager import MemoryManager


@pytest.fixture
def memory_manager():
    """Create memory manager instance."""
    return MemoryManager()


def test_add_and_retrieve_messages(memory_manager):
    """Test adding and retrieving chat messages."""
    session_id = "test_session_1"

    # Add messages
    memory_manager.add_message(session_id, "user", "Hello!")
    memory_manager.add_message(session_id, "assistant", "Hi there!")
    memory_manager.add_message(session_id, "user", "How are you?")

    # Retrieve history
    history = memory_manager.get_chat_history(session_id, limit=10)

    assert len(history) == 3
    assert history[0]["role"] == "user"
    assert history[0]["content"] == "Hello!"
    assert history[1]["role"] == "assistant"
    assert history[2]["content"] == "How are you?"


def test_session_initialization(memory_manager):
    """Test session metadata initialization."""
    session_id = "test_session_2"
    user_id = "user_123"

    memory_manager.initialize_session(session_id, user_id=user_id)

    # Should not error on duplicate initialization
    memory_manager.initialize_session(session_id, user_id=user_id)


def test_learned_facts(memory_manager):
    """Test storing and retrieving learned facts."""
    session_id = "test_session_3"

    memory_manager.initialize_session(session_id)
    memory_manager.update_learned_facts(
        session_id, '{"user_preference": "technical explanations"}'
    )

    facts = memory_manager.get_learned_facts(session_id)
    assert facts == '{"user_preference": "technical explanations"}'


def test_clear_session(memory_manager):
    """Test clearing session data."""
    session_id = "test_session_4"

    memory_manager.add_message(session_id, "user", "Test message")
    memory_manager.initialize_session(session_id)
    memory_manager.update_learned_facts(session_id, "test facts")

    memory_manager.clear_session(session_id)

    history = memory_manager.get_chat_history(session_id)
    facts = memory_manager.get_learned_facts(session_id)

    assert len(history) == 0
    assert facts is None


def test_history_limit(memory_manager):
    """Test chat history retrieval limit."""
    session_id = "test_session_5"

    # Add many messages
    for i in range(20):
        memory_manager.add_message(session_id, "user", f"Message {i}")

    # Retrieve with limit
    history = memory_manager.get_chat_history(session_id, limit=5)
    assert len(history) == 5

    # Messages should be most recent
    assert history[-1]["content"] == "Message 19"
