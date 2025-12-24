---
title: Performance Metrics & Validation System
description: End-to-end implementation for tracking performance and detecting hallucinations
status: ✅ Complete
date: 2025-12-24
---

# Performance Metrics & Validation System

## 🎯 What This Provides

A comprehensive system for:
- **Performance Monitoring**: Track response times, latency, and throughput
- **Hallucination Detection**: Identify made-up vs truthful responses
- **Validation Tracking**: Monitor accuracy and confidence scores
- **Real-time Dashboard**: Visual metrics in the UI
- **API Access**: RESTful endpoints for metrics data

## ✨ Key Features

### Performance Metrics
- ⚡ Response time tracking (avg, p50, p95, p99)
- 📊 Distribution analysis
- 🎯 Per-agent statistics
- 📈 Historical trends

### Validation & Hallucination Detection
- 🔍 Automatic hallucination detection
- ✅ Truth vs made-up content identification
- 📋 Confidence scoring (0-100%)
- 🎨 Pattern recognition
- 🔗 Evidence and source tracking

### User Interface
- 📱 Real-time dashboard
- 🏷️ Validation badges per message
- ⚙️ Auto-refresh (5s interval)
- 🎨 Visual indicators
- 📊 Historical data views

## 🚀 Quick Start

### 1. View Metrics in UI

```bash
# Start backend
python -m uvicorn app.main:app --reload

# Start frontend (in another terminal)
cd agno-ui && npm run dev

# Open http://localhost:3000
# Click "Metrics" button in sidebar
```

### 2. Use in Code

```python
from agno.agent import Agent
from core.validation_loop import ValidationLoop

# Create agent - metrics automatically enabled
agent = Agent(name="MyAgent", model=OpenAIChat(id="gpt-4o-mini"))

# Run with automatic metrics collection
response = agent.run("Your query")
```

### 3. Access via API

```bash
# Get metrics summary
curl http://localhost:7777/metrics/summary

# Get execution history
curl http://localhost:7777/metrics/executions?limit=20

# Get validation insights
curl http://localhost:7777/metrics/validation-insights
```

## 📚 Documentation

- **Quick Start**: [METRICS_QUICKSTART.md](docs/METRICS_QUICKSTART.md)
- **Full Documentation**: [METRICS_AND_VALIDATION.md](docs/METRICS_AND_VALIDATION.md)
- **Implementation Summary**: [METRICS_IMPLEMENTATION_SUMMARY.md](METRICS_IMPLEMENTATION_SUMMARY.md)

## 💡 Examples

### Basic Usage

```python
from agno.agent import Agent
from core.metrics_collector import get_metrics_collector

agent = Agent(name="Assistant", model=OpenAIChat(id="gpt-4o-mini"))
response = agent.run("What is AI?")

# Get metrics
collector = get_metrics_collector()
stats = collector.get_aggregated_stats()
print(f"Avg latency: {stats['performance']['avg_duration_ms']}ms")
print(f"Truth rate: {stats['validation']['valid_percentage']}%")
```

### Hallucination Detection

```python
from core.hallucination_detector import get_hallucination_detector

detector = get_hallucination_detector()
validation = detector.check_response(
    response_text=response.content,
    context="What is AI?",
)

print(f"Status: {validation.status}")
print(f"Confidence: {validation.confidence_score:.2%}")
print(f"Indicators: {validation.hallucination_indicators}")
```

### Chat Integration

See [cookbook/02_examples/chat_with_metrics.py](cookbook/02_examples/chat_with_metrics.py) for a complete chat example with metrics.

## 🧪 Testing

Run the comprehensive test suite:

```bash
./scripts/test_metrics_system.sh
```

Tests include:
- ✅ API endpoint validation
- ✅ Component existence checks
- ✅ Module import tests
- ✅ Data integrity verification

## 📊 Metrics Dashboard

The dashboard provides:

### Overview Cards
- Total executions
- Average response time
- Truth rate
- Hallucination rate

### Performance Metrics
- Average duration
- Min/max latency
- P50, P95 percentiles
- Distribution buckets

### Validation Results
- Valid (truth) percentage
- Hallucination percentage
- Invalid percentage
- Average confidence

### Recent Executions
- Execution history
- Per-message metrics
- Validation status
- Hallucination indicators

### Hallucination Patterns
- Common patterns detected
- Frequency analysis
- Trend visualization

