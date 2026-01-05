"""Centralized LiteLLM configuration utilities.

This module loads provider credentials, model catalogs, and default
model selections from ``app/config/litellm.yaml`` while keeping a
well-defined set of defaults for first-run experiences. The loader
supports shallow overrides via YAML and environment-variable
substitution so deployments can mix checked-in defaults with local
secrets.
"""

from __future__ import annotations

import os
import threading
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Iterable, MutableMapping, Optional

import yaml

CONFIG_PATH = Path(__file__).resolve().parent / "litellm.yaml"

# Provider defaults cover the common LiteLLM adapters we ship with.
DEFAULT_PROVIDER_CONFIGS: Dict[str, Dict[str, Any]] = {
    "openai": {
        "api_key": "${OPENAI_API_KEY}",
        "base_url": "https://api.openai.com/v1",
        "enabled": None,
    },
    "anthropic": {
        "api_key": "${ANTHROPIC_API_KEY}",
        "base_url": "https://api.anthropic.com",
        "enabled": None,
    },
    "google": {
        "api_key": "${GOOGLE_API_KEY}",
        "base_url": "https://generativelanguage.googleapis.com",
        "enabled": None,
    },
    "azure": {
        "api_key": "${AZURE_API_KEY}",
        "base_url": "${AZURE_API_BASE}",
        "enabled": None,
        "api_version": "${AZURE_API_VERSION}",
    },
    "deepseek": {
        "api_key": "${DEEPSEEK_API_KEY}",
        "base_url": "https://api.deepseek.com",
        "enabled": None,
    },
    "ollama": {
        "api_key": None,
        "base_url": "http://localhost:11434",
        "enabled": True,
    },
    "huggingface": {
        "api_key": None,
        "base_url": None,
        "enabled": True,
        "local": True,
    },
}

# Default LiteLLM-aware chat model selection.
DEFAULT_CHAT_CONFIGURATION: Dict[str, Any] = {
    "provider": "openai",
    "model_id": "gpt-5-mini",
    "settings": {
        "temperature": 0.7,
        "max_tokens": 4096,
        "stream": True,
    },
}

# Default embedding configuration used by knowledge base helpers.
DEFAULT_EMBEDDING_CONFIGURATION: Dict[str, Any] = {
    "provider": "openai",
    "model_id": "text-embedding-3-small",
    "dimensions": 1536,
}

# Embedding model catalog for various providers
DEFAULT_EMBEDDING_CATALOG: Dict[str, Iterable[Dict[str, Any]]] = {
    "openai": [
        {
            "id": "text-embedding-3-small",
            "name": "Text Embedding 3 Small",
            "provider": "openai",
            "dimensions": 1536,
            "description": "Most capable embedding model",
        },
        {
            "id": "text-embedding-3-large",
            "name": "Text Embedding 3 Large",
            "provider": "openai",
            "dimensions": 3072,
            "description": "Larger, more capable embedding model",
        },
    ],
    "huggingface": [
        {
            "id": "sentence-transformers/all-MiniLM-L6-v2",
            "name": "MiniLM L6 v2",
            "provider": "huggingface",
            "dimensions": 384,
            "description": "Fast and efficient local embeddings",
        },
        {
            "id": "sentence-transformers/all-mpnet-base-v2",
            "name": "MPNet Base v2",
            "provider": "huggingface",
            "dimensions": 768,
            "description": "High quality local embeddings",
        },
        {
            "id": "BAAI/bge-small-en-v1.5",
            "name": "BGE Small EN",
            "provider": "huggingface",
            "dimensions": 384,
            "description": "Fast, high-quality local embeddings",
        },
        {
            "id": "BAAI/bge-base-en-v1.5",
            "name": "BGE Base EN",
            "provider": "huggingface",
            "dimensions": 768,
            "description": "Balanced performance and quality",
        },
    ],
}

