"""Helpers for constructing LiteLLM-backed models and embedders from central config."""

from typing import Any, Dict, Union

from agno.knowledge.embedder.openai import OpenAIEmbedder
from agno.models.litellm import LiteLLM

from app.config.litellm_manager import (
    get_default_chat_configuration,
    get_default_embedding_configuration,
    get_provider_config,
)


def build_chat_model(**overrides: Any) -> LiteLLM:
    """Construct a LiteLLM chat model from default config plus overrides."""
    config = get_default_chat_configuration()
    provider_id = overrides.get("provider", config.get("provider"))
    model_id = overrides.get("model_id", config.get("model_id"))
    settings = config.get("settings", {})
    settings.update(overrides.get("settings", {}))

    provider_config = get_provider_config(provider_id)

    # Build LiteLLM parameters
    params: Dict[str, Any] = {"id": model_id}
    if provider_config.get("api_key"):
        params["api_key"] = provider_config["api_key"]
    if provider_config.get("base_url"):
        params["api_base"] = provider_config["base_url"]
    if provider_config.get("api_version"):
        params["api_version"] = provider_config["api_version"]

    # Only pass model initialization parameters, not runtime parameters
    # Runtime parameters like 'stream' should be passed during agent.run()
    init_params = [
        "temperature",
        "max_tokens",
        "top_p",
        "frequency_penalty",
        "presence_penalty",
    ]
    for param in init_params:
        if param in settings:
            params[param] = settings[param]

    return LiteLLM(**params)


def build_embedder(**overrides: Any) -> Union[OpenAIEmbedder, Any]:
    """Construct an embedder from default embedding config plus overrides."""
    config = get_default_embedding_configuration()
    provider_id = overrides.get("provider", config.get("provider"))
    model_id = overrides.get("model_id", config.get("model_id"))
    dimensions = overrides.get("dimensions", config.get("dimensions"))

    provider_config = get_provider_config(provider_id)

    # Handle HuggingFace local embeddings
    if provider_id == "huggingface":
        # Lazy import to avoid loading heavy dependencies until needed
        from agno.knowledge.embedder.sentence_transformer import (
            SentenceTransformerEmbedder,
        )

        params: Dict[str, Any] = {"model": model_id}
        if dimensions:
            params["dimensions"] = dimensions
        return SentenceTransformerEmbedder(**params)

    # OpenAIEmbedder uses standard parameters
    params: Dict[str, Any] = {"id": model_id}

    # Add optional dimensions parameter if specified
    if dimensions:
        params["dimensions"] = dimensions

    # OpenAIEmbedder will use OPENAI_API_KEY from environment by default
    # Only pass api_key if explicitly provided in provider config
    if provider_config.get("api_key"):
        params["api_key"] = provider_config["api_key"]

    return OpenAIEmbedder(**params)
