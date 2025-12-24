"""Performance and validation metrics collection system."""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from agno.run.agent import RunOutput


class ValidationStatus(str, Enum):
    """Validation result status."""

    VALID = "valid"
    INVALID = "invalid"
    HALLUCINATION = "hallucination"
    UNVERIFIED = "unverified"
    PARTIAL = "partial"


class MetricType(str, Enum):
    """Types of metrics tracked."""

    PERFORMANCE = "performance"
    VALIDATION = "validation"
    ACCURACY = "accuracy"
    LATENCY = "latency"


@dataclass
class PerformanceMetrics:
    """Performance metrics for a single operation."""

    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    duration_ms: Optional[float] = None
    token_count: Optional[int] = None
    model_name: Optional[str] = None
    skill_name: Optional[str] = None
    agent_name: Optional[str] = None

    def end(self) -> None:
        """Mark the end of the operation and calculate duration."""
        self.end_time = time.time()
        self.duration_ms = (self.end_time - self.start_time) * 1000


@dataclass
class ValidationMetrics:
    """Validation and hallucination detection metrics."""

    status: ValidationStatus = ValidationStatus.UNVERIFIED
    confidence_score: float = 0.0
    validation_checks: Dict[str, bool] = field(default_factory=dict)
    evidence_count: int = 0
    factual_claims: List[str] = field(default_factory=list)
    verified_claims: List[str] = field(default_factory=list)
    hallucination_indicators: List[str] = field(default_factory=list)
    source_references: List[str] = field(default_factory=list)
    reasoning_steps: List[str] = field(default_factory=list)


@dataclass
class ExecutionMetrics:
    """Complete metrics for an agent execution."""

    execution_id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    performance: PerformanceMetrics = field(default_factory=PerformanceMetrics)
    validation: ValidationMetrics = field(default_factory=ValidationMetrics)
    input_text: Optional[str] = None
    output_text: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "execution_id": self.execution_id,
            "timestamp": self.timestamp.isoformat(),
            "performance": {
                "duration_ms": self.performance.duration_ms,
                "token_count": self.performance.token_count,
                "model_name": self.performance.model_name,
                "skill_name": self.performance.skill_name,
                "agent_name": self.performance.agent_name,
            },
            "validation": {
                "status": self.validation.status.value,
                "confidence_score": self.validation.confidence_score,
                "validation_checks": self.validation.validation_checks,
                "evidence_count": self.validation.evidence_count,
                "factual_claims_count": len(self.validation.factual_claims),
                "verified_claims_count": len(self.validation.verified_claims),
                "hallucination_indicators": self.validation.hallucination_indicators,
                "source_references": self.validation.source_references,
                "reasoning_steps_count": len(self.validation.reasoning_steps),
            },
            "input_length": len(self.input_text) if self.input_text else 0,
            "output_length": len(self.output_text) if self.output_text else 0,
            "error": self.error,
            "metadata": self.metadata,
        }


