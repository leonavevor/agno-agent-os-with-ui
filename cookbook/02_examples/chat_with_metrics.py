"""
Real-world chat integration example with metrics and validation.

This example shows how metrics and validation work in a chat scenario,
similar to the AgentOS chat interface.
"""

import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any

from agno.agent import Agent
from agno.models.openai import OpenAIChat

from core.metrics_collector import get_metrics_collector, ExecutionMetrics
from core.hallucination_detector import get_hallucination_detector


class ChatMessage:
    """Represents a chat message with metrics."""

    def __init__(
        self,
        role: str,
        content: str,
        timestamp: datetime = None,
        execution_id: str = None,
    ):
        self.role = role
        self.content = content
        self.timestamp = timestamp or datetime.utcnow()
        self.execution_id = execution_id or str(uuid.uuid4())
        self.metrics: ExecutionMetrics | None = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "execution_id": self.execution_id,
        }

        if self.metrics:
            result["metrics"] = self.metrics.to_dict()

        return result


class MetricsEnabledChat:
    """
    Chat system with integrated performance metrics and validation.

    Features:
    - Automatic metrics collection per message
    - Hallucination detection on agent responses
    - Performance tracking
    - Message history with metrics
    """

    def __init__(self, agent: Agent):
        self.agent = agent
        self.messages: List[ChatMessage] = []
        self.metrics_collector = get_metrics_collector()
        self.hallucination_detector = get_hallucination_detector()

    async def send_message(self, user_input: str) -> ChatMessage:
        """
        Send a user message and get agent response with metrics.

        Args:
            user_input: User's message

        Returns:
            Agent's response message with metrics attached
        """
        # Add user message
        user_msg = ChatMessage(role="user", content=user_input)
        self.messages.append(user_msg)

        # Create execution metrics tracker
        execution_id = str(uuid.uuid4())
        metrics = self.metrics_collector.create_execution(
            execution_id=execution_id,
            agent_name=self.agent.name,
            model_name=(
                str(self.agent.model.id)
                if hasattr(self.agent.model, "id")
                else "unknown"
            ),
        )
        metrics.input_text = user_input
        metrics.performance.start_time = datetime.utcnow().timestamp()

        try:
            # Get agent response
            response = self.agent.run(user_input)

            # Record performance metrics
            metrics.performance.end()
            metrics.output_text = response.content

            # Check for hallucinations
            validation_result = self.hallucination_detector.check_response(
                response_text=response.content,
                context=user_input,
            )
            metrics.validation = validation_result

            # Create response message
            agent_msg = ChatMessage(
                role="assistant",
                content=response.content,
                execution_id=execution_id,
            )
            agent_msg.metrics = metrics

            self.messages.append(agent_msg)

            return agent_msg

        except Exception as e:
            metrics.performance.end()
            metrics.error = str(e)
            raise

    def get_conversation_stats(self) -> Dict[str, Any]:
        """Get statistics for the current conversation."""
        agent_messages = [m for m in self.messages if m.role == "assistant"]

        if not agent_messages:
            return {
                "total_messages": 0,
                "avg_duration_ms": 0,
                "validation_summary": {},
            }

        durations = [
            m.metrics.performance.duration_ms
            for m in agent_messages
            if m.metrics and m.metrics.performance.duration_ms
        ]

        validation_statuses = [
            m.metrics.validation.status.value for m in agent_messages if m.metrics
        ]

        from collections import Counter

        status_counts = Counter(validation_statuses)

        return {
            "total_messages": len(agent_messages),
            "avg_duration_ms": sum(durations) / len(durations) if durations else 0,
            "min_duration_ms": min(durations) if durations else 0,
            "max_duration_ms": max(durations) if durations else 0,
            "validation_summary": dict(status_counts),
            "avg_confidence": (
                sum(
                    m.metrics.validation.confidence_score
                    for m in agent_messages
                    if m.metrics
                )
                / len(agent_messages)
                if agent_messages
                else 0
            ),
        }

    def export_conversation(self) -> List[Dict[str, Any]]:
        """Export conversation with metrics for analysis."""
        return [msg.to_dict() for msg in self.messages]


