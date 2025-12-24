"""
Enhanced Knowledge Base API
Provides additional features for knowledge management including search, filtering, and better error handling
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.dependencies import get_db

router = APIRouter(prefix="/knowledge", tags=["Knowledge Management"])


def get_agent_os(request: Request):
    """Get AgentOS instance from app state"""
    return request.app.state.agent_os


@router.get("/stats")
async def get_knowledge_stats(
    request: Request,
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Get knowledge base statistics including counts by status
    """
    try:
        agent_os = get_agent_os(request)

        # Check if knowledge base is available
        if not hasattr(agent_os, "knowledge") or agent_os.knowledge is None:
            return {
                "total": 0,
                "completed": 0,
                "processing": 0,
                "pending": 0,
                "failed": 0,
                "total_size": 0,
                "total_access_count": 0,
                "message": "Knowledge base not configured",
            }

        # Get all knowledge items
        response = agent_os.knowledge.get_content(limit=1000, page=1, db_id=db_id)

        items = response.get("data", [])

        # Calculate statistics
        stats = {
            "total": len(items),
            "completed": len([i for i in items if i.get("status") == "completed"]),
            "processing": len([i for i in items if i.get("status") == "processing"]),
            "pending": len([i for i in items if i.get("status") == "pending"]),
            "failed": len([i for i in items if i.get("status") == "failed"]),
            "total_size": sum(int(i.get("size", 0) or 0) for i in items),
            "total_access_count": sum(
                int(i.get("access_count", 0) or 0) for i in items
            ),
        }

        return stats
    except Exception as e:
        # Return empty stats instead of error
        return {
            "total": 0,
            "completed": 0,
            "processing": 0,
            "pending": 0,
            "failed": 0,
            "total_size": 0,
            "total_access_count": 0,
            "error": str(e),
        }


@router.get("/search")
async def search_knowledge(
    request: Request,
    q: str = Query(..., description="Search query"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, description="Number of results to return"),
    page: int = Query(1, description="Page number"),
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Search knowledge base by name, description, or content
    """
    try:
        agent_os = get_agent_os(request)

        # Check if knowledge base is available
        if not hasattr(agent_os, "knowledge") or agent_os.knowledge is None:
            return {
                "data": [],
                "meta": {
                    "page": page,
                    "limit": limit,
                    "total_pages": 0,
                    "total_count": 0,
                },
            }

        # Get all knowledge items (AgentOS will need to support filtering)
        response = agent_os.knowledge.get_content(
            limit=1000, page=1, db_id=db_id  # Get more items for client-side filtering
        )

        items = response.get("data", [])

        # Filter by search query
        query_lower = q.lower()
        filtered_items = [
            item
            for item in items
            if query_lower in item.get("name", "").lower()
            or query_lower in (item.get("description") or "").lower()
        ]

        # Filter by status if provided
        if status:
            filtered_items = [
                item for item in filtered_items if item.get("status") == status
            ]

        # Paginate results
        total = len(filtered_items)
        start = (page - 1) * limit
        end = start + limit
        paginated_items = filtered_items[start:end]

        return {
            "data": paginated_items,
            "meta": {
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit if total > 0 else 0,
                "total_count": total,
            },
        }
    except Exception as e:
        # Return empty results instead of error
        return {
            "data": [],
            "meta": {
                "page": page,
                "limit": limit,
                "total_pages": 0,
                "total_count": 0,
            },
            "error": str(e),
        }


@router.post("/retry/{content_id}")
async def retry_knowledge_processing(
    request: Request,
    content_id: str,
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Retry processing a failed knowledge item
    """
    try:
        agent_os = get_agent_os(request)

        # Get the content item
        content = agent_os.knowledge.get_content_by_id(content_id, db_id=db_id)

        if not content:
            raise HTTPException(status_code=404, detail="Knowledge item not found")

        if content.get("status") != "failed":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot retry item with status: {content.get('status')}",
            )

        # Trigger reprocessing (this would need to be implemented in AgentOS)
        # For now, we'll return a message
        return {
            "message": "Retry functionality requires AgentOS enhancement",
            "content_id": content_id,
            "current_status": content.get("status"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retry failed: {str(e)}")


@router.put("/{content_id}/metadata")
async def update_knowledge_metadata(
    request: Request,
    content_id: str,
    metadata: dict,
    db_id: Optional[str] = Query(None, description="Database ID to use"),
):
    """
    Update metadata for a knowledge item
    """
    try:
        agent_os = get_agent_os(request)

        # This would need AgentOS support for metadata updates
        return {
            "message": "Metadata update functionality requires AgentOS enhancement",
            "content_id": content_id,
            "metadata": metadata,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.get("/health")
async def knowledge_health_check(request: Request):
    """
    Check knowledge base health and configuration
    """
    try:
        agent_os = get_agent_os(request)

        # Check if knowledge base is configured
        has_embedder = (
            hasattr(agent_os.knowledge, "embedder")
            if hasattr(agent_os, "knowledge")
            else False
        )

        # Try to get knowledge items
        try:
            response = agent_os.knowledge.get_content(limit=1, page=1)
            can_list = True
        except:
            can_list = False

        return {
            "status": "ok" if can_list else "degraded",
            "has_knowledge_base": hasattr(agent_os, "knowledge"),
            "has_embedder": has_embedder,
            "can_list_content": can_list,
            "message": (
                "Knowledge base is operational"
                if can_list
                else "Knowledge base may not be properly configured"
            ),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
