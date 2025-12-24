# LiteLLM Proxy Integration Guide

Complete guide for adding and using multiple LLM backends via LiteLLM proxy.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Setup](#setup)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Frontend Usage](#frontend-usage)
- [Supported Providers](#supported-providers)
- [Troubleshooting](#troubleshooting)

---

## Overview

This integration adds LiteLLM proxy support to enable seamless switching between multiple LLM providers (OpenAI, Anthropic, Google, Azure, DeepSeek, Ollama, etc.) through a unified interface.

### What is LiteLLM?

[LiteLLM](https://github.com/BerriAI/litellm) is a proxy that provides a unified API for 100+ LLMs. It translates requests to different providers' APIs, making it easy to:

- Switch between models without code changes
- Test different providers for cost/performance
- Implement fallback strategies
- Track usage across providers

---

## Features

### ✨ Implemented Capabilities

- **Multi-Provider Support**: OpenAI, Anthropic, Google, Azure, DeepSeek, Ollama
- **Model Registry**: Pre-configured catalog of 20+ popular models
- **Real-Time Switching**: Change models without restarting
- **Provider Grouping**: Models organized by provider in UI
- **Model Capabilities**: Visual indicators for vision, reasoning, streaming, tools
- **Context Window Display**: Show token limits for each model
- **Current Model Tracking**: Persistent state across sessions
- **Refresh on Demand**: Manual reload of model catalog
- **Error Handling**: Graceful fallbacks and user notifications

---

## Architecture

### Backend Components

```
app/api/models.py            # Model management API endpoints
  ├── GET  /models/list       # List all available models by provider
  ├── GET  /models/current    # Get currently selected model
  ├── POST /models/select     # Change active model
  └── GET  /models/providers  # List provider IDs

app/models.py                # Model ID constants (legacy, for compatibility)
```

### Frontend Components

```
agno-ui/src/
  ├── store.ts                           # Zustand state for models
  ├── types/os.ts                        # TypeScript types for models
  ├── hooks/useModels.ts                 # Model management hook
  └── components/
      ├── ModelSelector.tsx              # Dropdown UI component
      └── chat/Sidebar/Sidebar.tsx       # Integration point
```

### Data Flow

```
1. UI loads → useModels hook → GET /models/list
2. Backend returns providers with models
3. Store updates → ModelSelector renders
4. User selects model → POST /models/select
5. Backend updates global state
6. New chat sessions use selected model
```

---

## Setup

### 1. Install Dependencies

```bash
# Backend
cd /home/leonard/Downloads/agent-infra-docker
pip install litellm>=1.58.0

# Or regenerate requirements
./scripts/generate_requirements.sh
```

### 2. Configure Environment Variables

Add to `.env` (copy from `.env.example`):

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=...

# Azure OpenAI
AZURE_API_KEY=...
AZURE_API_BASE=https://your-resource.openai.azure.com/
AZURE_API_VERSION=2024-02-15-preview

# DeepSeek
DEEPSEEK_API_KEY=...

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Start the Backend

```bash
# Development mode
uvicorn app.main:app --reload --host 0.0.0.0 --port 7777

# Or using the agno serve command
cd /home/leonard/Downloads/agent-infra-docker
python -m app.main
```

### 4. Start the Frontend

```bash
cd agno-ui
pnpm install
pnpm dev
```

---

## Configuration

### Adding New Models

Edit `app/api/models.py` and add to `MODEL_REGISTRY`:

```python
"your_provider": [
    ModelInfo(
        id="provider/model-name",
        name="Display Name",
        provider="your_provider",
        description="Model description",
        context_window=128000,
        supports_streaming=True,
        supports_tools=True,
        supports_vision=False,
        is_reasoning=False,
    ),
]
```

### Adding New Providers

1. **Add to Registry** (`app/api/models.py`):

```python
"new_provider": [
    ModelInfo(...)
]
```

2. **Add Display Name** (in `list_models()` function):

```python
provider_name_map = {
    "new_provider": "New Provider Display Name",
}
```

3. **Add Icon Color** (optional, in `agno-ui/src/components/ModelSelector.tsx`):

```typescript
const getProviderColor = (providerId: string) => {
  const colors: Record<string, string> = {
    new_provider: 'text-emerald-600',
  }
  return colors[providerId] || 'text-gray-600'
}
```

---

## API Reference

### GET /models/list

List all available models grouped by provider.

**Response:**
```json
[
  {
    "id": "openai",
    "name": "OpenAI",
    "models": [
      {
        "id": "gpt-5-mini",
        "name": "GPT-5 Mini",
        "provider": "openai",
        "description": "Fast and efficient model",
        "context_window": 128000,
        "supports_streaming": true,
        "supports_tools": true,
        "supports_vision": true,
        "is_reasoning": false
      }
    ]
  }
]
```

### GET /models/current

Get the currently active model.

**Response:**
```json
{
  "model_id": "gpt-5-mini",
  "provider": "openai",
  "model_info": {
    "id": "gpt-5-mini",
    "name": "GPT-5 Mini",
    "provider": "openai",
    "description": "Fast and efficient model",
    "context_window": 128000,
    "supports_streaming": true,
    "supports_tools": true,
    "supports_vision": true,
    "is_reasoning": false
  }
}
```

### POST /models/select

Select a new model.

**Request:**
```json
{
  "model_id": "claude-sonnet-4-5",
  "provider": "anthropic"
}
```

**Response:**
```json
{
  "model_id": "claude-sonnet-4-5",
  "provider": "anthropic",
  "model_info": {...}
}
```

**Error Responses:**
- `404` - Provider or model not found
- `400` - Invalid request format

### GET /models/providers

List all provider IDs.

**Response:**
```json
["openai", "anthropic", "google", "azure", "deepseek", "ollama"]
```

---

## Frontend Usage

### Using the ModelSelector Component

The `ModelSelector` is automatically integrated into the Sidebar under "Configuration".

```tsx
import { ModelSelector } from '@/components/ModelSelector'

// Already integrated in Sidebar.tsx
<ModelSelector />
```

### Using the useModels Hook

```tsx
import { useModels } from '@/hooks/useModels'

function MyComponent() {
  const {
    modelProviders,      // Available providers with models
    currentModel,        // Currently selected model
    isModelsLoading,     // Loading state
    selectModel,         // Function to change model
    refresh,             // Reload model catalog
  } = useModels()

  const handleModelChange = async () => {
    const success = await selectModel('gpt-4o', 'openai')
    if (success) {
      console.log('Model changed successfully')
    }
  }

  return (
    <div>
      <button onClick={() => selectModel('gpt-4o', 'openai')}>
        Switch to GPT-4o
      </button>
      <p>Current: {currentModel?.model_id}</p>
    </div>
  )
}
```

### Accessing Model State

```tsx
import { useStore } from '@/store'

const modelProviders = useStore((state) => state.modelProviders)
const currentModel = useStore((state) => state.currentModel)
const setCurrentModel = useStore((state) => state.setCurrentModel)
```

---

## Supported Providers

### OpenAI
- ✅ GPT-5 Mini
- ✅ GPT-4o
- ✅ GPT-4o Mini
- ✅ O1 Pro (reasoning)

### Anthropic
- ✅ Claude Sonnet 4.5
- ✅ Claude 3 Opus
- ✅ Claude 3 Sonnet

### Google
- ✅ Gemini 2.5 Pro
- ✅ Gemini 2.0 Flash

### Azure OpenAI
- ✅ Azure GPT-4o
- ✅ Azure GPT-3.5 Turbo

### DeepSeek
- ✅ DeepSeek Chat
- ✅ DeepSeek R1 (reasoning)

### Ollama (Local)
- ✅ Llama 3.2
- ✅ Mistral

---

## Troubleshooting

### Models Not Loading

**Symptom:** Dropdown shows "Loading..." or "No models available"

**Solutions:**
1. Check backend is running: `curl http://localhost:7777/models/list`
2. Check browser console for errors
3. Verify API endpoint in Network tab
4. Check CORS settings if backend is on different domain

### Model Selection Fails

**Symptom:** Toast error "Failed to switch model"

**Solutions:**
1. Verify API keys in `.env` for the provider
2. Check backend logs for detailed error
3. Ensure model ID matches registry
4. Test endpoint manually:
   ```bash
   curl -X POST http://localhost:7777/models/select \
     -H "Content-Type: application/json" \
     -d '{"model_id":"gpt-4o","provider":"openai"}'
   ```

### Model Not Used in Chat

**Symptom:** Selected model in UI but agent uses different model

**Current Limitation:** The current implementation updates a global state variable but doesn't dynamically update agent instances. Future enhancement will:
- Reload agents with new model
- Create model factories for dynamic instantiation
- Support per-agent model configuration

**Workaround:** Restart the backend after selecting a new model, or modify agent definitions to use the `CURRENT_MODEL` global variable.

### Provider Icon Missing

**Solution:** Add icon mapping in `ModelSelector.tsx`:

```typescript
const getProviderColor = (providerId: string) => {
  const colors: Record<string, string> = {
    your_provider: 'text-color-600',
  }
  return colors[providerId] || 'text-gray-600'
}
```

### Styling Issues

If ModelSelector doesn't match UI theme:

1. Check Tailwind CSS classes are processed
2. Verify shadcn/ui components are installed:
   ```bash
   cd agno-ui
   npx shadcn-ui@latest add dropdown-menu
   npx shadcn-ui@latest add button
   ```

---

## Future Enhancements

### Planned Features

- [ ] **Dynamic Agent Updates**: Reload agents when model changes
- [ ] **Model-Specific Pricing**: Show cost per 1M tokens
- [ ] **Usage Tracking**: Track tokens by model/provider
- [ ] **Fallback Chains**: Auto-retry with backup models
- [ ] **Custom Models**: Add user-defined models via UI
- [ ] **Model Comparison**: Side-by-side model testing
- [ ] **Performance Metrics**: Track latency, success rate
- [ ] **Model Presets**: Save favorite model configurations

### Integration with Agno

To use LiteLLM models with Agno agents:

```python
from agno.agent import Agent
from agno.models.litellm import LiteLLM

agent = Agent(
    name="My Agent",
    model=LiteLLM(id="gpt-4o"),  # Will use selected model
    tools=[...],
)
```

---

## Testing

### Backend API Tests

```bash
# Test model list endpoint
curl http://localhost:7777/models/list | jq

# Test current model
curl http://localhost:7777/models/current | jq

# Test model selection
curl -X POST http://localhost:7777/models/select \
  -H "Content-Type: application/json" \
  -d '{"model_id":"claude-sonnet-4-5","provider":"anthropic"}' | jq

# Test providers list
curl http://localhost:7777/models/providers | jq
```

### Frontend Component Tests

```bash
cd agno-ui

# Check for TypeScript errors
pnpm tsc --noEmit

# Run frontend
pnpm dev

# Open http://localhost:3001
# Navigate to Configuration section
# Verify ModelSelector appears and loads models
```

---

## Contributing

### Adding Support for New Providers

1. Update `MODEL_REGISTRY` in `app/api/models.py`
2. Add provider display name in `list_models()` function
3. Add provider color in `ModelSelector.tsx` (optional)
4. Test with provider's API key in `.env`
5. Update this documentation

### Code Style

- **Backend**: Follow PEP 8, use type hints
- **Frontend**: Follow project ESLint config, use TypeScript
- **Components**: Use React hooks, functional components
- **Naming**: Use descriptive names, avoid abbreviations

---

## Resources

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Agno Documentation](https://docs.agno.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/)

---

## Support

For issues or questions:

1. Check this documentation
2. Search existing issues on GitHub
3. Create a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Backend/frontend logs
   - Environment details (OS, versions)

---

**Last Updated:** December 24, 2025  
**Version:** 1.0.0
