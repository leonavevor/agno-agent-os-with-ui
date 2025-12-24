# Performance Metrics & Validation System

## Overview

This system provides end-to-end performance monitoring and validation tracking to detect hallucinations and measure truth vs made-up answers in AI agent responses.

## Architecture

### Backend Components

1. **MetricsCollector** (`core/metrics_collector.py`)
   - Tracks performance metrics (latency, throughput, token usage)
   - Collects validation results
   - Provides aggregated statistics
   - Stores execution history

2. **HallucinationDetector** (`core/hallucination_detector.py`)
   - Detects potential hallucinations in responses
   - Performs fact-checking using validation agents
   - Identifies common hallucination patterns
   - Assigns confidence scores

3. **ValidationLoop** (`core/validation_loop.py`)
   - Enhanced with metrics collection
   - Integrates hallucination detection
   - Tracks validation attempts and retries
   - Self-healing validation with metrics

4. **Metrics API** (`app/api/metrics.py`)
   - RESTful endpoints for metrics access
   - Real-time statistics
   - Historical data queries
   - Performance distribution analysis

### Frontend Components

1. **MetricsDashboard** (`agno-ui/src/components/MetricsDashboard.tsx`)
   - Comprehensive metrics visualization
   - Performance overview
   - Validation results display
   - Hallucination pattern analysis
   - Recent execution history

2. **MetricsModal** (`agno-ui/src/components/MetricsModal.tsx`)
   - Pop-up metrics viewer
   - Integrated into sidebar

3. **ValidationBadge** (`agno-ui/src/components/ValidationBadge.tsx`)
   - Visual indicators for validation status
   - Confidence score display
   - Hallucination warnings
   - Performance badges

4. **useMetrics Hook** (`agno-ui/src/hooks/useMetrics.ts`)
   - React hook for metrics data
   - Auto-refresh capability
   - Performance tracking utilities

## Features

### Performance Metrics

- **Response Time Tracking**
  - Average duration
  - Min/max latency
  - P50, P95, P99 percentiles
  - Distribution buckets

- **Throughput Monitoring**
  - Total executions
  - Requests per time period
  - Agent-specific metrics

- **Resource Usage**
  - Token count tracking
  - Model utilization
  - Skill usage patterns

### Validation & Hallucination Detection

- **Automatic Hallucination Detection**
  - Unsourced statistics
  - Fake citations
  - Contradictory statements
  - Overly specific claims
  - Lack of hedging language

- **Confidence Scoring**
  - 0.0-1.0 confidence range
  - Based on multiple factors
  - Tracks over time

- **Validation Status**
  - Valid (truth verified)
  - Hallucination (made-up content detected)
  - Invalid (schema/format errors)
  - Partial (mixed results)
  - Unverified (not yet checked)

- **Evidence Tracking**
  - Factual claims extraction
  - Source references
  - Verification evidence
  - Reasoning steps

## Usage

### Backend Usage

```python
from core.validation_loop import ValidationLoop
from core.metrics_collector import get_metrics_collector
from core.hallucination_detector import get_hallucination_detector
from agno.agent import Agent

# Create agent with validation and metrics
agent = Agent(name="MyAgent", model=OpenAIChat(id="gpt-4o-mini"))

validator = ValidationLoop(
    agent=agent,
    enable_metrics=True,
    enable_hallucination_check=True,
)

# Run with automatic metrics collection
response = agent.run("Your query here")

# Check for hallucinations manually
detector = get_hallucination_detector()
validation = detector.check_response(response.content, context="query")

print(f"Status: {validation.status}")
print(f"Confidence: {validation.confidence_score:.2%}")
print(f"Indicators: {validation.hallucination_indicators}")

# Get aggregated metrics
collector = get_metrics_collector()
stats = collector.get_aggregated_stats()
print(f"Total executions: {stats['total_executions']}")
print(f"Avg latency: {stats['performance']['avg_duration_ms']:.2f}ms")
print(f"Truth rate: {stats['validation']['valid_percentage']:.1f}%")
```

### API Endpoints

#### Get Metrics Summary
```bash
curl http://localhost:7777/metrics/summary
```

Response:
```json
{
  "total_executions": 150,
  "performance": {
    "avg_duration_ms": 1234.5,
    "p95_duration_ms": 2500.0
  },
  "validation": {
    "valid_percentage": 85.5,
    "hallucination_percentage": 8.2,
    "avg_confidence_score": 0.87
  }
}
```

#### Get Execution History
```bash
curl "http://localhost:7777/metrics/executions?limit=20&status_filter=hallucination"
```

