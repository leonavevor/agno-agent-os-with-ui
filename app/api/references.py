"""Reference search API endpoints for agentic RAG."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from shared.tools.vector_references import VectorReferenceStore, get_vector_store

router = APIRouter(prefix="/references", tags=["references"])


class SearchRequest(BaseModel):
    """Request to search references."""

    query: str = Field(..., min_length=1)
    skill_id: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)
    use_vector: bool = Field(
        default=False, description="Use vector embeddings for semantic search"
    )


class SearchResult(BaseModel):
    """Individual search result."""

    skill_id: str
    file_path: str
    content: str
    chunk_index: int
    similarity: Optional[float] = None


class SearchResponse(BaseModel):
    """Search results response."""

    query: str
    results: List[SearchResult]
    total: int
    search_type: str


class EmbedRequest(BaseModel):
    """Request to embed skill references."""

    skill_id: str = Field(..., min_length=1)
    chunk_size: int = Field(default=1000, ge=100, le=5000)


class EmbedResponse(BaseModel):
    """Embedding response."""

    skill_id: str
    chunks_indexed: int
    status: str


@router.post("/search", response_model=SearchResponse)
async def search_references(payload: SearchRequest) -> SearchResponse:
    """
    Search across skill references.

    Supports both keyword search (fast, offline) and vector search (semantic, requires embeddings).
    """
    try:
        if payload.use_vector:
            # Vector search
            store = get_vector_store()
            results = store.search(
                query=payload.query,
                skill_id=payload.skill_id,
                limit=payload.limit,
            )
            return SearchResponse(
                query=payload.query,
                results=[SearchResult(**r) for r in results],
                total=len(results),
                search_type="vector",
            )
        else:
            # Keyword search - use the tool directly
            from shared.tools.references import search_skill_references

            # Mock agent for tool call
            class MockAgent:
                pass

            result_text = search_skill_references(MockAgent(), payload.query)

            # Parse results (simple implementation - returns formatted text)
            return SearchResponse(
                query=payload.query,
                results=[
                    SearchResult(
                        skill_id=payload.skill_id or "all",
                        file_path="",
                        content=result_text,
                        chunk_index=0,
                    )
                ],
                total=1,
                search_type="keyword",
            )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/embed", response_model=EmbedResponse)
async def embed_skill_references(payload: EmbedRequest) -> EmbedResponse:
    """
    Embed skill references for vector search.

    This is a one-time operation per skill that enables semantic search capabilities.
    """
    try:
        from pathlib import Path
        from core import skill_orchestrator

        # Get skill references
        skill_metadata = next(
            (s for s in skill_orchestrator.catalog() if s.id == payload.skill_id),
            None,
        )

        if not skill_metadata:
            raise HTTPException(
                status_code=404,
                detail=f"Skill '{payload.skill_id}' not found",
            )

        # Load skill to get references
        skill_package = skill_orchestrator.registry.load_skill(payload.skill_id)

        if not skill_package.references:
            return EmbedResponse(
                skill_id=payload.skill_id,
                chunks_indexed=0,
                status="no_references",
            )

        # Embed references
        store = get_vector_store()
        chunks_indexed = store.embed_references(
            skill_id=payload.skill_id,
            reference_paths=skill_package.references,
            chunk_size=payload.chunk_size,
        )

        return EmbedResponse(
            skill_id=payload.skill_id,
            chunks_indexed=chunks_indexed,
            status="completed",
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/skills/{skill_id}/status")
async def get_embedding_status(skill_id: str) -> dict:
    """Check if a skill's references are embedded."""
    try:
        store = get_vector_store()

        # Check if any documents exist for this skill
        with store.SessionLocal() as session:
            from shared.tools.vector_references import ReferenceDocument

            count = (
                session.query(ReferenceDocument)
                .filter(ReferenceDocument.skill_id == skill_id)
                .count()
            )

        return {
            "skill_id": skill_id,
            "is_embedded": count > 0,
            "chunk_count": count,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
