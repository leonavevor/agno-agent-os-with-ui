"""Skill catalog API exposing discovery and routing endpoints."""

from __future__ import annotations

from typing import Iterable, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core import skill_orchestrator
from core.skills import SkillMetadata

router = APIRouter(prefix="/skills", tags=["skills"])


class SkillMetadataResponse(BaseModel):
    id: str
    name: str
    description: str
    tags: List[str]
    match_terms: List[str] = Field(default_factory=list)
    version: Optional[str] = None

    @classmethod
    def from_metadata(cls, metadata: SkillMetadata) -> "SkillMetadataResponse":
        return cls(
            id=metadata.id,
            name=metadata.name,
            description=metadata.description,
            tags=list(metadata.tags),
            match_terms=list(metadata.match_terms),
            version=metadata.version,
        )


class RouteRequest(BaseModel):
    message: str = Field(..., description="User message to analyse for relevant skills")
    limit: Optional[int] = Field(
        default=None, ge=1, description="Maximum number of skills to return"
    )
    tags: Optional[List[str]] = Field(
        default=None, description="Restrict routing to skills carrying these tags"
    )
    min_score: float = Field(
        default=0.0,
        ge=0.0,
        description="Minimum router score before accepting a skill",
    )


class RouteResponse(BaseModel):
    skills: List[SkillMetadataResponse]


class ReloadResponse(BaseModel):
    status: str
    skills: List[SkillMetadataResponse]


class CreateSkillRequest(BaseModel):
    name: str = Field(..., description="Skill name", min_length=1, max_length=100)
    description: str = Field(..., description="Skill description", min_length=1)
    tags: List[str] = Field(default_factory=list, description="Skill tags")
    match_terms: List[str] = Field(
        default_factory=list, description="Terms for skill routing"
    )
    instructions: str = Field(default="", description="Skill instructions/prompt")
    version: Optional[str] = Field(default="1.0.0", description="Skill version")


class CreateSkillResponse(BaseModel):
    status: str
    skill: SkillMetadataResponse
    message: str


@router.get("", response_model=List[SkillMetadataResponse])
async def list_skills() -> List[SkillMetadataResponse]:
    return [
        SkillMetadataResponse.from_metadata(metadata)
        for metadata in skill_orchestrator.catalog()
    ]


@router.post("/route", response_model=RouteResponse)
async def route_skills(payload: RouteRequest) -> RouteResponse:
    matches = skill_orchestrator.route_skills(
        payload.message,
        limit=payload.limit,
        tags=payload.tags,
        min_score=payload.min_score,
    )
    return RouteResponse(
        skills=[SkillMetadataResponse.from_metadata(metadata) for metadata in matches]
    )


@router.post("/reload", response_model=ReloadResponse)
async def reload_skills() -> ReloadResponse:
    try:
        skill_orchestrator.reload_config()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ReloadResponse(
        status="reloaded",
        skills=[
            SkillMetadataResponse.from_metadata(metadata)
            for metadata in skill_orchestrator.catalog()
        ],
    )


@router.post("/create", response_model=CreateSkillResponse)
async def create_skill(payload: CreateSkillRequest) -> CreateSkillResponse:
    """Create a new skill with the provided metadata and instructions."""
    from pathlib import Path
    import yaml
    import re

    # Generate skill ID from name
    skill_id = re.sub(r"[^a-z0-9]+", "-", payload.name.lower()).strip("-")

    # Check if skill already exists
    try:
        skill_orchestrator.registry.get_metadata(skill_id)
        raise HTTPException(
            status_code=409,
            detail=f"Skill with ID '{skill_id}' already exists. Please use a different name.",
        )
    except KeyError:
        pass  # Skill doesn't exist, we can create it

    # Create skill directory
    skill_root = skill_orchestrator.registry.root / skill_id
    try:
        skill_root.mkdir(parents=True, exist_ok=False)
    except FileExistsError:
        raise HTTPException(
            status_code=409, detail=f"Directory for skill '{skill_id}' already exists"
        )

    try:
        # Create skill.yaml manifest
        manifest_data = {
            "id": skill_id,
            "name": payload.name,
            "description": payload.description,
            "tags": payload.tags,
            "match_terms": payload.match_terms,
            "version": payload.version,
        }
        manifest_path = skill_root / "skill.yaml"
        manifest_path.write_text(
            yaml.dump(manifest_data, default_flow_style=False, sort_keys=False)
        )

        # Create SKILL.md instructions file
        instructions_content = (
            payload.instructions
            if payload.instructions
            else f"# {payload.name}\n\n{payload.description}"
        )
        instructions_path = skill_root / "SKILL.md"
        instructions_path.write_text(instructions_content)

        # Create tools and refs directories
        (skill_root / "tools").mkdir(exist_ok=True)
        (skill_root / "refs").mkdir(exist_ok=True)

        # Create placeholder __init__.py in tools
        (skill_root / "tools" / "__init__.py").write_text(
            "# Add your skill tools here\n"
        )

        # Reload the skill catalog to pick up the new skill
        skill_orchestrator.registry.reload()

        # Get the newly created skill metadata
        new_metadata = skill_orchestrator.registry.get_metadata(skill_id)

        return CreateSkillResponse(
            status="created",
            skill=SkillMetadataResponse.from_metadata(new_metadata),
            message=f"Skill '{payload.name}' created successfully with ID '{skill_id}'",
        )

    except Exception as exc:
        # Cleanup on failure
        import shutil

        if skill_root.exists():
            shutil.rmtree(skill_root)
        raise HTTPException(
            status_code=500, detail=f"Failed to create skill: {str(exc)}"
        ) from exc
