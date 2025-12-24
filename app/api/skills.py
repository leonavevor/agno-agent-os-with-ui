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
