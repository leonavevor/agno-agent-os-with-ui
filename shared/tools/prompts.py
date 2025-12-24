"""Prompt quality helpers shared by multiple skills."""

from __future__ import annotations

from typing import List

from agno.tools import tool


FOLLOW_UP_TEMPLATE = (
    "Based on the conversation, propose two concise follow-up questions that "
    "extend the current topic."
)


@tool(description="Generate follow-up prompts to keep the session moving")
def suggest_follow_up_questions(agent, context: str | None = None) -> List[str]:
    topic = context.strip() if context else "this topic"
    return [
        f"What additional insight would help clarify {topic}?",
        f"Which related area should we explore next regarding {topic}?",
    ]