#### Get Validation Insights
```bash
curl http://localhost:7777/metrics/validation-insights
```

Response includes:
- Status distribution
- Common hallucination patterns
- Validation trends
- Confidence scores

### Frontend Integration

#### Add to Chat Messages

```tsx
import { ValidationBadge, PerformanceBadge } from '@/components/ValidationBadge'

<div className="message">
  {message.content}
  <div className="metrics-badges">
    <ValidationBadge
      status={message.validation_status}
      confidence={message.confidence_score}
      indicators={message.hallucination_indicators}
    />
    <PerformanceBadge durationMs={message.duration_ms} />
  </div>
</div>
```

#### Access Metrics Dashboard

The metrics dashboard is accessible via:
1. Sidebar button labeled "Metrics"
2. Opens modal with comprehensive metrics
3. Auto-refreshes every 5 seconds (configurable)

## Configuration

### Environment Variables

```bash
# Enable metrics collection (default: true)
ENABLE_METRICS=true

# Enable hallucination detection (default: true)
ENABLE_HALLUCINATION_CHECK=true

# Enable deep fact-checking with LLM (default: true)
ENABLE_DEEP_FACT_CHECK=true

# Metrics refresh interval in frontend (ms)
NEXT_PUBLIC_METRICS_REFRESH_INTERVAL=5000
```

### Per-Agent Configuration

Enable/disable metrics per agent:

```python
from core.validation_loop import ValidationLoop

# Disable metrics for specific agent
validator = ValidationLoop(
    agent=agent,
    enable_metrics=False,  # Disable metrics
    enable_hallucination_check=True,
)
```

### Skill-Level Configuration

Configure in `core/skills_config.yaml`:

```yaml
skills:
  research_skill:
    validation:
      enabled: true
      enable_hallucination_check: true
    metrics:
      enabled: true
      track_performance: true
```

## Hallucination Detection Details

### Quick Heuristic Checks (Fast)

- Unsourced statistics (e.g., "87% of users...")
- Multiple specific dates without context
- Overly precise numbers without qualification
- Academic citation patterns (need verification)
- Contradictory absolute statements
- Missing hedging language
- URLs that need verification

### Deep Fact-Checking (Thorough)

Uses a dedicated fact-checking agent to:
- Extract factual claims
- Verify each claim
- Assess confidence per claim
- Identify evidence
- Detect contradictions
- Evaluate overall truthfulness

### Validation Scoring

**Confidence Score (0.0 - 1.0):**
- 0.8+ = High confidence (Valid)
- 0.5-0.8 = Moderate confidence (Partial)
- 0.0-0.5 = Low confidence (Invalid/Hallucination)

## Best Practices

1. **Enable Metrics for Production**
   - Always enable metrics in production
   - Monitor trends over time
   - Set up alerts for hallucination spikes

2. **Use Validation in Critical Paths**
   - Enable hallucination detection for user-facing responses
   - Validate responses that will be acted upon
   - Check responses involving facts/data

3. **Review Common Patterns**
   - Regularly check common hallucination patterns
   - Update prompts to reduce false positives
   - Fine-tune confidence thresholds

4. **Monitor Performance**
   - Track P95 latency trends
   - Identify slow agents/skills
   - Optimize based on metrics

5. **Balance Speed vs Thoroughness**
   - Use quick checks for low-stakes responses
   - Enable deep checking for critical responses
   - Configure per skill/agent

## Troubleshooting

### High False Positive Rate

If seeing too many false hallucination detections:
1. Adjust confidence threshold
2. Review heuristic patterns
3. Fine-tune fact-checking agent instructions
4. Add domain-specific context

### Performance Impact

If metrics collection affects performance:
1. Disable deep fact-checking for non-critical paths
2. Sample subset of requests (e.g., 10%)
3. Use async metrics collection
4. Increase batch sizes

### Missing Metrics

If metrics aren't appearing:
1. Check `ENABLE_METRICS` is true
2. Verify ValidationLoop is used
3. Check API endpoints are accessible
4. Review frontend API URL configuration

## Examples

See `cookbook/02_examples/metrics_and_validation.py` for comprehensive examples including:
- Basic metrics collection
- Hallucination detection
- Structured validation with metrics
- API usage examples

## Future Enhancements

- [ ] Persistent metrics storage (PostgreSQL/TimescaleDB)
- [ ] Advanced visualization (charts, graphs)
- [ ] Real-time WebSocket updates
- [ ] Metrics export (Prometheus, Grafana)
- [ ] Custom hallucination patterns
- [ ] A/B testing support
- [ ] Automated alerts and notifications
- [ ] LangSmith/LangFuse integration
