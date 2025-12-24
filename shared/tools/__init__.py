"""Shared tool factories used across agents."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from .prompts import suggest_follow_up_questions
from .references import search_skill_references
from .telemetry import current_timestamp, emit_skill_event


DEFAULT_SHARED_TOOLS: tuple[Any, ...] = (
    emit_skill_event,
    current_timestamp,
    suggest_follow_up_questions,
    search_skill_references,
)


def get_tools() -> Sequence[Any]:
    """Return shared tool instances with telemetry and prompt helpers."""

    return list(DEFAULT_SHARED_TOOLS)


__all__ = ["DEFAULT_SHARED_TOOLS", "get_tools"]
