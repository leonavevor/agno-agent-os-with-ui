"""Model Management API

Provides endpoints for managing LLM models and providers via LiteLLM proxy.
Supports multiple providers: OpenAI, Anthropic, Azure, Google, etc.
"""

from typing import Any, Dict, Iterable, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError

from app.config.litellm_manager import (
    get_default_chat_configuration,
    get_default_embedding_configuration,
    get_embedding_catalog,
    get_model_catalog,
    get_provider_config as load_provider_config,
    get_provider_configs as load_provider_configs,
    update_provider_config as persist_provider_config,
)

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


class EmbeddingInfo(BaseModel):
    """Information about an available embedding model"""

    id: str = Field(..., description="Model ID (e.g., 'text-embedding-3-small')")
    name: str = Field(..., description="Human-readable model name")
    provider: str = Field(
        ..., description="Provider name (e.g., 'openai', 'huggingface')"
    )
    dimensions: int = Field(..., description="Embedding dimensions")
    description: Optional[str] = Field(
        None, description="Model description or capabilities"
    )


class ModelProvider(BaseModel):
    """Information about a model provider"""

    id: str = Field(..., description="Provider ID")
    name: str = Field(..., description="Provider display name")
    models: List[ModelInfo] = Field(
        ..., description="Available models from this provider"
    )


class EmbeddingProvider(BaseModel):
    """Information about an embedding provider"""

    id: str = Field(..., description="Provider ID")
    name: str = Field(..., description="Provider display name")
    embeddings: List[EmbeddingInfo] = Field(
        ..., description="Available embedding models from this provider"
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
    api_version: Optional[str] = Field(
        None, description="API version identifier (e.g., Azure api-version)"
    )
    enabled: bool = Field(default=True, description="Whether provider is enabled")


class ProviderConfigUpdate(BaseModel):
    """Update request for provider configuration"""

    api_key: Optional[str] = Field(None, description="API key for the provider")
    base_url: Optional[str] = Field(None, description="Base URL for the provider")
    api_version: Optional[str] = Field(
        None, description="API version identifier (e.g., Azure api-version)"
    )
    enabled: Optional[bool] = Field(None, description="Whether provider is enabled")


def _mask_api_key(api_key: Optional[str]) -> Optional[str]:
    if not api_key:
        return None
    if len(api_key) <= 12:
        return "***"
    return f"{api_key[:8]}...{api_key[-4:]}"


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


def _build_model_registry() -> Dict[str, List[ModelInfo]]:
    catalog = get_model_catalog()
    registry: Dict[str, List[ModelInfo]] = {}

    for provider_id, entries in catalog.items():
        models: List[ModelInfo] = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            try:
                models.append(ModelInfo(**entry))
            except ValidationError:
                continue
        registry[provider_id] = models

    return registry


def _build_embedding_registry() -> Dict[str, List[EmbeddingInfo]]:
    catalog = get_embedding_catalog()
    registry: Dict[str, List[EmbeddingInfo]] = {}

    for provider_id, entries in catalog.items():
        embeddings: List[EmbeddingInfo] = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            try:
                embeddings.append(EmbeddingInfo(**entry))
            except ValidationError:
                continue
        registry[provider_id] = embeddings

    return registry


# Global state for current model (in production, use database or session storage)
_default_chat = get_default_chat_configuration()
_default_model_id = _default_chat.get("model_id", "gpt-5-mini")
_default_provider = _default_chat.get("provider", "openai")

CURRENT_MODEL = {
    "model_id": _default_model_id,
    "provider": _default_provider,
}

# Global default model configuration
DEFAULT_MODEL_CONFIG: Optional[ModelConfiguration] = ModelConfiguration(
    model_id=_default_model_id,
    provider=_default_provider,
    settings=ModelSettings(**_default_chat.get("settings", {})),
    enabled=_default_chat.get("enabled", True),
)

# Hierarchical configurations: project -> team -> agent
# Key format: "entity_type:entity_id" (e.g., "project:my-project", "agent:agno-assist")
ENTITY_MODEL_CONFIGS: Dict[str, EntityModelConfig] = {}


@router.get("/list", response_model=List[ModelProvider])
async def list_models() -> List[ModelProvider]:
    """
    List all available models grouped by provider.

    Returns a list of providers with their available models.
    """
    provider_name_map = {
        "openai": "OpenAI",
        "anthropic": "Anthropic",
        "google": "Google",
        "azure": "Azure OpenAI",
        "deepseek": "DeepSeek",
        "ollama": "Ollama (Local)",
    }

    providers: List[ModelProvider] = []
    registry = _build_model_registry()

    for provider_id, models in registry.items():
        providers.append(
            ModelProvider(
                id=provider_id,
                name=provider_name_map.get(provider_id, provider_id.capitalize()),
                models=models,
            )
        )

    return providers


@router.get("/embeddings/list", response_model=List[EmbeddingProvider])
async def list_embeddings() -> List[EmbeddingProvider]:
    """
    List all available embedding models grouped by provider.

    Returns a list of providers with their available embedding models.
    """
    provider_name_map = {
        "openai": "OpenAI",
        "huggingface": "HuggingFace (Local)",
        "anthropic": "Anthropic",
        "cohere": "Cohere",
        "azure": "Azure OpenAI",
    }

    providers: List[EmbeddingProvider] = []
    registry = _build_embedding_registry()

    for provider_id, embeddings in registry.items():
        providers.append(
            EmbeddingProvider(
                id=provider_id,
                name=provider_name_map.get(provider_id, provider_id.capitalize()),
                embeddings=embeddings,
            )
        )

    return providers


@router.get("/embeddings/default")
async def get_default_embedding():
    """
    Get the default embedding configuration.

    Returns the currently configured default embedding model and settings.
    """
    config = get_default_embedding_configuration()
    return {
        "provider": config.get("provider"),
        "model_id": config.get("model_id"),
        "dimensions": config.get("dimensions"),
    }


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
    registry = _build_model_registry()
    for model in registry.get(current_provider, []):
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

    registry = _build_model_registry()

    # Validate that the model exists
    if provider not in registry:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{provider}' not found in registry",
        )

    model_found = False
    model_info = None
    for model in registry.get(provider, []):
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
    return list(_build_model_registry().keys())


