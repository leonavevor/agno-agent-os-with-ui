# Hierarchical Model Configuration System

## Overview

The hierarchical model configuration system enables fine-grained control over LLM model selection and settings at multiple levels: global default, project, team, and agent. Each level can override settings from its parent, creating a flexible inheritance hierarchy.

## Architecture

### Configuration Hierarchy

```
Global Default
    └── Project
            └── Team
                    └── Agent
```

- **Agent** configurations override Team settings
- **Team** configurations override Project settings
- **Project** configurations override Global default
- Entities without explicit configuration inherit from their parent level

### Configuration Components

Each model configuration consists of:

1. **Model Selection**
   - `model_id`: The specific model to use (e.g., "gpt-5-mini", "claude-sonnet-4-5")
   - `provider`: The LLM provider (e.g., "openai", "anthropic", "google")
   - `enabled`: Whether this configuration is active

2. **Execution Settings**
   - `temperature` (0.0-2.0): Controls randomness in responses
   - `max_tokens`: Maximum tokens to generate
   - `top_p` (0.0-1.0): Nucleus sampling parameter
   - `frequency_penalty` (-2.0-2.0): Reduces repetition
   - `presence_penalty` (-2.0-2.0): Encourages topic diversity
   - `stream`: Enable/disable streaming responses
   - `timeout`: Request timeout in seconds

## API Endpoints

### Global Default Configuration

#### Get Default Configuration
```http
GET /models/config/default
```

**Response:**
```json
{
  "configuration": {
    "model_id": "gpt-5-mini",
    "provider": "openai",
    "settings": {
      "temperature": 0.7,
      "max_tokens": 4096,
      "top_p": 1.0,
      "frequency_penalty": 0.0,
      "presence_penalty": 0.0,
      "stream": true,
      "timeout": 60
    },
    "enabled": true
  },
  "description": "Global default model configuration"
}
```

#### Set Default Configuration
```http
PUT /models/config/default
Content-Type: application/json

{
  "configuration": {
    "model_id": "gpt-5-mini",
    "provider": "openai",
    "settings": {
      "temperature": 0.8,
      "max_tokens": 2048
    },
    "enabled": true
  },
  "description": "Updated default configuration"
}
```

### Entity-Specific Configurations

#### Get Entity Configuration
```http
GET /models/config/{entity_type}/{entity_id}
```

**Parameters:**
- `entity_type`: `project`, `team`, or `agent`
- `entity_id`: Unique identifier for the entity

**Example:**
```bash
curl http://localhost:7777/models/config/agent/agno-assist
```

#### Get Resolved Configuration
```http
GET /models/config/{entity_type}/{entity_id}/resolved
```

Returns the effective configuration after resolving the inheritance chain.

**Example:**
```bash
curl http://localhost:7777/models/config/agent/agno-assist/resolved
```

**Response:**
```json
{
  "model_id": "claude-sonnet-4-5",
  "provider": "anthropic",
  "settings": {
    "temperature": 0.5,
    "max_tokens": 8192,
    "stream": true
  },
  "enabled": true
}
```

#### Set Entity Configuration
```http
PUT /models/config/{entity_type}/{entity_id}
Content-Type: application/json

{
  "entity_type": "agent",
  "entity_id": "agno-assist",
  "configuration": {
    "model_id": "claude-sonnet-4-5",
    "provider": "anthropic",
    "settings": {
      "temperature": 0.5,
      "max_tokens": 8192
    },
    "enabled": true
  },
  "inherit_from": null
}
```

#### Delete Entity Configuration
```http
DELETE /models/config/{entity_type}/{entity_id}
```

Removes the entity's configuration, causing it to inherit from parent.

#### List All Entity Configurations
```http
GET /models/config/entities?entity_type=agent
```

**Query Parameters:**
- `entity_type` (optional): Filter by entity type

## Usage Examples

### Example 1: Global Default Configuration

Set a global default that applies to all entities:

```bash
curl -X PUT http://localhost:7777/models/config/default \
  -H "Content-Type: application/json" \
  -d '{
    "configuration": {
      "model_id": "gpt-4o",
      "provider": "openai",
      "settings": {
        "temperature": 0.7,
        "max_tokens": 4096,
        "stream": true
      },
      "enabled": true
    },
    "description": "Default production configuration"
  }'
```

