"""Pydantic models for skill metadata validation and API responses."""

from __future__ import annotations

from pathlib import Path
from typing import Any, List, Sequence

from pydantic import BaseModel, Field, field_validator


class SkillMetadataModel(BaseModel):
    """Validated skill metadata with business rules enforcement."""

    id: str = Field(..., min_length=1, pattern=r"^[a-z][a-z0-9_]*$")
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    root: Path
    tags: tuple[str, ...] = Field(default_factory=tuple)
    match_terms: tuple[str, ...] = Field(default_factory=tuple)
    version: str | None = None
    instructions_relpath: Path = Field(default=Path("SKILL.md"))
    tools_relpath: Path = Field(default=Path("tools"))
    refs_relpath: Path = Field(default=Path("refs"))

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if not value.replace("_", "").isalnum():
            raise ValueError(
                "Skill ID must contain only lowercase letters, numbers, and underscores"
            )
        return value

    @field_validator("tags", "match_terms", mode="before")
    @classmethod
    def normalize_sequences(cls, value: Any) -> tuple[str, ...]:
        if value is None:
            return ()
        if isinstance(value, (list, tuple, set)):
            return tuple(str(item).strip() for item in value if item)
        return ()

    class Config:
        frozen = True


class SkillPackageModel(BaseModel):
    """Fully-resolved skill definition with loaded assets."""

    metadata: SkillMetadataModel
    instructions: str = Field(default="")
    tools: List[Any] = Field(default_factory=list)
    references: List[Path] = Field(default_factory=list)


class AgentContextModel(BaseModel):
    """Aggregated context ready for agent instantiation."""

    instructions: str = Field(default="")
    tools: List[Any] = Field(default_factory=list)
    references: List[Path] = Field(default_factory=list)
    skills: Sequence[SkillMetadataModel] = Field(default_factory=list)


class SkillRouteRequest(BaseModel):
    """Request payload for skill routing endpoint."""

    message: str = Field(..., min_length=1)
    limit: int | None = Field(default=None, ge=1, le=20)
    tags: List[str] | None = Field(default=None)
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)


class SkillMetadataResponse(BaseModel):
    """API response model for skill metadata."""

    id: str
    name: str
    description: str
    tags: List[str]
    match_terms: List[str]
    version: str | None = None

    @classmethod
    def from_metadata(cls, metadata: SkillMetadataModel) -> "SkillMetadataResponse":
        return cls(
            id=metadata.id,
            name=metadata.name,
            description=metadata.description,
            tags=list(metadata.tags),
            match_terms=list(metadata.match_terms),
            version=metadata.version,
        )


class SkillRouteResponse(BaseModel):
    """Response payload for skill routing endpoint."""

    skills: List[SkillMetadataResponse]


class SkillReloadResponse(BaseModel):
    """Response payload for skill reload endpoint."""

    status: str
    skills: List[SkillMetadataResponse]
