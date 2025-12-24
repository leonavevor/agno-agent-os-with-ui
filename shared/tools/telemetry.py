"""Telemetry helpers shared across agents."""

from __future__ import annotations

from datetime import datetime, timezone

from agno.tools import tool


@tool(description="Emit a structured event log with ISO-8601 timestamp")
def emit_skill_event(agent, event: str) -> str:
    timestamp = datetime.now(timezone.utc).isoformat()
    message = f"[{timestamp}] {event.strip()}"
    # Agent logger may not be available; return for downstream handling.
    return message


@tool(description="Return the current UTC timestamp for audit trails")
def current_timestamp(agent) -> str:
    return datetime.now(timezone.utc).isoformat()