## 🔧 Configuration

### Environment Variables

```bash
# Enable features
ENABLE_METRICS=true
ENABLE_HALLUCINATION_CHECK=true
ENABLE_DEEP_FACT_CHECK=true

# Frontend settings
NEXT_PUBLIC_METRICS_REFRESH_INTERVAL=5000
```

### Per-Agent Settings

```python
validator = ValidationLoop(
    agent=agent,
    enable_metrics=True,
    enable_hallucination_check=True,
)
```

## 📡 API Endpoints

| Endpoint                            | Method | Description             |
| ----------------------------------- | ------ | ----------------------- |
| `/metrics/summary`                  | GET    | Aggregated statistics   |
| `/metrics/executions`               | GET    | Execution history       |
| `/metrics/validation-insights`      | GET    | Validation analysis     |
| `/metrics/agent/{name}`             | GET    | Agent metrics           |
| `/metrics/performance/distribution` | GET    | Performance percentiles |

## 🎨 UI Components

### MetricsDashboard
Full-featured dashboard with:
- Real-time updates
- Performance charts
- Validation overview
- Recent executions
- Pattern analysis

### ValidationBadge
Visual indicators showing:
- Validation status
- Confidence score
- Hallucination indicators
- Hover tooltips

### MetricsModal
Pop-up modal for:
- Quick metrics access
- Sidebar integration
- Responsive design

## 🔍 Hallucination Detection

### Quick Checks (Fast)
- Unsourced statistics
- Fake citations
- Contradictory statements
- Overly specific claims
- Missing hedging language

### Deep Checks (Thorough)
- LLM-based fact-checking
- Claim extraction
- Evidence verification
- Confidence assessment

### Validation Status
- **Valid**: Verified truth
- **Hallucination**: Made-up content detected
- **Invalid**: Validation errors
- **Partial**: Mixed results
- **Unverified**: Not checked

## 📈 Best Practices

1. **Enable for Production**
   - Always monitor metrics
   - Track trends over time
   - Set up alerts

2. **Use Validation Wisely**
   - Enable for user-facing responses
   - Check fact-based responses
   - Balance speed vs thoroughness

3. **Review Patterns**
   - Check common hallucination patterns
   - Update prompts accordingly
   - Fine-tune thresholds

4. **Monitor Performance**
   - Track P95 latency
   - Identify bottlenecks
   - Optimize based on data

## 🛠️ Troubleshooting

### Metrics Not Appearing?
1. Check backend is running
2. Verify API endpoint
3. Check browser console
4. Ensure agents are being used

### High Hallucination Rate?
1. Review common patterns
2. Adjust agent instructions
3. Add hedging language
4. Provide more context

### Performance Issues?
1. Check P95 latency
2. Disable deep checks if needed
3. Use faster models
4. Optimize prompts

## 📦 Files Created

### Backend
- `core/metrics_collector.py` - Metrics engine
- `core/hallucination_detector.py` - Detection system
- `app/api/metrics.py` - API endpoints

### Frontend
- `agno-ui/src/components/MetricsDashboard.tsx` - Dashboard
- `agno-ui/src/components/MetricsModal.tsx` - Modal
- `agno-ui/src/components/ValidationBadge.tsx` - Badges
- `agno-ui/src/hooks/useMetrics.ts` - React hooks

### Documentation
- `docs/METRICS_QUICKSTART.md` - Quick start
- `docs/METRICS_AND_VALIDATION.md` - Full docs
- `cookbook/02_examples/metrics_and_validation.py` - Examples
- `scripts/test_metrics_system.sh` - Tests

## 🎯 Use Cases

### Development
- Debug agent responses
- Optimize performance
- Track improvements

### Production
- Monitor system health
- Detect degradation
- Ensure accuracy

### Analysis
- Understand usage patterns
- Compare models
- Evaluate changes

## 🚀 Next Steps

1. ✅ Run test suite
2. ✅ Start backend and frontend
3. ✅ Explore metrics dashboard
4. ✅ Review examples
5. ✅ Integrate into your agents

## 🤝 Support

- **Examples**: See `cookbook/02_examples/`
- **Documentation**: See `docs/`
- **Tests**: Run `./scripts/test_metrics_system.sh`

---

**Status**: ✅ Complete and Ready for Use  
**Version**: 1.0.0  
**Last Updated**: December 24, 2025
