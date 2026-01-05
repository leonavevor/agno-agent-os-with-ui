# Placeholder for model IDs while we add a Registry for models

OPENAI_MODEL_ID = "gpt-5-mini"
OPENAI_EMBEDDER_MODEL_ID = "text-embedding-3-small"
ANTHROPIC_MODEL_ID = "claude-sonnet-4-5"
GOOGLE_MODEL_ID = "gemini-2.5-pro"

# Pydantic models for API requests
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CreateToolPayload(BaseModel):
    """Payload for creating a new tool"""

    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    language: str = Field(
        ..., description="Programming language (python, bash, javascript, etc.)"
    )
    code: str = Field(..., description="Tool code/script")
    params: Dict[str, Any] = Field(default_factory=dict, description="Tool parameters")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    is_external: bool = Field(
        default=False, description="Whether tool requires external access"
    )
    version: str = Field(default="1.0.0", description="Tool version")


class UpdateToolPayload(BaseModel):
    """Payload for updating an existing tool"""

    name: Optional[str] = Field(None, description="Tool name")
    description: Optional[str] = Field(None, description="Tool description")
    language: Optional[str] = Field(None, description="Programming language")
    code: Optional[str] = Field(None, description="Tool code/script")
    params: Optional[Dict[str, Any]] = Field(None, description="Tool parameters")
    tags: Optional[List[str]] = Field(None, description="Tags for categorization")
    enabled: Optional[bool] = Field(None, description="Whether tool is enabled")
    is_external: Optional[bool] = Field(
        None, description="Whether tool requires external access"
    )
    version: Optional[str] = Field(None, description="Tool version")


class CreateMCPServerPayload(BaseModel):
    """Payload for creating a new MCP server"""

    name: str = Field(..., description="Server name")
    command: str = Field(..., description="Command to execute")
    args: List[str] = Field(default_factory=list, description="Command arguments")
    env: Dict[str, str] = Field(
        default_factory=dict, description="Environment variables"
    )
    transport: str = Field(
        default="stdio", description="Transport type (stdio, sse, http)"
    )
    url: Optional[str] = Field(None, description="URL for SSE/HTTP transport")
    description: Optional[str] = Field(None, description="Server description")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")


class UpdateMCPServerPayload(BaseModel):
    """Payload for updating an existing MCP server"""

    name: Optional[str] = Field(None, description="Server name")
    command: Optional[str] = Field(None, description="Command to execute")
    args: Optional[List[str]] = Field(None, description="Command arguments")
    env: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    transport: Optional[str] = Field(None, description="Transport type")
    url: Optional[str] = Field(None, description="URL for SSE/HTTP transport")
    enabled: Optional[bool] = Field(None, description="Whether server is enabled")
    description: Optional[str] = Field(None, description="Server description")
    tags: Optional[List[str]] = Field(None, description="Tags for categorization")