async def demo_chat_with_metrics():
    """Demonstrate chat with metrics collection."""
    print("=" * 70)
    print("Chat System with Performance Metrics & Validation")
    print("=" * 70)

    # Create agent
    agent = Agent(
        name="Assistant",
        model=OpenAIChat(id="gpt-4o-mini"),
        instructions=[
            "You are a helpful assistant.",
            "Provide accurate, well-sourced information.",
            "Use hedging language when uncertain.",
            "Be concise but thorough.",
        ],
    )

    # Create chat with metrics
    chat = MetricsEnabledChat(agent)

    # Simulate conversation
    queries = [
        "What is machine learning?",
        "How many people attended the 2024 AI Summit in Tokyo?",  # Potentially problematic
        "What are the main types of neural networks?",
    ]

    for i, query in enumerate(queries, 1):
        print(f"\n{'=' * 70}")
        print(f"Message {i}/{len(queries)}")
        print(f"{'=' * 70}")
        print(f"\n👤 User: {query}")

        # Send message
        response = await chat.send_message(query)

        print(f"\n🤖 Assistant: {response.content[:200]}...")

        # Show metrics
        if response.metrics:
            print(f"\n📊 Metrics:")
            print(f"   Duration: {response.metrics.performance.duration_ms:.2f}ms")
            print(
                f"   Validation: {response.metrics.validation.status.value} "
                f"({response.metrics.validation.confidence_score:.1%} confidence)"
            )

            if response.metrics.validation.hallucination_indicators:
                print(f"\n   ⚠️  Hallucination Indicators:")
                for indicator in response.metrics.validation.hallucination_indicators[
                    :3
                ]:
                    print(f"      - {indicator}")

    # Show conversation statistics
    print(f"\n{'=' * 70}")
    print("Conversation Statistics")
    print(f"{'=' * 70}")

    stats = chat.get_conversation_stats()
    print(f"\nTotal Messages: {stats['total_messages']}")
    print(f"Avg Response Time: {stats['avg_duration_ms']:.2f}ms")
    print(f"Fastest Response: {stats['min_duration_ms']:.2f}ms")
    print(f"Slowest Response: {stats['max_duration_ms']:.2f}ms")
    print(f"Avg Confidence: {stats['avg_confidence']:.1%}")

    print(f"\nValidation Summary:")
    for status, count in stats["validation_summary"].items():
        print(f"   {status}: {count}")

    # Export conversation
    print(f"\n{'=' * 70}")
    print("Exporting conversation with metrics...")
    print(f"{'=' * 70}")

    export = chat.export_conversation()
    print(f"\nExported {len(export)} messages with complete metrics")

    # Show global metrics
    print(f"\n{'=' * 70}")
    print("Global System Metrics")
    print(f"{'=' * 70}")

    collector = get_metrics_collector()
    global_stats = collector.get_aggregated_stats()

    print(f"\nTotal System Executions: {global_stats['total_executions']}")
    print(f"\nSystem Performance:")
    print(f"   Avg Duration: {global_stats['performance']['avg_duration_ms']:.2f}ms")
    print(f"   P95 Duration: {global_stats['performance']['p95_duration_ms']:.2f}ms")

    print(f"\nSystem Validation:")
    print(f"   Valid: {global_stats['validation']['valid_percentage']:.1f}%")
    print(
        f"   Hallucination: {global_stats['validation']['hallucination_percentage']:.1f}%"
    )
    print(
        f"   Avg Confidence: {global_stats['validation']['avg_confidence_score']:.1%}"
    )


async def demo_api_integration():
    """Show how metrics integrate with the API."""
    print("\n" + "=" * 70)
    print("API Integration Example")
    print("=" * 70)

    print(
        """
The metrics system provides REST API endpoints for the frontend:

1. Metrics Summary
   GET /metrics/summary
   Returns: Aggregated statistics for dashboard

2. Execution History
   GET /metrics/executions?limit=20&status_filter=hallucination
   Returns: Filtered list of executions with metrics

3. Validation Insights
   GET /metrics/validation-insights
   Returns: Detailed validation analysis and patterns

4. Agent Metrics
   GET /metrics/agent/Assistant
   Returns: Agent-specific performance and validation stats

5. Performance Distribution
   GET /metrics/performance/distribution
   Returns: Percentiles and latency buckets

Frontend Integration:
- MetricsDashboard displays real-time metrics
- ValidationBadge shows per-message validation status
- Auto-refresh every 5 seconds
- Tooltips with detailed information

Example Frontend Usage:
```typescript
import { useMetrics } from '@/hooks/useMetrics'
import { MetricsDashboard } from '@/components/MetricsDashboard'

function MyComponent() {
  const { summary, loading } = useMetrics({
    apiUrl: 'http://localhost:7777',
    autoRefresh: true,
  })

  return <MetricsDashboard apiUrl="http://localhost:7777" />
}
```
    """
    )


if __name__ == "__main__":
    print("\n🚀 Starting Chat with Metrics Demo...\n")

    # Run the demos
    asyncio.run(demo_chat_with_metrics())
    asyncio.run(demo_api_integration())

    print("\n" + "=" * 70)
    print("✅ Demo Complete!")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Start the backend: python -m uvicorn app.main:app --reload")
    print("2. Start the frontend: cd agno-ui && npm run dev")
    print("3. Open http://localhost:3000 and click 'Metrics' in sidebar")
    print("4. Run this demo: python cookbook/02_examples/chat_with_metrics.py")
    print("=" * 70 + "\n")