### Example 2: Project-Level Configuration

Configure a project to use a specific model for all its teams and agents:

```bash
curl -X PUT http://localhost:7777/models/config/project/customer-support \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "project",
    "entity_id": "customer-support",
    "configuration": {
      "model_id": "gpt-5-mini",
      "provider": "openai",
      "settings": {
        "temperature": 0.3,
        "max_tokens": 2048
      },
      "enabled": true
    }
  }'
```

### Example 3: Agent-Specific Override

Configure a specific agent to use a different model with custom settings:

```bash
curl -X PUT http://localhost:7777/models/config/agent/agno-assist \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "agent",
    "entity_id": "agno-assist",
    "configuration": {
      "model_id": "claude-sonnet-4-5",
      "provider": "anthropic",
      "settings": {
        "temperature": 0.5,
        "max_tokens": 8192,
        "top_p": 0.9
      },
      "enabled": true
    }
  }'
```

### Example 4: Explicit Inheritance

Configure an agent to explicitly inherit from a team:

```bash
curl -X PUT http://localhost:7777/models/config/agent/support-agent-1 \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "agent",
    "entity_id": "support-agent-1",
    "configuration": null,
    "inherit_from": "team:support-team"
  }'
```

## Configuration Resolution Algorithm

The system resolves configurations using the following algorithm:

1. **Check Explicit Configuration**: If the entity has an explicit configuration, use it
2. **Check Explicit Inheritance**: If `inherit_from` is specified, follow that chain
3. **Default Hierarchy**:
   - For agents: Check team → project → default
   - For teams: Check project → default
   - For projects: Check default
4. **Return Default**: If no configuration found in the chain, use global default

### Circular Dependency Prevention

The resolution algorithm tracks visited entities to prevent circular dependencies. If a circular reference is detected, the algorithm stops and returns `null`.

## Frontend Integration

### Store State

The frontend store includes:

```typescript
interface Store {
  // Global default configuration
  defaultModelConfig: DefaultModelConfig | null
  setDefaultModelConfig: (config: DefaultModelConfig | null) => void
  
  // Entity-specific configurations
  entityModelConfigs: EntityModelConfig[]
  setEntityModelConfigs: (configs: EntityModelConfig[]) => void
  
  // Loading state
  isModelConfigLoading: boolean
  setIsModelConfigLoading: (isLoading: boolean) => void
}
```

### Model Configuration Modal

Access via the **Config** button in the Model Selector:

- Configure global default settings
- View configuration hierarchy
- Understand inheritance relationships
- Adjust advanced model parameters per entity

## Best Practices

### 1. Use Global Default for Common Settings

Set sensible defaults that work for most use cases:

```json
{
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": true,
  "timeout": 60
}
```

### 2. Project-Level for Environment-Specific Settings

Use project configurations for environment-specific overrides:

- **Development**: Higher temperature (0.9) for diverse responses
- **Production**: Lower temperature (0.3) for consistent responses
- **Testing**: Smaller max_tokens to reduce costs

### 3. Agent-Level for Specialized Behavior

Configure specific agents for specialized tasks:

- **Code Agents**: Higher temperature, larger context
- **Customer Support**: Lower temperature, consistent responses
- **Research Agents**: Larger max_tokens, reasoning models

### 4. Enable/Disable Configurations

Use the `enabled` flag to temporarily disable configurations without deleting them:

```json
{
  "configuration": {
    "model_id": "experimental-model",
    "enabled": false
  }
}
```

### 5. Monitor Configuration Changes

Always test configuration changes with a small subset of requests before applying globally.

## Configuration Storage

### Current Implementation

Configurations are stored in-memory using:
- `DEFAULT_MODEL_CONFIG`: Global default configuration
- `ENTITY_MODEL_CONFIGS`: Dictionary of entity configurations

**Note**: In-memory storage means configurations reset on backend restart.

### Production Recommendations

For production deployment, persist configurations in:

