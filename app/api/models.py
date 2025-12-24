"""Model Management API

Provides endpoints for managing LLM models and providers via LiteLLM proxy.
Supports multiple providers: OpenAI, Anthropic, Azure, Google, etc.
"""

import os
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/models", tags=["models"])


class ModelInfo(BaseModel):
    """Information about an available model"""

    id: str = Field(..., description="Model ID (e.g., 'gpt-4o', 'claude-sonnet-4-5')")
    name: str = Field(..., description="Human-readable model name")
    provider: str = Field(
        ..., description="Provider name (e.g., 'openai', 'anthropic', 'azure')"
    )
    description: Optional[str] = Field(
        None, description="Model description or capabilities"
    )
    context_window: Optional[int] = Field(
        None, description="Maximum context window size"
    )
    supports_streaming: bool = Field(
        default=True, description="Whether model supports streaming"
    )
    supports_tools: bool = Field(
        default=True, description="Whether model supports function/tool calling"
    )
    supports_vision: bool = Field(
        default=False, description="Whether model supports vision/image inputs"
    )
    is_reasoning: bool = Field(
        default=False, description="Whether this is a reasoning model"
    )


class ModelProvider(BaseModel):
    """Information about a model provider"""

    id: str = Field(..., description="Provider ID")
    name: str = Field(..., description="Provider display name")
    models: List[ModelInfo] = Field(
        ..., description="Available models from this provider"
    )


class CurrentModelResponse(BaseModel):
    """Current active model information"""

    model_id: str = Field(..., description="Currently selected model ID")
    provider: str = Field(..., description="Provider of current model")
    model_info: Optional[ModelInfo] = Field(
        None, description="Detailed information about current model"
    )


class ModelSelectionRequest(BaseModel):
    """Request to change the active model"""

    model_id: str = Field(..., description="Model ID to switch to")
    provider: str = Field(..., description="Provider of the model")


class ProviderConfig(BaseModel):
    """Configuration for a provider"""

    provider_id: str = Field(..., description="Provider ID")
    api_key: Optional[str] = Field(None, description="API key for the provider")
    base_url: Optional[str] = Field(None, description="Base URL for the provider")
    enabled: bool = Field(default=True, description="Whether provider is enabled")


class ProviderConfigUpdate(BaseModel):
    """Update request for provider configuration"""

    api_key: Optional[str] = Field(None, description="API key for the provider")
    base_url: Optional[str] = Field(None, description="Base URL for the provider")
    enabled: Optional[bool] = Field(None, description="Whether provider is enabled")


class ModelSettings(BaseModel):
    """Advanced settings for model execution"""

    temperature: Optional[float] = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (0.0-2.0). Higher values make output more random",
    )
    max_tokens: Optional[int] = Field(
        default=None, ge=1, description="Maximum number of tokens to generate"
    )
    top_p: Optional[float] = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling parameter. Alternative to temperature",
    )
    frequency_penalty: Optional[float] = Field(
        default=0.0,
        ge=-2.0,
        le=2.0,
        description="Penalty for token frequency (-2.0 to 2.0)",
    )
    presence_penalty: Optional[float] = Field(
        default=0.0,
        ge=-2.0,
        le=2.0,
        description="Penalty for token presence (-2.0 to 2.0)",
    )
    stream: bool = Field(default=True, description="Whether to stream the response")
    timeout: Optional[int] = Field(
        default=60, ge=1, description="Request timeout in seconds"
    )


class ModelConfiguration(BaseModel):
    """Complete model configuration including provider, model, and settings"""

    model_id: str = Field(..., description="Model ID to use")
    provider: str = Field(..., description="Provider for the model")
    settings: ModelSettings = Field(
        default_factory=ModelSettings,
        description="Advanced model execution settings",
    )
    enabled: bool = Field(
        default=True, description="Whether this configuration is enabled"
    )


