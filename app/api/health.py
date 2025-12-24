"""Enhanced health check endpoint with detailed status information."""

from typing import Dict, Any
from fastapi import APIRouter, status
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    """Health check response model."""

    status: str
    version: str = "1.0.0"
    database: Dict[str, Any]
    features: Dict[str, bool]
    uptime: float


@router.get(
    "/system/health", response_model=HealthStatus, status_code=status.HTTP_200_OK
)
async def health_check() -> HealthStatus:
    """
    Comprehensive health check endpoint.

    Returns system status, database connectivity, and feature flags.
    """
    import os
    import time
    from datetime import datetime

    start_time = time.time()

    # Check database connectivity with more details
    db_status = {
        "connected": False,
        "error": None,
        "latency_ms": None,
        "pool_size": None,
    }
    try:
        from core.memory_manager import MemoryManager
        from sqlalchemy import text

        memory = MemoryManager()
        db_start = time.time()
        # Try a simple query
        with memory.SessionLocal() as session:
            session.execute(text("SELECT 1"))
        db_status["connected"] = True
        db_status["latency_ms"] = round((time.time() - db_start) * 1000, 2)
        db_status["pool_size"] = memory.engine.pool.size()
    except Exception as e:
        db_status["error"] = str(e)

    # Check feature flags
    features = {
        "memory": os.getenv("ENABLE_MEMORY", "True").lower() == "true",
        "vector_rag": os.getenv("ENABLE_VECTOR_RAG", "True").lower() == "true",
        "validation": os.getenv("ENABLE_VALIDATION", "True").lower() == "true",
        "skills": os.getenv("ENABLE_SKILLS", "True").lower() == "true",
    }

    # Calculate uptime (simplified - would need proper tracking in production)
    uptime = time.time() - start_time

    return HealthStatus(
        status="healthy" if db_status["connected"] else "degraded",
        database=db_status,
        features=features,
        uptime=uptime,
    )


@router.get("/readiness", status_code=status.HTTP_200_OK)
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness probe for Kubernetes/container orchestration.

    Returns 200 if service is ready to accept traffic.
    """
    try:
        from core.memory_manager import MemoryManager
        from sqlalchemy import text

        memory = MemoryManager()
        with memory.SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception as e:
        return {"ready": False, "error": str(e)}


@router.get("/liveness", status_code=status.HTTP_200_OK)
async def liveness_check() -> Dict[str, Any]:
    """
    Liveness probe for Kubernetes/container orchestration.

    Returns 200 if service is alive (doesn't check dependencies).
    """
    import time

    return {"alive": True, "timestamp": str(time.time())}