1. **PostgreSQL Database**:
   ```sql
   CREATE TABLE model_configurations (
     entity_type VARCHAR(20),
     entity_id VARCHAR(255),
     configuration JSONB,
     inherit_from VARCHAR(255),
     created_at TIMESTAMP,
     updated_at TIMESTAMP,
     PRIMARY KEY (entity_type, entity_id)
   );
   ```

2. **Configuration Files**:
   - YAML or JSON files per environment
   - Version controlled for audit trail
   - Loaded on application startup

3. **Environment Variables**:
   - Set default configuration via environment
   - Override with database for runtime changes

## Monitoring and Debugging

### Check Effective Configuration

To see what configuration an entity is actually using:

```bash
curl http://localhost:7777/models/config/agent/my-agent/resolved
```

### List All Configurations

To audit all configured entities:

```bash
curl http://localhost:7777/models/config/entities | jq
```

### Test Configuration Changes

Before applying to production:

1. Set configuration for a test entity
2. Send test requests through that entity
3. Verify response quality and performance
4. Gradually roll out to production entities

## Troubleshooting

### Configuration Not Taking Effect

**Problem**: Changed configuration but entity still uses old settings

**Solutions**:
1. Check if configuration is explicitly set: `GET /models/config/{type}/{id}`
2. Verify resolved configuration: `GET /models/config/{type}/{id}/resolved`
3. Ensure entity ID matches exactly (case-sensitive)
4. Check if parent configuration is overriding

### Unexpected Model Selection

**Problem**: Entity using unexpected model

**Solutions**:
1. Trace inheritance chain using resolved endpoint
2. Check for explicit `inherit_from` overrides
3. Verify global default configuration
4. Check provider is enabled and has valid API key

### Performance Issues

**Problem**: Slow responses or timeouts

**Solutions**:
1. Reduce `max_tokens` setting
2. Increase `timeout` value
3. Switch to faster model (e.g., gpt-5-mini instead of gpt-4o)
4. Disable `stream` if not needed

## Security Considerations

1. **Access Control**: Implement authentication for configuration endpoints
2. **Audit Logging**: Log all configuration changes with user and timestamp
3. **Rate Limiting**: Prevent abuse of configuration endpoints
4. **Validation**: Validate all configuration values before applying
5. **Sensitive Settings**: Don't expose API keys or internal URLs in configurations

## Migration Guide

### Migrating from Simple Model Selection

If you're currently using simple model selection:

1. **Export Current Settings**: Note your current model and settings
2. **Create Default Configuration**: Set as global default
3. **Identify Special Cases**: Find agents needing different models
4. **Create Entity Configurations**: Override for special cases
5. **Test Thoroughly**: Verify all entities work correctly
6. **Remove Old Code**: Clean up deprecated model selection code

### Migrating from Environment Variables

If model settings are in environment variables:

1. **Map Variables to Configuration**: Create configuration objects from env vars
2. **Set Global Default**: Use environment values for default
3. **Override Per Environment**: Create project configs for dev/staging/prod
4. **Gradually Phase Out**: Keep env vars during transition period

## Future Enhancements

Planned improvements to the hierarchical configuration system:

1. **Configuration Versioning**: Track configuration history and rollback
2. **A/B Testing**: Split traffic between configurations
3. **Cost Tracking**: Monitor costs per configuration
4. **Performance Metrics**: Track response times and quality per config
5. **Auto-Optimization**: AI-powered configuration tuning
6. **Configuration Templates**: Predefined configs for common scenarios
7. **Bulk Operations**: Update multiple entities at once
8. **Configuration Validation**: Pre-flight checks before applying

## Related Documentation

- [LITELLM_INTEGRATION.md](./LITELLM_INTEGRATION.md) - LiteLLM proxy integration details
- [PROVIDER_CONFIG_GUIDE.md](./PROVIDER_CONFIG_GUIDE.md) - Provider-specific configuration
- [LITELLM_QUICKSTART.md](./LITELLM_QUICKSTART.md) - Quick start guide for model selection

## Support

For issues or questions about hierarchical configuration:

1. Check the resolved configuration endpoint
2. Review inheritance chain
3. Verify provider configurations
4. Check backend logs for errors
5. Review this documentation
6. Open an issue on GitHub with configuration details