@router.get("/providers/config", response_model=List[ProviderConfig])
async def get_provider_configs() -> List[ProviderConfig]:
    """
    Get configuration for all providers including API keys and base URLs.

    Returns masked API keys for security (only shows first 8 and last 4 chars).
    """
    resolved = load_provider_configs()
    provider_configs: List[ProviderConfig] = []

    for provider_id, config in resolved.items():
        provider_configs.append(
            ProviderConfig(
                provider_id=provider_id,
                api_key=_mask_api_key(config.get("api_key")),
                base_url=config.get("base_url"),
                api_version=config.get("api_version"),
                enabled=bool(config.get("enabled", False)),
            )
        )

    return provider_configs


@router.get("/providers/{provider_id}/config", response_model=ProviderConfig)
async def get_provider_config(provider_id: str) -> ProviderConfig:
    """
    Get configuration for a specific provider.

    Args:
        provider_id: The provider identifier (e.g., 'openai', 'anthropic')

    Returns:
        Provider configuration with masked API key
    """
    try:
        config = load_provider_config(provider_id)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{provider_id}' not found",
        ) from None

    return ProviderConfig(
        provider_id=provider_id,
        api_key=_mask_api_key(config.get("api_key")),
        base_url=config.get("base_url"),
        api_version=config.get("api_version"),
        enabled=bool(config.get("enabled", False)),
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
    payload: Dict[str, Any] = {}
    if config_update.api_key is not None:
        payload["api_key"] = config_update.api_key
    if config_update.base_url is not None:
        payload["base_url"] = config_update.base_url
    if config_update.api_version is not None:
        payload["api_version"] = config_update.api_version
    if config_update.enabled is not None:
        payload["enabled"] = config_update.enabled

    try:
        if payload:
            config = persist_provider_config(provider_id, payload)
        else:
            config = load_provider_config(provider_id)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{provider_id}' not found",
        ) from None

    return ProviderConfig(
        provider_id=provider_id,
        api_key=_mask_api_key(config.get("api_key")),
        base_url=config.get("base_url"),
        api_version=config.get("api_version"),
        enabled=bool(config.get("enabled", False)),
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