class MetricsCollector:
    """Centralized metrics collection and aggregation."""

    def __init__(self) -> None:
        self._metrics: List[ExecutionMetrics] = []
        self._aggregates: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self._execution_count = 0

    def create_execution(self, execution_id: str, **metadata: Any) -> ExecutionMetrics:
        """Create a new execution metrics tracker."""
        execution = ExecutionMetrics(
            execution_id=execution_id,
            metadata=metadata,
        )
        self._metrics.append(execution)
        self._execution_count += 1
        return execution

    def get_metrics(
        self,
        limit: int = 100,
        filter_by: Optional[Dict[str, Any]] = None,
    ) -> List[ExecutionMetrics]:
        """Get collected metrics with optional filtering."""
        metrics = self._metrics[-limit:]

        if filter_by:
            filtered = []
            for m in metrics:
                match = True
                for key, value in filter_by.items():
                    if key == "status":
                        if m.validation.status != value:
                            match = False
                            break
                    elif key == "agent_name":
                        if m.performance.agent_name != value:
                            match = False
                            break
                if match:
                    filtered.append(m)
            return filtered

        return metrics

    def get_aggregated_stats(self) -> Dict[str, Any]:
        """Calculate aggregated statistics across all metrics."""
        if not self._metrics:
            return self._get_empty_stats()

        total = len(self._metrics)
        valid_durations = [
            m.performance.duration_ms
            for m in self._metrics
            if m.performance.duration_ms is not None
        ]

        validation_counts = defaultdict(int)
        for m in self._metrics:
            validation_counts[m.validation.status.value] += 1

        avg_confidence = (
            sum(m.validation.confidence_score for m in self._metrics) / total
        )

        return {
            "total_executions": total,
            "performance": {
                "avg_duration_ms": (
                    sum(valid_durations) / len(valid_durations)
                    if valid_durations
                    else 0
                ),
                "min_duration_ms": min(valid_durations) if valid_durations else 0,
                "max_duration_ms": max(valid_durations) if valid_durations else 0,
                "p50_duration_ms": (
                    sorted(valid_durations)[len(valid_durations) // 2]
                    if valid_durations
                    else 0
                ),
                "p95_duration_ms": (
                    sorted(valid_durations)[int(len(valid_durations) * 0.95)]
                    if valid_durations
                    else 0
                ),
            },
            "validation": {
                "status_counts": dict(validation_counts),
                "avg_confidence_score": avg_confidence,
                "valid_percentage": (
                    validation_counts[ValidationStatus.VALID.value] / total * 100
                    if total > 0
                    else 0
                ),
                "hallucination_percentage": (
                    validation_counts[ValidationStatus.HALLUCINATION.value]
                    / total
                    * 100
                    if total > 0
                    else 0
                ),
                "invalid_percentage": (
                    validation_counts[ValidationStatus.INVALID.value] / total * 100
                    if total > 0
                    else 0
                ),
            },
            "recent_executions": [m.to_dict() for m in self._metrics[-10:]],
        }

    def get_agent_stats(self, agent_name: str) -> Dict[str, Any]:
        """Get statistics for a specific agent."""
        agent_metrics = [
            m for m in self._metrics if m.performance.agent_name == agent_name
        ]

        if not agent_metrics:
            return self._get_empty_stats()

        total = len(agent_metrics)
        valid_durations = [
            m.performance.duration_ms
            for m in agent_metrics
            if m.performance.duration_ms is not None
        ]

        validation_counts = defaultdict(int)
        for m in agent_metrics:
            validation_counts[m.validation.status.value] += 1

        return {
            "agent_name": agent_name,
            "total_executions": total,
            "avg_duration_ms": (
                sum(valid_durations) / len(valid_durations) if valid_durations else 0
            ),
            "validation_stats": dict(validation_counts),
            "avg_confidence": (
                sum(m.validation.confidence_score for m in agent_metrics) / total
            ),
        }

    def clear(self) -> None:
        """Clear all collected metrics."""
        self._metrics.clear()
        self._aggregates.clear()
        self._execution_count = 0

    def _get_empty_stats(self) -> Dict[str, Any]:
        """Return empty statistics structure."""
        return {
            "total_executions": 0,
            "performance": {
                "avg_duration_ms": 0,
                "min_duration_ms": 0,
                "max_duration_ms": 0,
                "p50_duration_ms": 0,
                "p95_duration_ms": 0,
            },
            "validation": {
                "status_counts": {},
                "avg_confidence_score": 0,
                "valid_percentage": 0,
                "hallucination_percentage": 0,
                "invalid_percentage": 0,
            },
            "recent_executions": [],
        }


# Global singleton instance
_global_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> MetricsCollector:
    """Get or create the global metrics collector instance."""
    global _global_collector
    if _global_collector is None:
        _global_collector = MetricsCollector()
    return _global_collector