class EntityModelConfig(BaseModel):
    """Model configuration for a specific entity (project/team/agent)"""

    entity_type: str = Field(
        ..., description="Type of entity: 'project', 'team', or 'agent'"
    )
    entity_id: str = Field(..., description="Unique identifier for the entity")
    configuration: Optional[ModelConfiguration] = Field(
        None,
        description="Model configuration for this entity. None means inherit from parent",
    )
    inherit_from: Optional[str] = Field(
        None,
        description="Entity ID to inherit configuration from (parent in hierarchy)",
    )


class DefaultModelConfig(BaseModel):
    """Global default model configuration"""

    configuration: ModelConfiguration = Field(
        ...,
        description="Default model configuration applied when no specific config exists",
    )
    description: Optional[str] = Field(
        None, description="Description of this default configuration"
    )


# In-memory model registry (in production, this would come from LiteLLM or database)
MODEL_REGISTRY: Dict[str, List[ModelInfo]] = {
    "openai": [
        ModelInfo(
            id="gpt-5-mini",
            name="GPT-5 Mini",
            provider="openai",
            description="Fast and efficient model for most tasks",
            context_window=128000,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
        ModelInfo(
            id="gpt-4o",
            name="GPT-4o",
            provider="openai",
            description="Most capable OpenAI model",
            context_window=128000,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
        ModelInfo(
            id="gpt-4o-mini",
            name="GPT-4o Mini",
            provider="openai",
            description="Fast, affordable model for simple tasks",
            context_window=128000,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
        ModelInfo(
            id="o1-pro",
            name="O1 Pro",
            provider="openai",
            description="Advanced reasoning model",
            context_window=200000,
            supports_streaming=True,
            supports_tools=False,
            is_reasoning=True,
        ),
    ],
    "anthropic": [
        ModelInfo(
            id="claude-sonnet-4-5",
            name="Claude Sonnet 4.5",
            provider="anthropic",
            description="Anthropic's most intelligent model",
            context_window=200000,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
        ModelInfo(
            id="claude-3-opus-20240229",
            name="Claude 3 Opus",
            provider="anthropic",
            description="Most powerful Claude 3 model",
            context_window=200000,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
        ModelInfo(
            id="claude-3-sonnet-20240229",
            name="Claude 3 Sonnet",
            provider="anthropic",
            description="Balanced performance and speed",
            context_window=200000,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
    ],
    "google": [
        ModelInfo(
            id="gemini-2.5-pro",
            name="Gemini 2.5 Pro",
            provider="google",
            description="Google's most advanced model",
            context_window=2097152,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
        ModelInfo(
            id="gemini-2.0-flash-exp",
            name="Gemini 2.0 Flash",
            provider="google",
            description="Fast, efficient Google model",
            context_window=1048576,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
    ],
    "azure": [
        ModelInfo(
            id="azure/gpt-4o",
            name="Azure GPT-4o",
            provider="azure",
            description="GPT-4o via Azure OpenAI",
            context_window=128000,
            supports_streaming=True,
            supports_tools=True,
            supports_vision=True,
        ),
        ModelInfo(
            id="azure/gpt-35-turbo",
            name="Azure GPT-3.5 Turbo",
            provider="azure",
            description="Affordable Azure model",
            context_window=16000,
            supports_streaming=True,
            supports_tools=True,
        ),
    ],
    "deepseek": [
        ModelInfo(
            id="deepseek/deepseek-chat",
            name="DeepSeek Chat",
            provider="deepseek",
            description="DeepSeek's chat model",
            context_window=64000,
            supports_streaming=True,
            supports_tools=True,
        ),
        ModelInfo(
            id="deepseek/deepseek-reasoner",
            name="DeepSeek R1",
            provider="deepseek",
            description="Advanced reasoning model",
            context_window=64000,
            supports_streaming=True,
            supports_tools=False,
            is_reasoning=True,
        ),
    ],
    "ollama": [
        ModelInfo(
            id="ollama/llama3.2",
            name="Llama 3.2 (Local)",
            provider="ollama",
            description="Run locally via Ollama",
            context_window=128000,
            supports_streaming=True,
            supports_tools=True,
        ),
        ModelInfo(
            id="ollama/mistral",
            name="Mistral (Local)",
            provider="ollama",
            description="Run locally via Ollama",
            context_window=32000,
            supports_streaming=True,
            supports_tools=True,
        ),
    ],
}


# Global state for current model (in production, use database or session storage)
CURRENT_MODEL = {
    "model_id": "gpt-5-mini",
    "provider": "openai",
}

# Global default model configuration
DEFAULT_MODEL_CONFIG: Optional[ModelConfiguration] = ModelConfiguration(
    model_id="gpt-5-mini",
    provider="openai",
    settings=ModelSettings(
        temperature=0.7,
        max_tokens=4096,
        stream=True,
    ),
    enabled=True,
)

# Hierarchical configurations: project -> team -> agent
# Key format: "entity_type:entity_id" (e.g., "project:my-project", "agent:agno-assist")
ENTITY_MODEL_CONFIGS: Dict[str, EntityModelConfig] = {}

# Provider configurations with base URLs and API keys
PROVIDER_CONFIGS: Dict[str, Dict[str, Optional[str]]] = {
    "openai": {
        "api_key": os.getenv("OPENAI_API_KEY"),
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "enabled": bool(os.getenv("OPENAI_API_KEY")),
    },
    "anthropic": {
        "api_key": os.getenv("ANTHROPIC_API_KEY"),
        "base_url": os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
        "enabled": bool(os.getenv("ANTHROPIC_API_KEY")),
    },
    "google": {
        "api_key": os.getenv("GOOGLE_API_KEY"),
        "base_url": os.getenv(
            "GOOGLE_BASE_URL", "https://generativelanguage.googleapis.com"
        ),
        "enabled": bool(os.getenv("GOOGLE_API_KEY")),
    },
    "azure": {
        "api_key": os.getenv("AZURE_API_KEY"),
        "base_url": os.getenv("AZURE_API_BASE"),
        "enabled": bool(os.getenv("AZURE_API_KEY")),
    },
    "deepseek": {
        "api_key": os.getenv("DEEPSEEK_API_KEY"),
        "base_url": os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        "enabled": bool(os.getenv("DEEPSEEK_API_KEY")),
    },
    "ollama": {
        "api_key": None,  # Ollama doesn't require API key
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "enabled": True,  # Ollama is local, always enabled
    },
}


@router.get("/list", response_model=List[ModelProvider])
async def list_models() -> List[ModelProvider]:
    """
    List all available models grouped by provider.

    Returns a list of providers with their available models.
    """
    providers = []
    for provider_id, models in MODEL_REGISTRY.items():
        # Get provider display name
        provider_name_map = {
            "openai": "OpenAI",
            "anthropic": "Anthropic",
            "google": "Google",
            "azure": "Azure OpenAI",
            "deepseek": "DeepSeek",
            "ollama": "Ollama (Local)",
        }

        providers.append(
            ModelProvider(
                id=provider_id,
                name=provider_name_map.get(provider_id, provider_id.capitalize()),
                models=models,
            )
        )

    return providers


@router.get("/current", response_model=CurrentModelResponse)
async def get_current_model() -> CurrentModelResponse:
    """
    Get the currently active model.

    Returns information about the model currently being used by agents.
    """
    current_model_id = CURRENT_MODEL["model_id"]
    current_provider = CURRENT_MODEL["provider"]

    # Find model info
    model_info = None
    if current_provider in MODEL_REGISTRY:
        for model in MODEL_REGISTRY[current_provider]:
            if model.id == current_model_id:
                model_info = model
                break

    return CurrentModelResponse(
        model_id=current_model_id,
        provider=current_provider,
        model_info=model_info,
    )


@router.post("/select", response_model=CurrentModelResponse)
async def select_model(
    request: ModelSelectionRequest, fastapi_request: Request
) -> CurrentModelResponse:
    """
    Select a new model to use for agents.

    This updates the global model configuration. In production, this would:
    - Update the agent instances in the AgentOS
    - Potentially create new agent instances with the new model
    - Store the preference in a database or session

    Args:
        request: Model selection request with model_id and provider

    Returns:
        Information about the newly selected model
    """
    model_id = request.model_id
    provider = request.provider

    # Validate that the model exists
    if provider not in MODEL_REGISTRY:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{provider}' not found in registry",
        )

    model_found = False
    model_info = None
    for model in MODEL_REGISTRY[provider]:
        if model.id == model_id:
            model_found = True
            model_info = model
            break

    if not model_found:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found for provider '{provider}'",
        )

    # Update global model (in production, update AgentOS instances)
    CURRENT_MODEL["model_id"] = model_id
    CURRENT_MODEL["provider"] = provider

    # Access AgentOS from app state to potentially update agents
    agent_os = getattr(fastapi_request.app.state, "agent_os", None)
    if agent_os:
        # In a full implementation, you would update agent models here
        # For now, new chats will use the new model
        pass

    return CurrentModelResponse(
        model_id=model_id,
        provider=provider,
        model_info=model_info,
    )


@router.get("/providers", response_model=List[str])
async def list_providers() -> List[str]:
    """
    List all available provider IDs.

    Returns a simple list of provider identifiers.
    """
    return list(MODEL_REGISTRY.keys())


@router.get("/providers/config", response_model=List[ProviderConfig])
async def get_provider_configs() -> List[ProviderConfig]:
    """
    Get configuration for all providers including API keys and base URLs.

    Returns masked API keys for security (only shows first 8 and last 4 chars).
    """
    configs = []
    for provider_id, config in PROVIDER_CONFIGS.items():
        api_key = config.get("api_key")
        # Mask API key for security
        masked_key = None
        if api_key and len(api_key) > 12:
            masked_key = f"{api_key[:8]}...{api_key[-4:]}"
        elif api_key:
            masked_key = "***"

        configs.append(
            ProviderConfig(
                provider_id=provider_id,
                api_key=masked_key,
                base_url=config.get("base_url"),
                enabled=config.get("enabled", False),
            )
        )
    return configs


@router.get("/providers/{provider_id}/config", response_model=ProviderConfig)
async def get_provider_config(provider_id: str) -> ProviderConfig:
    """
    Get configuration for a specific provider.

    Args:
        provider_id: The provider identifier (e.g., 'openai', 'anthropic')

    Returns:
        Provider configuration with masked API key
    """
    if provider_id not in PROVIDER_CONFIGS:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{provider_id}' not found",
        )

    config = PROVIDER_CONFIGS[provider_id]
    api_key = config.get("api_key")

    # Mask API key for security
    masked_key = None
    if api_key and len(api_key) > 12:
        masked_key = f"{api_key[:8]}...{api_key[-4:]}"
    elif api_key:
        masked_key = "***"

    return ProviderConfig(
        provider_id=provider_id,
        api_key=masked_key,
        base_url=config.get("base_url"),
        enabled=config.get("enabled", False),
    )


@router.put("/providers/{provider_id}/config", response_model=ProviderConfig)
async def update_provider_config(
    provider_id: str,
    config_update: ProviderConfigUpdate,
) -> ProviderConfig:
    """
    Update configuration for a specific provider.

    Args:
        provider_id: The provider identifier
        config_update: Updated configuration values

    Returns:
        Updated provider configuration
    """
    if provider_id not in PROVIDER_CONFIGS:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{provider_id}' not found",
        )

    # Update configuration
    if config_update.api_key is not None:
        PROVIDER_CONFIGS[provider_id]["api_key"] = config_update.api_key

    if config_update.base_url is not None:
        PROVIDER_CONFIGS[provider_id]["base_url"] = config_update.base_url

    if config_update.enabled is not None:
        PROVIDER_CONFIGS[provider_id]["enabled"] = config_update.enabled

    # Return updated config with masked key
    config = PROVIDER_CONFIGS[provider_id]
    api_key = config.get("api_key")
    masked_key = None
    if api_key and len(api_key) > 12:
        masked_key = f"{api_key[:8]}...{api_key[-4:]}"
    elif api_key:
        masked_key = "***"

    return ProviderConfig(
        provider_id=provider_id,
        api_key=masked_key,
        base_url=config.get("base_url"),
        enabled=config.get("enabled", False),
    )


# ============================================================================
# Hierarchical Model Configuration Endpoints
# ============================================================================


def _resolve_model_config(
    entity_type: str, entity_id: str, visited: Optional[set] = None
) -> Optional[ModelConfiguration]:
    """
    Resolve model configuration for an entity following the inheritance chain.

    Hierarchy: agent -> team -> project -> default

    Args:
        entity_type: Type of entity ('agent', 'team', or 'project')
        entity_id: ID of the entity
        visited: Set of visited entities to detect circular dependencies

    Returns:
        Resolved ModelConfiguration or None if no configuration found
    """
    if visited is None:
        visited = set()

    # Create entity key
    entity_key = f"{entity_type}:{entity_id}"

    # Detect circular dependency
    if entity_key in visited:
        return None
    visited.add(entity_key)

    # Check if entity has configuration
    entity_config = ENTITY_MODEL_CONFIGS.get(entity_key)

    if entity_config and entity_config.configuration:
        # Entity has explicit configuration
        return entity_config.configuration

    # Check if entity specifies inheritance
    if entity_config and entity_config.inherit_from:
        # Parse inherit_from to get parent type and ID
        parent_parts = entity_config.inherit_from.split(":", 1)
        if len(parent_parts) == 2:
            parent_type, parent_id = parent_parts
            parent_config = _resolve_model_config(parent_type, parent_id, visited)
            if parent_config:
                return parent_config

    # Default inheritance hierarchy
    if entity_type == "agent":
        # Try to find team configuration
        # In production, you'd look up the agent's team from database
        # For now, check if there's a team with similar prefix
        team_id = entity_id.rsplit("-", 1)[0] if "-" in entity_id else None
        if team_id:
            team_config = _resolve_model_config("team", team_id, visited)
            if team_config:
                return team_config

    if entity_type in ["agent", "team"]:
        # Try to find project configuration
        # In production, you'd look up from database
        project_id = "default-project"  # Placeholder
        project_config = _resolve_model_config("project", project_id, visited)
        if project_config:
            return project_config

    # Return global default
    return DEFAULT_MODEL_CONFIG


@router.get("/config/default", response_model=DefaultModelConfig)
async def get_default_model_config() -> DefaultModelConfig:
    """
    Get the global default model configuration.

    This configuration is used when no specific configuration exists for an entity.
    """
    if not DEFAULT_MODEL_CONFIG:
        raise HTTPException(
            status_code=404,
            detail="No default model configuration set",
        )

    return DefaultModelConfig(
        configuration=DEFAULT_MODEL_CONFIG,
        description="Global default model configuration",
    )


@router.put("/config/default", response_model=DefaultModelConfig)
async def set_default_model_config(
    config: DefaultModelConfig,
) -> DefaultModelConfig:
    """
    Set the global default model configuration.

    Args:
        config: New default configuration

    Returns:
        Updated default configuration
    """
    global DEFAULT_MODEL_CONFIG
    DEFAULT_MODEL_CONFIG = config.configuration

    return DefaultModelConfig(
        configuration=DEFAULT_MODEL_CONFIG,
        description="Global default model configuration",
    )


@router.get("/config/{entity_type}/{entity_id}", response_model=EntityModelConfig)
async def get_entity_model_config(
    entity_type: str, entity_id: str
) -> EntityModelConfig:
    """
    Get model configuration for a specific entity (project/team/agent).

    Args:
        entity_type: Type of entity ('project', 'team', or 'agent')
        entity_id: Unique identifier for the entity

    Returns:
        Entity's model configuration (may be inherited)
    """
    if entity_type not in ["project", "team", "agent"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity_type. Must be 'project', 'team', or 'agent'",
        )

    entity_key = f"{entity_type}:{entity_id}"

    # Get explicit configuration
    explicit_config = ENTITY_MODEL_CONFIGS.get(entity_key)

    if explicit_config:
        return explicit_config

    # Return empty config indicating inheritance
    return EntityModelConfig(
        entity_type=entity_type,
        entity_id=entity_id,
        configuration=None,
        inherit_from=None,
    )


@router.get(
    "/config/{entity_type}/{entity_id}/resolved",
    response_model=ModelConfiguration,
)
async def get_resolved_model_config(
    entity_type: str, entity_id: str
) -> ModelConfiguration:
    """
    Get the resolved model configuration for an entity.

    This follows the inheritance chain and returns the effective configuration.

    Args:
        entity_type: Type of entity ('project', 'team', or 'agent')
        entity_id: Unique identifier for the entity

    Returns:
        Resolved model configuration
    """
    if entity_type not in ["project", "team", "agent"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity_type. Must be 'project', 'team', or 'agent'",
        )

    resolved = _resolve_model_config(entity_type, entity_id)

    if not resolved:
        raise HTTPException(
            status_code=404,
            detail=f"No configuration found for {entity_type}:{entity_id}",
        )

    return resolved


@router.put("/config/{entity_type}/{entity_id}", response_model=EntityModelConfig)
async def set_entity_model_config(
    entity_type: str, entity_id: str, config: EntityModelConfig
) -> EntityModelConfig:
    """
    Set model configuration for a specific entity.

    Args:
        entity_type: Type of entity ('project', 'team', or 'agent')
        entity_id: Unique identifier for the entity
        config: Configuration to set

    Returns:
        Updated configuration
    """
    if entity_type not in ["project", "team", "agent"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity_type. Must be 'project', 'team', or 'agent'",
        )

    # Validate entity_type and entity_id match config
    if config.entity_type != entity_type or config.entity_id != entity_id:
        raise HTTPException(
            status_code=400,
            detail="entity_type and entity_id must match config values",
        )

    entity_key = f"{entity_type}:{entity_id}"
    ENTITY_MODEL_CONFIGS[entity_key] = config

    return config


@router.delete("/config/{entity_type}/{entity_id}")
async def delete_entity_model_config(entity_type: str, entity_id: str) -> dict:
    """
    Delete model configuration for a specific entity.

    The entity will then inherit configuration from its parent.

    Args:
        entity_type: Type of entity ('project', 'team', or 'agent')
        entity_id: Unique identifier for the entity

    Returns:
        Success message
    """
    if entity_type not in ["project", "team", "agent"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity_type. Must be 'project', 'team', or 'agent'",
        )

    entity_key = f"{entity_type}:{entity_id}"

    if entity_key in ENTITY_MODEL_CONFIGS:
        del ENTITY_MODEL_CONFIGS[entity_key]
        return {"message": f"Configuration deleted for {entity_key}"}

    raise HTTPException(
        status_code=404,
        detail=f"No configuration found for {entity_key}",
    )


@router.get("/config/entities", response_model=List[EntityModelConfig])
async def list_entity_configs(
    entity_type: Optional[str] = None,
) -> List[EntityModelConfig]:
    """
    List all entity configurations, optionally filtered by entity type.

    Args:
        entity_type: Optional filter for entity type ('project', 'team', or 'agent')

    Returns:
        List of entity configurations
    """
    configs = list(ENTITY_MODEL_CONFIGS.values())

    if entity_type:
        if entity_type not in ["project", "team", "agent"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid entity_type. Must be 'project', 'team', or 'agent'",
            )
        configs = [c for c in configs if c.entity_type == entity_type]

    return configs
