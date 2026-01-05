"""Tools catalog API exposing discovery and management endpoints with external access control."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/tools", tags=["tools"])


class ToolMetadata(BaseModel):
    """Metadata for a tool."""

    id: str
    name: str
    description: str
    language: str = Field(
        description="Programming language: python, bash, javascript, etc."
    )
    code: str = Field(description="Tool code/script content")
    params: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Tool parameters schema"
    )
    tags: List[str] = Field(default_factory=list)
    enabled: bool = Field(default=True)
    is_external: bool = Field(
        default=False, description="Whether this tool requires external access"
    )
    version: Optional[str] = None


class CreateToolRequest(BaseModel):
    """Request to create a new tool."""

    name: str = Field(..., description="Tool name", min_length=1, max_length=100)
    description: str = Field(..., description="Tool description", min_length=1)
    language: str = Field(..., description="Programming language")
    code: str = Field(..., description="Tool code/script content", min_length=1)
    params: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Tool parameters"
    )
    tags: List[str] = Field(default_factory=list, description="Tool tags")
    is_external: bool = Field(default=False, description="Requires external access")
    version: Optional[str] = Field(default="1.0.0", description="Tool version")


class UpdateToolRequest(BaseModel):
    """Request to update a tool."""

    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    code: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None
    is_external: Optional[bool] = None
    tags: Optional[List[str]] = None
    version: Optional[str] = None


class CreateToolResponse(BaseModel):
    """Response after creating a tool."""

    status: str
    tool: ToolMetadata
    message: str


class DeleteToolResponse(BaseModel):
    """Response after deleting a tool."""

    status: str
    message: str


class ExternalToolAccessSettings(BaseModel):
    """Settings for external tool access control."""

    enabled: bool = Field(description="Whether external tools are allowed to execute")
    whitelist: List[str] = Field(
        default_factory=list, description="Whitelisted tool IDs"
    )
    require_confirmation: bool = Field(
        default=True, description="Require user confirmation"
    )


class ToolManager:
    """Manager for tool configurations and external access control."""

    def __init__(self, config_dir: Path | str):
        self.config_dir = (
            Path(config_dir) if isinstance(config_dir, str) else config_dir
        )
        self.tools_file = self.config_dir / "tools.yaml"
        self.settings_file = self.config_dir / "tool_settings.yaml"
        self._ensure_config_exists()

    def _ensure_config_exists(self):
        """Ensure the config directory and files exist."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        if not self.tools_file.exists():
            self.tools_file.write_text(
                yaml.dump({"tools": []}, default_flow_style=False)
            )
        if not self.settings_file.exists():
            default_settings = {
                "external_tool_access": {
                    "enabled": False,
                    "whitelist": [],
                    "require_confirmation": True,
                }
            }
            self.settings_file.write_text(
                yaml.dump(default_settings, default_flow_style=False)
            )

    def _load_tools_config(self) -> Dict[str, Any]:
        """Load tools configuration from YAML."""
        if not self.tools_file.exists():
            return {"tools": []}
        with open(self.tools_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"tools": []}

    def _save_tools_config(self, config: Dict[str, Any]):
        """Save tools configuration to YAML."""
        with open(self.tools_file, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    def _load_settings(self) -> Dict[str, Any]:
        """Load tool settings from YAML."""
        if not self.settings_file.exists():
            return {
                "external_tool_access": {
                    "enabled": False,
                    "whitelist": [],
                    "require_confirmation": True,
                }
            }
        with open(self.settings_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def _save_settings(self, settings: Dict[str, Any]):
        """Save tool settings to YAML."""
        with open(self.settings_file, "w", encoding="utf-8") as f:
            yaml.dump(settings, f, default_flow_style=False, sort_keys=False)

    def get_external_access_settings(self) -> ExternalToolAccessSettings:
        """Get external tool access settings."""
        settings = self._load_settings()
        access = settings.get("external_tool_access", {})
        return ExternalToolAccessSettings(
            enabled=access.get("enabled", False),
            whitelist=access.get("whitelist", []),
            require_confirmation=access.get("require_confirmation", True),
        )

    def update_external_access_settings(
        self, settings: ExternalToolAccessSettings
    ) -> ExternalToolAccessSettings:
        """Update external tool access settings."""
        config = self._load_settings()
        config["external_tool_access"] = {
            "enabled": settings.enabled,
            "whitelist": settings.whitelist,
            "require_confirmation": settings.require_confirmation,
        }
        self._save_settings(config)
        return settings

    def list_tools(self, include_disabled: bool = True) -> List[ToolMetadata]:
        """List all tools."""
        config = self._load_tools_config()
        tools = [ToolMetadata(**tool) for tool in config.get("tools", [])]
        if not include_disabled:
            tools = [t for t in tools if t.enabled]
        return tools

    def get_tool(self, tool_id: str) -> Optional[ToolMetadata]:
        """Get a specific tool by ID."""
        tools = self.list_tools()
        for tool in tools:
            if tool.id == tool_id:
                return tool
        return None

    def create_tool(self, payload: CreateToolRequest) -> ToolMetadata:
        """Create a new tool."""
        # Generate tool ID from name
        tool_id = re.sub(r"[^a-z0-9]+", "_", payload.name.lower()).strip("_")

        # Check if tool already exists
        if self.get_tool(tool_id):
            raise HTTPException(
                status_code=409,
                detail=f"Tool with ID '{tool_id}' already exists. Please use a different name.",
            )

        # Create new tool metadata
        new_tool = ToolMetadata(
            id=tool_id,
            name=payload.name,
            description=payload.description,
            language=payload.language,
            code=payload.code,
            params=payload.params or {},
            tags=payload.tags,
            enabled=True,
            is_external=payload.is_external,
            version=payload.version,
        )

        # Add to config
        config = self._load_tools_config()
        if "tools" not in config:
            config["tools"] = []
        config["tools"].append(new_tool.model_dump())
        self._save_tools_config(config)

        return new_tool

    def update_tool(self, tool_id: str, payload: UpdateToolRequest) -> ToolMetadata:
        """Update an existing tool."""
        config = self._load_tools_config()
        tools = config.get("tools", [])

        # Find and update the tool
        for i, tool in enumerate(tools):
            if tool.get("id") == tool_id:
                # Update only provided fields
                if payload.name is not None:
                    tool["name"] = payload.name
                if payload.description is not None:
                    tool["description"] = payload.description
                if payload.language is not None:
                    tool["language"] = payload.language
                if payload.code is not None:
                    tool["code"] = payload.code
                if payload.params is not None:
                    tool["params"] = payload.params
                if payload.enabled is not None:
                    tool["enabled"] = payload.enabled
                if payload.is_external is not None:
                    tool["is_external"] = payload.is_external
                if payload.tags is not None:
                    tool["tags"] = payload.tags
                if payload.version is not None:
                    tool["version"] = payload.version

                tools[i] = tool
                self._save_tools_config(config)
                return ToolMetadata(**tool)

        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    def delete_tool(self, tool_id: str):
        """Delete a tool."""
        config = self._load_tools_config()
        tools = config.get("tools", [])

        # Find and remove the tool
        for i, tool in enumerate(tools):
            if tool.get("id") == tool_id:
                del tools[i]
                self._save_tools_config(config)
                return

        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    def can_execute_tool(self, tool_id: str) -> tuple[bool, str]:
        """Check if a tool can be executed based on settings."""
        tool = self.get_tool(tool_id)
        if not tool:
            return False, "Tool not found"

        if not tool.enabled:
            return False, "Tool is disabled"

        if not tool.is_external:
            # Internal tools can always execute
            return True, "OK"

        # Check external tool access settings
        settings = self.get_external_access_settings()
        if not settings.enabled:
            return False, "External tool access is disabled"

        if settings.whitelist and tool_id not in settings.whitelist:
            return False, "Tool not in whitelist"

        return True, "OK"


# Initialize the manager
_manager: Optional[ToolManager] = None


def get_manager() -> ToolManager:
    """Get or create the tool manager instance."""
    global _manager  # noqa: PLW0603
    if _manager is None:
        config_dir = Path(__file__).parent.parent / "config"
        _manager = ToolManager(config_dir)
    return _manager


# ============================================
# Tool CRUD Endpoints
# ============================================


@router.get("", response_model=List[ToolMetadata])
async def list_tools(include_disabled: bool = True) -> List[ToolMetadata]:
    """List all tool configurations."""
    manager = get_manager()
    return manager.list_tools(include_disabled=include_disabled)


@router.get("/{tool_id}", response_model=ToolMetadata)
async def get_tool(tool_id: str) -> ToolMetadata:
    """Get a specific tool configuration."""
    manager = get_manager()
    tool = manager.get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")
    return tool


@router.post("", response_model=CreateToolResponse)
async def create_tool(payload: CreateToolRequest) -> CreateToolResponse:
    """Create a new tool configuration."""
    manager = get_manager()
    try:
        new_tool = manager.create_tool(payload)
        return CreateToolResponse(
            status="created",
            tool=new_tool,
            message=f"Tool '{payload.name}' created successfully with ID '{new_tool.id}'",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to create tool: {str(exc)}"
        ) from exc


@router.patch("/{tool_id}", response_model=ToolMetadata)
async def update_tool(tool_id: str, payload: UpdateToolRequest) -> ToolMetadata:
    """Update an existing tool configuration."""
    manager = get_manager()
    return manager.update_tool(tool_id, payload)


@router.delete("/{tool_id}", response_model=DeleteToolResponse)
async def delete_tool(tool_id: str) -> DeleteToolResponse:
    """Delete a tool configuration."""
    manager = get_manager()
    try:
        manager.delete_tool(tool_id)
        return DeleteToolResponse(
            status="deleted", message=f"Tool '{tool_id}' deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete tool: {str(exc)}"
        ) from exc


# ============================================
# External Tool Access Control Endpoints
# ============================================


@router.get("/settings/external-access", response_model=ExternalToolAccessSettings)
async def get_external_access_settings() -> ExternalToolAccessSettings:
    """Get external tool access control settings."""
    manager = get_manager()
    return manager.get_external_access_settings()


@router.put("/settings/external-access", response_model=ExternalToolAccessSettings)
async def update_external_access_settings(
    settings: ExternalToolAccessSettings,
) -> ExternalToolAccessSettings:
    """Update external tool access control settings."""
    manager = get_manager()
    return manager.update_external_access_settings(settings)


@router.get("/{tool_id}/can-execute")
async def check_tool_execution(tool_id: str) -> Dict[str, Any]:
    """Check if a tool can be executed based on current settings."""
    manager = get_manager()
    can_execute, reason = manager.can_execute_tool(tool_id)
    return {"can_execute": can_execute, "reason": reason, "tool_id": tool_id}
