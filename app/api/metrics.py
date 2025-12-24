"""API endpoints for metrics and validation results."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field

from core.metrics_collector import (
    ExecutionMetrics,
    MetricType,
    ValidationStatus,
    get_metrics_collector,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])


class MetricsSummary(BaseModel):
    """Summary of metrics data."""

    total_executions: int
    performance: Dict[str, float]
    validation: Dict[str, Any]
    recent_executions: List[Dict[str, Any]]


class ExecutionDetail(BaseModel):
    """Detailed execution metrics."""

    execution_id: str
    timestamp: str
    duration_ms: Optional[float]
    validation_status: str
    confidence_score: float
    agent_name: Optional[str]
    model_name: Optional[str]
    skill_name: Optional[str]
    hallucination_indicators: List[str]
    error: Optional[str]


class AgentMetrics(BaseModel):
    """Metrics for a specific agent."""

    agent_name: str
    total_executions: int
    avg_duration_ms: float
    validation_stats: Dict[str, int]
    avg_confidence: float


class ValidationInsights(BaseModel):
    """Detailed validation insights."""

    total_validated: int
    valid_count: int
    hallucination_count: int
    invalid_count: int
    unverified_count: int
    avg_confidence: float
    common_hallucination_patterns: List[str]
    validation_trend: List[Dict[str, Any]]


@router.get(
    "/summary",
    response_model=MetricsSummary,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated metrics summary",
)
async def get_metrics_summary() -> MetricsSummary:
    """
    Get aggregated metrics including performance and validation statistics.

    Returns comprehensive overview of:
    - Total executions
    - Performance metrics (latency, throughput)
    - Validation results (truth vs hallucination)
    - Recent execution details
    """
    collector = get_metrics_collector()
    stats = collector.get_aggregated_stats()
    return MetricsSummary(**stats)


@router.get(
    "/executions",
    response_model=List[ExecutionDetail],
    status_code=status.HTTP_200_OK,
    summary="Get execution details",
)
async def get_executions(
    limit: int = Query(default=50, ge=1, le=500),
    status_filter: Optional[ValidationStatus] = Query(default=None),
    agent_name: Optional[str] = Query(default=None),
) -> List[ExecutionDetail]:
    """
    Get detailed execution metrics with optional filtering.

    Parameters:
    - limit: Maximum number of executions to return
    - status_filter: Filter by validation status (valid, invalid, hallucination, etc.)
    - agent_name: Filter by specific agent name
    """
    collector = get_metrics_collector()

    filter_params = {}
    if status_filter:
        filter_params["status"] = status_filter
    if agent_name:
        filter_params["agent_name"] = agent_name

    metrics = collector.get_metrics(limit=limit, filter_by=filter_params or None)

    return [
        ExecutionDetail(
            execution_id=m.execution_id,
            timestamp=m.timestamp.isoformat(),
            duration_ms=m.performance.duration_ms,
            validation_status=m.validation.status.value,
            confidence_score=m.validation.confidence_score,
            agent_name=m.performance.agent_name,
            model_name=m.performance.model_name,
            skill_name=m.performance.skill_name,
            hallucination_indicators=m.validation.hallucination_indicators,
            error=m.error,
        )
        for m in metrics
    ]


@router.get(
    "/agent/{agent_name}",
    response_model=AgentMetrics,
    status_code=status.HTTP_200_OK,
    summary="Get metrics for specific agent",
)
async def get_agent_metrics(agent_name: str) -> AgentMetrics:
    """
    Get performance and validation metrics for a specific agent.

    Provides agent-specific insights including:
    - Total executions by this agent
    - Average response time
    - Validation success rate
    - Hallucination frequency
    """
    collector = get_metrics_collector()
    stats = collector.get_agent_stats(agent_name)
    return AgentMetrics(**stats)


@router.get(
    "/validation-insights",
    response_model=ValidationInsights,
    status_code=status.HTTP_200_OK,
    summary="Get detailed validation insights",
)
async def get_validation_insights() -> ValidationInsights:
    """
    Get detailed insights about validation results and hallucination patterns.

    Provides comprehensive analysis of:
    - Validation status distribution
    - Common hallucination indicators
    - Confidence score trends
    - Truth vs hallucination rates
    """
    collector = get_metrics_collector()
    metrics = collector.get_metrics(limit=1000)

    if not metrics:
        return ValidationInsights(
            total_validated=0,
            valid_count=0,
            hallucination_count=0,
            invalid_count=0,
            unverified_count=0,
            avg_confidence=0.0,
            common_hallucination_patterns=[],
            validation_trend=[],
        )

    # Calculate counts by status
    status_counts = {
        ValidationStatus.VALID: 0,
        ValidationStatus.HALLUCINATION: 0,
        ValidationStatus.INVALID: 0,
        ValidationStatus.UNVERIFIED: 0,
    }

    all_indicators: List[str] = []
    confidences: List[float] = []

    for m in metrics:
        status_counts[m.validation.status] = (
            status_counts.get(m.validation.status, 0) + 1
        )
        all_indicators.extend(m.validation.hallucination_indicators)
        confidences.append(m.validation.confidence_score)

    # Find common patterns
    from collections import Counter

    indicator_counts = Counter(all_indicators)
    common_patterns = [
        pattern for pattern, count in indicator_counts.most_common(10) if count > 1
    ]

    # Create validation trend (last 20 executions)
    trend = []
    for m in metrics[-20:]:
        trend.append(
            {
                "timestamp": m.timestamp.isoformat(),
                "status": m.validation.status.value,
                "confidence": m.validation.confidence_score,
            }
        )

    return ValidationInsights(
        total_validated=len(metrics),
        valid_count=status_counts.get(ValidationStatus.VALID, 0),
        hallucination_count=status_counts.get(ValidationStatus.HALLUCINATION, 0),
        invalid_count=status_counts.get(ValidationStatus.INVALID, 0),
        unverified_count=status_counts.get(ValidationStatus.UNVERIFIED, 0),
        avg_confidence=sum(confidences) / len(confidences) if confidences else 0.0,
        common_hallucination_patterns=common_patterns,
        validation_trend=trend,
    )


@router.post(
    "/clear",
    status_code=status.HTTP_200_OK,
    summary="Clear all collected metrics",
)
async def clear_metrics() -> Dict[str, str]:
    """
    Clear all collected metrics data.

    Warning: This will permanently delete all metrics history.
    """
    collector = get_metrics_collector()
    collector.clear()
    return {"status": "success", "message": "All metrics cleared"}


@router.get(
    "/performance/distribution",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get performance distribution",
)
async def get_performance_distribution() -> Dict[str, Any]:
    """
    Get distribution of performance metrics.

    Returns percentiles and distribution of:
    - Response latency
    - Token usage
    - Validation times
    """
    collector = get_metrics_collector()
    metrics = collector.get_metrics(limit=1000)

    durations = [
        m.performance.duration_ms
        for m in metrics
        if m.performance.duration_ms is not None
    ]

    if not durations:
        return {
            "sample_size": 0,
            "percentiles": {},
            "buckets": {},
        }

    sorted_durations = sorted(durations)
    n = len(sorted_durations)

    percentiles = {
        "p10": sorted_durations[int(n * 0.1)],
        "p25": sorted_durations[int(n * 0.25)],
        "p50": sorted_durations[int(n * 0.5)],
        "p75": sorted_durations[int(n * 0.75)],
        "p90": sorted_durations[int(n * 0.9)],
        "p95": sorted_durations[int(n * 0.95)],
        "p99": sorted_durations[int(n * 0.99)] if n > 100 else sorted_durations[-1],
    }

    # Create latency buckets
    buckets = {
        "0-100ms": sum(1 for d in durations if d < 100),
        "100-500ms": sum(1 for d in durations if 100 <= d < 500),
        "500ms-1s": sum(1 for d in durations if 500 <= d < 1000),
        "1s-5s": sum(1 for d in durations if 1000 <= d < 5000),
        "5s+": sum(1 for d in durations if d >= 5000),
    }

    return {
        "sample_size": n,
        "percentiles": percentiles,
        "buckets": buckets,
        "avg": sum(durations) / n,
        "min": min(durations),
        "max": max(durations),
    }
