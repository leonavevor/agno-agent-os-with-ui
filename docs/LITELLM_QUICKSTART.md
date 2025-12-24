# LiteLLM Integration - Quick Start

## 🚀 5-Minute Setup

### 1. Install Dependencies

```bash
pip install litellm>=1.58.0
```

### 2. Set API Keys

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=...
```

### 3. Start Backend

```bash
cd /home/leonard/Downloads/agent-infra-docker
uvicorn app.main:app --reload --host 0.0.0.0 --port 7777
```

### 4. Start Frontend

```bash
cd agno-ui
pnpm dev
```

### 5. Use Model Selector

1. Open http://localhost:3001
2. Look for **Configuration** section in sidebar
3. Click **ModelSelector** dropdown
4. Choose your model!

---

## ✨ Features at a Glance

| Feature               | Description                                        |
| --------------------- | -------------------------------------------------- |
| **Multi-Provider**    | OpenAI, Anthropic, Google, Azure, DeepSeek, Ollama |
| **20+ Models**        | Pre-configured popular models                      |
| **Real-Time Switch**  | Change without restart                             |
| **Visual Indicators** | Icons for vision, reasoning, streaming             |
| **Context Windows**   | Show token limits                                  |
| **Provider Colors**   | Color-coded by provider                            |
| **Refresh**           | Reload catalog on demand                           |

---

## 🎯 Quick Test

### Test Backend API

```bash
# List models
curl http://localhost:7777/models/list | jq

# Get current
curl http://localhost:7777/models/current | jq

# Select model
curl -X POST http://localhost:7777/models/select \
  -H "Content-Type: application/json" \
  -d '{"model_id":"gpt-4o","provider":"openai"}' | jq
```

### Test Frontend

1. Open DevTools → Network tab
2. Click ModelSelector dropdown
3. Verify API call to `/models/list`
4. Select a model
5. Verify POST to `/models/select`
6. Check toast notification

---

## 📦 What's Included

### Backend Files
- `app/api/models.py` - Model management API (3 endpoints)
- `app/main.py` - Router integration
- `requirements.txt` - litellm dependency
- `pyproject.toml` - Package config

### Frontend Files
- `agno-ui/src/components/ModelSelector.tsx` - UI component
- `agno-ui/src/hooks/useModels.ts` - API integration hook
- `agno-ui/src/store.ts` - State management
- `agno-ui/src/types/os.ts` - TypeScript types

### Documentation
- `docs/LITELLM_INTEGRATION.md` - Complete guide (this file)

---

## 🔧 Configuration

### Add New Model

Edit `app/api/models.py`:

```python
"openai": [
    # ... existing models
    ModelInfo(
        id="gpt-5",
        name="GPT-5",
        provider="openai",
        description="Next generation model",
        context_window=200000,
        supports_streaming=True,
        supports_tools=True,
        supports_vision=True,
    ),
]
```

Restart backend → Refresh UI → Model appears!

---

## 📚 Full Documentation

See [LITELLM_INTEGRATION.md](./LITELLM_INTEGRATION.md) for:
- Complete API reference
- Architecture details
- Troubleshooting guide
- Advanced configuration
- Provider setup instructions

---

## 💡 Tips

### For Development
- Use Ollama for local testing (no API key needed)
- Set `LITELLM_LOG=DEBUG` for verbose logging
- Check Network tab for API errors

### For Production
- Use environment variables for API keys
- Enable rate limiting on `/models/select`
- Cache model list to reduce API calls
- Monitor usage by provider

---

## 🎨 UI Customization

### Change Provider Colors

In `ModelSelector.tsx`:

```typescript
const getProviderColor = (providerId: string) => {
  const colors: Record<string, string> = {
    openai: 'text-green-600',      // ← Change these
    anthropic: 'text-orange-600',
    google: 'text-blue-600',
  }
  return colors[providerId] || 'text-gray-600'
}
```

### Add Provider Icons

```typescript
const getModelIcon = (model: ModelInfo) => {
  if (model.is_reasoning) {
    return <Sparkles className="h-3.5 w-3.5 text-purple-500" />
  }
  // Add custom icons here
  return null
}
```

---

## ❓ Troubleshooting

| Problem                | Solution                                                     |
| ---------------------- | ------------------------------------------------------------ |
| "No models available"  | Check backend is running, verify `/models/list` endpoint     |
| Model selection fails  | Verify API key for provider in `.env`                        |
| Model not used in chat | Restart backend (limitation: agents not dynamically updated) |
| Styling broken         | Run `pnpm install` in agno-ui, rebuild                       |

---

## 🚧 Known Limitations

1. **Static Agent Models**: Changing model in UI doesn't update existing agent instances. Requires backend restart.
   - **Fix planned**: Dynamic agent reloading
   
2. **In-Memory State**: Current model stored in global variable, not database.
   - **Fix planned**: PostgreSQL persistence

3. **No Model Presets**: Can't save favorite configurations.
   - **Fix planned**: User preferences API

---

## 🎯 Next Steps

### After Setup
1. ✅ Test with OpenAI (easiest)
2. ✅ Add Anthropic key, test Claude
3. ✅ Try DeepSeek reasoning model
4. ✅ Set up Ollama for local models

### Contribute
- Add more models to registry
- Implement dynamic agent updates
- Add usage tracking
- Build model comparison tool

---

## 📞 Support

- **Documentation**: [LITELLM_INTEGRATION.md](./LITELLM_INTEGRATION.md)
- **Issues**: GitHub Issues
- **LiteLLM Docs**: https://docs.litellm.ai/

---

**Ready to go!** 🎉

Open the UI, click ModelSelector, and start switching between models!