# Curated catalog of popular chat models. Each entry is a plain mapping
# so that API layers can coerce into pydantic schemas when needed.
DEFAULT_MODEL_CATALOG: Dict[str, Iterable[Dict[str, Any]]] = {
    "openai": [
        {
            "id": "gpt-5-mini",
            "name": "GPT-5 Mini",
            "provider": "openai",
            "description": "Fast and efficient model for most tasks",
            "context_window": 128000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
        {
            "id": "gpt-4o",
            "name": "GPT-4o",
            "provider": "openai",
            "description": "Most capable OpenAI model",
            "context_window": 128000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
        {
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "provider": "openai",
            "description": "Fast, affordable model for simple tasks",
            "context_window": 128000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
        {
            "id": "o1-pro",
            "name": "O1 Pro",
            "provider": "openai",
            "description": "Advanced reasoning model",
            "context_window": 200000,
            "supports_streaming": True,
            "supports_tools": False,
            "supports_vision": False,
            "is_reasoning": True,
        },
    ],
    "anthropic": [
        {
            "id": "claude-sonnet-4-5",
            "name": "Claude Sonnet 4.5",
            "provider": "anthropic",
            "description": "Anthropic's most intelligent model",
            "context_window": 200000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
        {
            "id": "claude-3-opus-20240229",
            "name": "Claude 3 Opus",
            "provider": "anthropic",
            "description": "Most powerful Claude 3 model",
            "context_window": 200000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
        {
            "id": "claude-3-sonnet-20240229",
            "name": "Claude 3 Sonnet",
            "provider": "anthropic",
            "description": "Balanced performance and speed",
            "context_window": 200000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
    ],
    "google": [
        {
            "id": "gemini-2.5-pro",
            "name": "Gemini 2.5 Pro",
            "provider": "google",
            "description": "Google's most advanced model",
            "context_window": 2097152,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
        {
            "id": "gemini-2.0-flash-exp",
            "name": "Gemini 2.0 Flash",
            "provider": "google",
            "description": "Fast, efficient Google model",
            "context_window": 1048576,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
    ],
    "azure": [
        {
            "id": "azure/gpt-4o",
            "name": "Azure GPT-4o",
            "provider": "azure",
            "description": "GPT-4o via Azure OpenAI",
            "context_window": 128000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": True,
            "is_reasoning": False,
        },
        {
            "id": "azure/gpt-35-turbo",
            "name": "Azure GPT-3.5 Turbo",
            "provider": "azure",
            "description": "Affordable Azure model",
            "context_window": 16000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": False,
            "is_reasoning": False,
        },
    ],
    "deepseek": [
        {
            "id": "deepseek/deepseek-chat",
            "name": "DeepSeek Chat",
            "provider": "deepseek",
            "description": "DeepSeek's chat model",
            "context_window": 64000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": False,
            "is_reasoning": False,
        },
        {
            "id": "deepseek/deepseek-reasoner",
            "name": "DeepSeek R1",
            "provider": "deepseek",
            "description": "Advanced reasoning model",
            "context_window": 64000,
            "supports_streaming": True,
            "supports_tools": False,
            "supports_vision": False,
            "is_reasoning": True,
        },
    ],
    "ollama": [
        {
            "id": "ollama/llama3.2",
            "name": "Llama 3.2 (Local)",
            "provider": "ollama",
            "description": "Run locally via Ollama",
            "context_window": 128000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": False,
            "is_reasoning": False,
        },
        {
            "id": "ollama/mistral",
            "name": "Mistral (Local)",
            "provider": "ollama",
            "description": "Run locally via Ollama",
            "context_window": 32000,
            "supports_streaming": True,
            "supports_tools": True,
            "supports_vision": False,
            "is_reasoning": False,
        },
    ],
}

_ENV_PREFIX = "${"
_ENV_SUFFIX = "}"
_CACHE_LOCK = threading.Lock()
_raw_cache: Optional[Dict[str, Any]] = None


def reset_cache() -> None:
    """Clear the in-memory cache so future calls reload from disk."""

    global _raw_cache
    with _CACHE_LOCK:
        _raw_cache = None


def _load_raw_config() -> Dict[str, Any]:
    global _raw_cache
    with _CACHE_LOCK:
        if _raw_cache is not None:
            return deepcopy(_raw_cache)

        if CONFIG_PATH.exists():
            with CONFIG_PATH.open("r", encoding="utf-8") as handle:
                data = yaml.safe_load(handle) or {}
        else:
            data = {}

        if not isinstance(data, dict):
            raise ValueError("litellm.yaml must contain a mapping at the root level")

        _raw_cache = data
        return deepcopy(_raw_cache)


def _save_raw_config(data: MutableMapping[str, Any]) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(dict(data), handle, default_flow_style=False, sort_keys=True)
    reset_cache()


def _resolve_env(value: Any) -> Any:
    if (
        isinstance(value, str)
        and value.startswith(_ENV_PREFIX)
        and value.endswith(_ENV_SUFFIX)
    ):
        env_key = value[len(_ENV_PREFIX) : -len(_ENV_SUFFIX)]
        return os.getenv(env_key) or ""
    return value


def _merge_provider_configs(raw: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    providers: Dict[str, Dict[str, Any]] = {}

    # Start with defaults
    for provider_id, defaults in DEFAULT_PROVIDER_CONFIGS.items():
        providers[provider_id] = dict(defaults)

    # Merge overrides
    overrides = raw.get("providers", {})
    if isinstance(overrides, dict):
        for provider_id, payload in overrides.items():
            if not isinstance(payload, dict):
                continue
            merged = providers.get(provider_id, {}).copy()
            merged.update(payload)
            providers[provider_id] = merged

    # Resolve environment placeholders and derived values
    resolved: Dict[str, Dict[str, Any]] = {}
    for provider_id, config in providers.items():
        entry = config.copy()
        entry["api_key"] = _resolve_env(entry.get("api_key"))
        entry["base_url"] = _resolve_env(entry.get("base_url"))
        entry["api_version"] = _resolve_env(entry.get("api_version"))
        if entry.get("enabled") is None:
            entry["enabled"] = bool(entry.get("api_key")) or provider_id == "ollama"
        resolved[provider_id] = entry

    return resolved


def get_provider_configs() -> Dict[str, Dict[str, Any]]:
    """Return resolved provider configurations keyed by provider ID."""

    raw = _load_raw_config()
    return _merge_provider_configs(raw)


def get_provider_config(provider_id: str) -> Dict[str, Any]:
    configs = get_provider_configs()
    try:
        return configs[provider_id]
    except KeyError as exc:
        raise KeyError(f"Provider '{provider_id}' is not registered") from exc


def update_provider_config(provider_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist provider configuration updates and return the resolved view."""

    if not isinstance(payload, dict):
        raise TypeError("Provider payload must be a mapping")

    raw = _load_raw_config()
    providers = raw.setdefault("providers", {})
    current = providers.get(provider_id, {})
    if current is None or not isinstance(current, dict):
        current = {}

    updated = current.copy()
    for key, value in payload.items():
        if value is None:
            updated.pop(key, None)
        else:
            updated[key] = value

    providers[provider_id] = updated
    _save_raw_config(raw)
    return get_provider_config(provider_id)


def _merge_model_catalog(raw: Dict[str, Any]) -> Dict[str, Iterable[Dict[str, Any]]]:
    catalog: Dict[str, Iterable[Dict[str, Any]]] = {
        provider_id: [dict(entry) for entry in entries]
        for provider_id, entries in DEFAULT_MODEL_CATALOG.items()
    }

    overrides = raw.get("model_catalog", {})
    if isinstance(overrides, dict):
        for provider_id, entries in overrides.items():
            if not isinstance(entries, Iterable):
                continue
            merged_entries = {
                entry["id"]: dict(entry) for entry in catalog.get(provider_id, [])
            }
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                entry_id = entry.get("id")
                if not entry_id:
                    continue
                if entry_id in merged_entries:
                    merged_entries[entry_id].update(entry)
                else:
                    merged_entries[entry_id] = dict(entry)
            catalog[provider_id] = list(merged_entries.values())

    return catalog


def get_model_catalog() -> Dict[str, Iterable[Dict[str, Any]]]:
    """Return the merged model catalog used by API serializers."""

    raw = _load_raw_config()
    return _merge_model_catalog(raw)


def get_embedding_catalog() -> Dict[str, Iterable[Dict[str, Any]]]:
    """Return the merged embedding catalog used by API serializers."""

    raw = _load_raw_config()
    return _merge_embedding_catalog(raw)


def _merge_embedding_catalog(
    raw: Dict[str, Any],
) -> Dict[str, Iterable[Dict[str, Any]]]:
    """Merge embedding catalog from YAML with DEFAULT_EMBEDDING_CATALOG."""

    catalog = deepcopy(DEFAULT_EMBEDDING_CATALOG)
    yaml_catalog = raw.get("embedding_catalog", {})

    if not isinstance(yaml_catalog, dict):
        return catalog

    for provider_id, entries in yaml_catalog.items():
        if not isinstance(entries, list):
            continue
        catalog[provider_id] = entries

    return catalog


def _merge_defaults(section: str, default_payload: Dict[str, Any]) -> Dict[str, Any]:
    raw = _load_raw_config()
    overrides = raw.get("defaults", {})
    payload = default_payload.copy()
    if isinstance(overrides, dict):
        section_override = overrides.get(section)
        if isinstance(section_override, dict):
            payload.update(section_override)
    return payload


def get_default_chat_configuration() -> Dict[str, Any]:
    """Return the default chat model selection (provider, model, settings)."""

    return _merge_defaults("chat", DEFAULT_CHAT_CONFIGURATION)


def get_default_embedding_configuration() -> Dict[str, Any]:
    """Return the default embedding configuration for vector stores."""

    return _merge_defaults("embedding", DEFAULT_EMBEDDING_CONFIGURATION)
