# Quick Start: Performance Metrics & Validation

## Overview

This guide will help you get started with the performance metrics and hallucination detection system in just a few minutes.

## 1. Enable Metrics (Already Done!)

The metrics system is integrated and ready to use. All components are in place:

- ✅ Backend metrics collection
- ✅ Hallucination detection
- ✅ API endpoints
- ✅ Frontend dashboard
- ✅ Real-time updates

## 2. Start the System

### Backend
```bash
# From project root
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7777
```

### Frontend
```bash
# In another terminal
cd agno-ui
npm install  # If first time
npm run dev
```

## 3. Access the Metrics Dashboard

1. Open your browser to `http://localhost:3000`
2. Click **"Metrics"** button in the sidebar
3. View real-time performance and validation metrics

## 4. Test the System

Run the automated test suite:

```bash
./scripts/test_metrics_system.sh
```

Or manually test the API:

```bash
# Get metrics summary
curl http://localhost:7777/metrics/summary

# Get execution history
curl http://localhost:7777/metrics/executions?limit=20

# Get validation insights
curl http://localhost:7777/metrics/validation-insights
```

## 5. Use in Your Code

### Automatic Metrics (Recommended)

Metrics are automatically collected when using agents:

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat

# Create agent - metrics automatically enabled
agent = Agent(
    name="MyAgent",
    model=OpenAIChat(id="gpt-4o-mini"),
    instructions=["Your instructions here"],
)

# Run agent - metrics collected automatically
response = agent.run("Your query")
```

### With Validation Loop

For advanced validation with hallucination detection:

```python
from core.validation_loop import ValidationLoop

validator = ValidationLoop(
    agent=agent,
    enable_metrics=True,
    enable_hallucination_check=True,
)

# Automatic validation and metrics
response = agent.run("Your query")
```

### Manual Hallucination Check

```python
from core.hallucination_detector import get_hallucination_detector

detector = get_hallucination_detector()
validation = detector.check_response(
    response_text=response.content,
    context="Original query",
)

print(f"Status: {validation.status}")
print(f"Confidence: {validation.confidence_score:.2%}")
print(f"Indicators: {validation.hallucination_indicators}")
```

## 6. View Metrics

### In the UI

- **Dashboard**: Click "Metrics" in sidebar
- **Per-message**: Validation badges appear on messages
- **Auto-refresh**: Updates every 5 seconds

### Via API

```bash
# Summary statistics
curl http://localhost:7777/metrics/summary | jq

# Recent executions with filtering
curl "http://localhost:7777/metrics/executions?status_filter=hallucination" | jq

# Agent-specific metrics
curl http://localhost:7777/metrics/agent/MyAgent | jq

# Performance distribution
curl http://localhost:7777/metrics/performance/distribution | jq
```

## Key Metrics Explained

### Performance Metrics

- **Avg Duration**: Average response time in milliseconds
- **P95 Duration**: 95th percentile (slowest 5% of requests)
- **Total Executions**: Number of agent runs

### Validation Metrics

- **Valid (Truth)**: Responses verified as factually accurate
- **Hallucination**: Responses with detected made-up content
- **Invalid**: Responses failing validation
- **Confidence Score**: 0-100% confidence in response accuracy

### Hallucination Indicators

Common patterns detected:
- Unsourced statistics
- Fake citations
- Contradictory statements
- Overly specific claims without evidence
- Missing hedging language

## Configuration

### Environment Variables

```bash
# .env file
ENABLE_METRICS=true
ENABLE_HALLUCINATION_CHECK=true
ENABLE_DEEP_FACT_CHECK=true
```

### Per-Agent Configuration

```python
# Disable metrics for specific agent
validator = ValidationLoop(
    agent=agent,
    enable_metrics=False,
    enable_hallucination_check=False,
)
```

## Troubleshooting

### Metrics not appearing?

1. Check backend is running: `curl http://localhost:7777/system/health`
2. Verify endpoint in UI sidebar
3. Check browser console for errors
4. Ensure agents are being run through the system

### High hallucination rate?

1. Review common patterns in dashboard
2. Adjust agent instructions to be more factual
3. Add hedging language ("may", "likely", "approximately")
4. Provide more context and sources

### Slow performance?

1. Check P95 latency in dashboard
2. Disable deep fact-checking for non-critical paths
3. Use faster models for validation
4. Optimize agent instructions

## Next Steps

1. ✅ Explore the example: `cookbook/02_examples/metrics_and_validation.py`
2. ✅ Read full docs: `docs/METRICS_AND_VALIDATION.md`
3. ✅ Customize hallucination patterns for your domain
4. ✅ Set up alerts for hallucination spikes
5. ✅ Monitor trends over time

## Support

- **Documentation**: See `docs/METRICS_AND_VALIDATION.md`
- **Examples**: Check `cookbook/02_examples/metrics_and_validation.py`
- **Issues**: Review validation indicators in the dashboard

## Features at a Glance

| Feature                 | Status      | Location                  |
| ----------------------- | ----------- | ------------------------- |
| Performance tracking    | ✅ Enabled   | Backend + Frontend        |
| Hallucination detection | ✅ Enabled   | Backend + Frontend        |
| Real-time dashboard     | ✅ Available | Frontend (Metrics button) |
| API endpoints           | ✅ Available | `/metrics/*`              |
| Validation badges       | ✅ Available | Per-message display       |
| Auto-refresh            | ✅ Enabled   | 5-second interval         |
| Historical data         | ✅ Available | Recent executions         |
| Agent-specific stats    | ✅ Available | `/metrics/agent/{name}`   |

---

**You're all set!** Start using the system and monitor your agents' performance and accuracy in real-time.
