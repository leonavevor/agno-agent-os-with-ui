"""
Example: Using Performance Metrics and Hallucination Detection

This example demonstrates how to use the integrated metrics system to:
1. Track performance metrics (latency, throughput)
2. Detect hallucinations and validate responses
3. View real-time metrics in the UI
"""

import asyncio
from agno.agent import Agent
from agno.models.openai import OpenAIChat

from core.validation_loop import ValidationLoop
from core.metrics_collector import get_metrics_collector, ValidationStatus
from core.hallucination_detector import get_hallucination_detector
from pydantic import BaseModel


class ResearchResult(BaseModel):
    """Structured research result."""

    topic: str
    summary: str
    key_findings: list[str]
    confidence: float
    sources: list[str]


async def example_with_metrics():
    """
    Example showing end-to-end metrics collection and validation.
    """
    print("=" * 60)
    print("Performance Metrics & Hallucination Detection Example")
    print("=" * 60)

    # Create an agent
    agent = Agent(
        name="Research Assistant",
        model=OpenAIChat(id="gpt-4o-mini"),
        instructions=[
            "You are a helpful research assistant.",
            "Provide accurate, well-researched information.",
            "Cite sources when possible.",
            "Be honest about uncertainty - use hedging language when appropriate.",
        ],
    )

    # Create validation loop with metrics enabled
    validator = ValidationLoop(
        agent=agent,
        max_retries=2,
        enable_metrics=True,
        enable_hallucination_check=True,
    )

    # Test case 1: Valid research query
    print("\n" + "=" * 60)
    print("Test 1: Valid Research Query")
    print("=" * 60)

    query = "What are the main principles of machine learning?"
    print(f"\nQuery: {query}")

    response = agent.run(query)
    print(f"\nResponse: {response.content[:200]}...")

    # Check for hallucinations
    hallucination_detector = get_hallucination_detector()
    validation_result = hallucination_detector.check_response(
        response_text=response.content, context=query
    )

    print(f"\nValidation Status: {validation_result.status.value}")
    print(f"Confidence Score: {validation_result.confidence_score:.2%}")
    print(f"Factual Claims Found: {len(validation_result.factual_claims)}")
    print(f"Verified Claims: {len(validation_result.verified_claims)}")

    if validation_result.hallucination_indicators:
        print(f"\nHallucination Indicators:")
        for indicator in validation_result.hallucination_indicators:
            print(f"  - {indicator}")

    # Test case 2: Query that might produce hallucinations
    print("\n" + "=" * 60)
    print("Test 2: Potentially Problematic Query")
    print("=" * 60)

    tricky_query = (
        "What were the exact attendance numbers at the AGI conference in 2024?"
    )
    print(f"\nQuery: {tricky_query}")

    response2 = agent.run(tricky_query)
    print(f"\nResponse: {response2.content[:200]}...")

    validation_result2 = hallucination_detector.check_response(
        response_text=response2.content, context=tricky_query
    )

    print(f"\nValidation Status: {validation_result2.status.value}")
    print(f"Confidence Score: {validation_result2.confidence_score:.2%}")

    if validation_result2.hallucination_indicators:
        print(f"\nHallucination Indicators:")
        for indicator in validation_result2.hallucination_indicators:
            print(f"  - {indicator}")

    # Get aggregated metrics
    print("\n" + "=" * 60)
    print("Aggregated Metrics Summary")
    print("=" * 60)

    collector = get_metrics_collector()
    stats = collector.get_aggregated_stats()

    print(f"\nTotal Executions: {stats['total_executions']}")
    print(f"\nPerformance:")
    print(f"  Avg Duration: {stats['performance']['avg_duration_ms']:.2f}ms")
    print(f"  P95 Duration: {stats['performance']['p95_duration_ms']:.2f}ms")

    print(f"\nValidation:")
    print(f"  Valid: {stats['validation']['valid_percentage']:.1f}%")
    print(f"  Hallucination: {stats['validation']['hallucination_percentage']:.1f}%")
    print(f"  Avg Confidence: {stats['validation']['avg_confidence_score']:.2%}")

    print("\n" + "=" * 60)
    print("View detailed metrics in the UI:")
    print("1. Open the AgentOS UI")
    print("2. Click 'Metrics' in the sidebar")
    print("3. Explore performance and validation insights")
    print("=" * 60)


async def example_with_structured_validation():
    """
    Example using structured validation with metrics.
    """
    print("\n" + "=" * 60)
    print("Structured Validation with Metrics")
    print("=" * 60)

    agent = Agent(
        name="Research Agent",
        model=OpenAIChat(id="gpt-4o-mini"),
        instructions=[
            "You are a research assistant that provides structured results.",
            "Always provide accurate information with proper sourcing.",
        ],
        output_schema=ResearchResult,
    )

    validator = ValidationLoop(
        agent=agent, enable_metrics=True, enable_hallucination_check=True
    )

    query = "Research the history of neural networks"
    print(f"\nQuery: {query}")

    response = agent.run(query)
    result = response.content

    print(f"\nTopic: {result.topic}")
    print(f"Summary: {result.summary[:150]}...")
    print(f"Key Findings: {len(result.key_findings)} findings")
    print(f"Confidence: {result.confidence:.2%}")
    print(f"Sources: {len(result.sources)} sources")

    # The metrics are automatically collected by the ValidationLoop
    collector = get_metrics_collector()
    recent = collector.get_metrics(limit=1)[0]

    print(f"\nMetrics for this execution:")
    print(f"  Duration: {recent.performance.duration_ms:.2f}ms")
    print(f"  Validation Status: {recent.validation.status.value}")
    print(f"  Confidence: {recent.validation.confidence_score:.2%}")


def print_metrics_api_usage():
    """Print examples of how to use the metrics API."""
    print("\n" + "=" * 60)
    print("Metrics API Endpoints")
    print("=" * 60)

    examples = [
        {
            "endpoint": "GET /metrics/summary",
            "description": "Get aggregated metrics summary",
            "example": "curl http://localhost:7777/metrics/summary",
        },
        {
            "endpoint": "GET /metrics/executions",
            "description": "Get detailed execution history",
            "example": "curl http://localhost:7777/metrics/executions?limit=50",
        },
        {
            "endpoint": "GET /metrics/validation-insights",
            "description": "Get validation insights and hallucination patterns",
            "example": "curl http://localhost:7777/metrics/validation-insights",
        },
        {
            "endpoint": "GET /metrics/agent/{agent_name}",
            "description": "Get metrics for a specific agent",
            "example": "curl http://localhost:7777/metrics/agent/Research%20Assistant",
        },
        {
            "endpoint": "GET /metrics/performance/distribution",
            "description": "Get performance distribution and percentiles",
            "example": "curl http://localhost:7777/metrics/performance/distribution",
        },
    ]

    for ex in examples:
        print(f"\n{ex['endpoint']}")
        print(f"  {ex['description']}")
        print(f"  Example: {ex['example']}")


if __name__ == "__main__":
    print("\nRunning metrics examples...\n")

    # Run the async examples
    asyncio.run(example_with_metrics())
    asyncio.run(example_with_structured_validation())

    # Print API usage
    print_metrics_api_usage()

    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)
