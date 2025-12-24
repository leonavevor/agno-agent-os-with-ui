# Provider Configuration Guide

This guide explains how to configure individual LLM providers with custom API keys and base URLs.

## Overview

Each LLM provider (OpenAI, Anthropic, Google, Azure, DeepSeek, Ollama) can now have its own configuration:
- **API Key**: Provider-specific authentication token
- **Base URL**: Custom endpoint URL (useful for proxies, regional endpoints, or self-hosted)
- **Enabled**: Toggle to enable/disable the provider

## Configuration Methods

### 1. Environment Variables (Recommended for Production)

Set environment variables in your `.env` file or docker-compose.yaml:

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com

# Google
GOOGLE_API_KEY=AIza...
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com

# Azure OpenAI
AZURE_API_KEY=...
AZURE_API_BASE=https://your-resource.openai.azure.com

# DeepSeek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434
```

### 2. UI Settings Modal (Runtime Configuration)

Use the **Settings** button in the Model Selector UI:

1. Click the **gear icon** (⚙️) next to the refresh button in the Model Selector
2. Configure each provider:
   - Enter or update the API key
   - Modify the base URL if needed (e.g., for proxies)
   - Enable/disable the provider
3. Click **Save** for each provider you modify
4. Changes take effect immediately for new conversations

**Note**: Settings configured via the UI are stored in memory and will reset when the backend restarts. Use environment variables for permanent configuration.

## Provider-Specific Notes

### OpenAI
- **Default Base URL**: `https://api.openai.com/v1`
- **Custom Use Cases**:
  - Azure OpenAI Service: Use Azure's endpoint
  - OpenAI-compatible proxies: Point to your proxy URL
  - Regional endpoints: Use region-specific URLs

### Anthropic
- **Default Base URL**: `https://api.anthropic.com`
- **Custom Use Cases**:
  - Anthropic Vertex AI: Use Google Cloud endpoint
  - Self-hosted Claude proxies

### Google (Gemini)
- **Default Base URL**: `https://generativelanguage.googleapis.com`
- **Custom Use Cases**:
  - Vertex AI: Use Vertex-specific endpoints
  - Regional availability

### Azure OpenAI
- **No Default Base URL** (must be configured)
- **Required Format**: `https://<your-resource-name>.openai.azure.com`
- **Additional Setup**: Requires deployment names to match model IDs

### DeepSeek
- **Default Base URL**: `https://api.deepseek.com`
- **Models**: Chat and R1 (reasoning)

### Ollama (Local Models)
- **Default Base URL**: `http://localhost:11434`
- **No API Key Required** (local only)
- **Custom Use Cases**:
  - Remote Ollama server: Point to server IP/hostname
  - Docker networking: Use container name (e.g., `http://ollama:11434`)

## API Endpoints

### Get All Provider Configurations
```bash
GET /models/providers/config
```

**Response**:
```json
[
  {
    "provider_id": "openai",
    "api_key": "sk-proj-...last4",  // Masked for security
    "base_url": "https://api.openai.com/v1",
    "enabled": true
  }
]
```

### Get Single Provider Configuration
```bash
GET /models/providers/{provider_id}/config
```

### Update Provider Configuration
```bash
PUT /models/providers/{provider_id}/config
Content-Type: application/json

{
  "api_key": "sk-...",
  "base_url": "https://custom.api.url",
  "enabled": true
}
```

**Note**: API keys are masked in responses, showing only the first 8 and last 4 characters.

## Security Considerations

1. **API Key Masking**: Keys are masked in API responses (e.g., `sk-proj-...xyz4`)
2. **Environment Variables**: Preferred for production deployments
3. **In-Memory Storage**: Runtime configurations are not persisted to disk
4. **No Logging**: API keys are never logged in plain text

## Troubleshooting

### Provider Not Showing Models
- Verify the API key is valid and has proper permissions
- Check the base URL is correct (no trailing slashes except for OpenAI)
- Ensure the provider is enabled
- Check backend logs for authentication errors

### API Key Not Saving
- Runtime configurations reset on backend restart
- Use environment variables for permanent configuration
- Verify the backend container has write access if using file storage

### Custom Base URL Not Working
- Ensure the URL includes the protocol (`https://` or `http://`)
- Check for trailing slashes (OpenAI requires `/v1`, others typically don't)
- Test the endpoint with curl before configuring:
  ```bash
  curl -H "Authorization: Bearer $API_KEY" https://your.custom.url/health
  ```

### Ollama Connection Failed
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check Docker networking if Ollama is in a container
- Use container name in base URL if both are in the same Docker network

## Example Docker Compose Configuration

```yaml
services:
  agno-backend-api:
    environment:
      # OpenAI
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=https://api.openai.com/v1
      
      # Anthropic
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ANTHROPIC_BASE_URL=https://api.anthropic.com
      
      # Google
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      
      # Azure
      - AZURE_API_KEY=${AZURE_API_KEY}
      - AZURE_API_BASE=https://your-resource.openai.azure.com
      
      # DeepSeek
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      
      # Ollama (connect to local container)
      - OLLAMA_BASE_URL=http://ollama:11434
```

## Best Practices

1. **Use Environment Variables** for production deployments
2. **Test Configurations** in the UI before committing to environment variables
3. **Enable Only Needed Providers** to reduce startup time and clutter
4. **Document Custom URLs** in your deployment documentation
5. **Rotate API Keys** regularly and update configurations
6. **Monitor Costs** by provider using their respective dashboards

## Next Steps

- See [LITELLM_QUICKSTART.md](./LITELLM_QUICKSTART.md) for model selection
- Check [LITELLM_INTEGRATION.md](./LITELLM_INTEGRATION.md) for API details
- Review provider documentation for rate limits and pricing
