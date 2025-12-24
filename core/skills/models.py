"""Dataclasses representing skill metadata and resolved assets."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, List, Sequence, Tuple


@dataclass(frozen=True)
class SkillMetadata:
    """Lightweight metadata loaded without pulling full skill context."""

    id: str
    name: str
    description: str
    root: Path
    tags: Tuple[str, ...] = field(default_factory=tuple)
    match_terms: Tuple[str, ...] = field(default_factory=tuple)
    version: str | None = None
    instructions_relpath: Path = field(default_factory=lambda: Path("SKILL.md"))
    tools_relpath: Path = field(default_factory=lambda: Path("tools"))
    refs_relpath: Path = field(default_factory=lambda: Path("refs"))


@dataclass
class SkillPackage:
    """Fully-resolved skill definition ready for orchestration."""

    metadata: SkillMetadata
    instructions: str
    tools: List[Any] = field(default_factory=list)
    references: List[Path] = field(default_factory=list)


@dataclass
class AgentContext:
    """Aggregated instructions, tools, and references for an agent."""

    instructions: str
    tools: List[Any]
    references: List[Path]
    skills: Sequence[SkillMetadata]
