"""MCP Server catalog API exposing discovery and management endpoints."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/mcp-servers", tags=["mcp-servers"])


class MCPServerMetadata(BaseModel):
    """Metadata for an MCP server."""

    id: str
    name: str
    description: str
    command: str
    args: Optional[List[str]] = Field(default_factory=list)
    env: Optional[Dict[str, str]] = Field(default_factory=dict)
    transport: str = Field(
        default="stdio", description="Transport type: stdio, sse, or http"
    )
    url: Optional[str] = Field(
        default=None, description="URL for SSE or HTTP transport"
    )
    enabled: bool = Field(default=True)
    tags: List[str] = Field(default_factory=list)
    version: Optional[str] = None


class CreateMCPServerRequest(BaseModel):
    """Request to create a new MCP server configuration."""

    name: str = Field(..., description="Server name", min_length=1, max_length=100)
    description: str = Field(..., description="Server description", min_length=1)
    command: str = Field(..., description="Command to start the server")
    args: Optional[List[str]] = Field(
        default_factory=list, description="Command arguments"
    )
    env: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="Environment variables"
    )
    transport: str = Field(default="stdio", description="Transport type")
    url: Optional[str] = Field(default=None, description="URL for SSE/HTTP transport")
    tags: List[str] = Field(default_factory=list, description="Server tags")
    version: Optional[str] = Field(default="1.0.0", description="Server version")


class UpdateMCPServerRequest(BaseModel):
    """Request to update an MCP server configuration."""

    name: Optional[str] = None
    description: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    transport: Optional[str] = None
    url: Optional[str] = None
    enabled: Optional[bool] = None
    tags: Optional[List[str]] = None
    version: Optional[str] = None


class CreateMCPServerResponse(BaseModel):
    """Response after creating an MCP server."""

    status: str
    server: MCPServerMetadata
    message: str


class DeleteMCPServerResponse(BaseModel):
    """Response after deleting an MCP server."""

    status: str
    message: str


class MCPServerManager:
    """Manager for MCP server configurations."""

    def __init__(self, config_dir: Path):
        self.config_dir = config_dir
        self.config_file = config_dir / "mcp_servers.yaml"
        self._ensure_config_exists()

    def _ensure_config_exists(self):
        """Ensure the config directory and file exist."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        if not self.config_file.exists():
            self.config_file.write_text(
                yaml.dump({"mcp_servers": []}, default_flow_style=False)
            )

    def _load_config(self) -> Dict[str, Any]:
        """Load MCP servers configuration from YAML."""
        if not self.config_file.exists():
            return {"mcp_servers": []}
        with open(self.config_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"mcp_servers": []}

    def _save_config(self, config: Dict[str, Any]):
        """Save MCP servers configuration to YAML."""
        with open(self.config_file, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    def list_servers(self) -> List[MCPServerMetadata]:
        """List all MCP servers."""
        config = self._load_config()
        return [MCPServerMetadata(**server) for server in config.get("mcp_servers", [])]

    def get_server(self, server_id: str) -> Optional[MCPServerMetadata]:
        """Get a specific MCP server by ID."""
        servers = self.list_servers()
        for server in servers:
            if server.id == server_id:
                return server
        return None

    def create_server(self, payload: CreateMCPServerRequest) -> MCPServerMetadata:
        """Create a new MCP server configuration."""
        # Generate server ID from name
        server_id = re.sub(r"[^a-z0-9]+", "-", payload.name.lower()).strip("-")

        # Check if server already exists
        if self.get_server(server_id):
            raise HTTPException(
                status_code=409,
                detail=f"MCP server with ID '{server_id}' already exists. Please use a different name.",
            )

        # Create new server metadata
        new_server = MCPServerMetadata(
            id=server_id,
            name=payload.name,
            description=payload.description,
            command=payload.command,
            args=payload.args or [],
            env=payload.env or {},
            transport=payload.transport,
            url=payload.url,
            enabled=True,
            tags=payload.tags,
            version=payload.version,
        )

        # Add to config
        config = self._load_config()
        if "mcp_servers" not in config:
            config["mcp_servers"] = []
        config["mcp_servers"].append(new_server.model_dump())
        self._save_config(config)

        return new_server

    def update_server(
        self, server_id: str, payload: UpdateMCPServerRequest
    ) -> MCPServerMetadata:
        """Update an existing MCP server configuration."""
        config = self._load_config()
        servers = config.get("mcp_servers", [])

        # Find and update the server
        for i, server in enumerate(servers):
            if server.get("id") == server_id:
                # Update only provided fields
                if payload.name is not None:
                    server["name"] = payload.name
                if payload.description is not None:
                    server["description"] = payload.description
                if payload.command is not None:
                    server["command"] = payload.command
                if payload.args is not None:
                    server["args"] = payload.args
                if payload.env is not None:
                    server["env"] = payload.env
                if payload.transport is not None:
                    server["transport"] = payload.transport
                if payload.url is not None:
                    server["url"] = payload.url
                if payload.enabled is not None:
                    server["enabled"] = payload.enabled
                if payload.tags is not None:
                    server["tags"] = payload.tags
                if payload.version is not None:
                    server["version"] = payload.version

                servers[i] = server
                self._save_config(config)
                return MCPServerMetadata(**server)

        raise HTTPException(
            status_code=404, detail=f"MCP server '{server_id}' not found"
        )

    def delete_server(self, server_id: str):
        """Delete an MCP server configuration."""
        config = self._load_config()
        servers = config.get("mcp_servers", [])

        # Find and remove the server
        for i, server in enumerate(servers):
            if server.get("id") == server_id:
                del servers[i]
                self._save_config(config)
                return

        raise HTTPException(
            status_code=404, detail=f"MCP server '{server_id}' not found"
        )


# Initialize the manager
_manager: Optional[MCPServerManager] = None


def get_manager() -> MCPServerManager:
    """Get or create the MCP server manager instance."""
    global _manager  # noqa: PLW0603
    if _manager is None:
        config_dir = Path(__file__).parent.parent / "config"
        _manager = MCPServerManager(config_dir)
    return _manager


@router.get("", response_model=List[MCPServerMetadata])
async def list_mcp_servers() -> List[MCPServerMetadata]:
    """List all MCP server configurations."""
    manager = get_manager()
    return manager.list_servers()


@router.get("/{server_id}", response_model=MCPServerMetadata)
async def get_mcp_server(server_id: str) -> MCPServerMetadata:
    """Get a specific MCP server configuration."""
    manager = get_manager()
    server = manager.get_server(server_id)
    if not server:
        raise HTTPException(
            status_code=404, detail=f"MCP server '{server_id}' not found"
        )
    return server


@router.post("", response_model=CreateMCPServerResponse)
async def create_mcp_server(payload: CreateMCPServerRequest) -> CreateMCPServerResponse:
    """Create a new MCP server configuration."""
    manager = get_manager()
    try:
        new_server = manager.create_server(payload)
        return CreateMCPServerResponse(
            status="created",
            server=new_server,
            message=f"MCP server '{payload.name}' created successfully with ID '{new_server.id}'",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to create MCP server: {str(exc)}"
        ) from exc


@router.patch("/{server_id}", response_model=MCPServerMetadata)
async def update_mcp_server(
    server_id: str, payload: UpdateMCPServerRequest
) -> MCPServerMetadata:
    """Update an existing MCP server configuration."""
    manager = get_manager()
    return manager.update_server(server_id, payload)


@router.delete("/{server_id}", response_model=DeleteMCPServerResponse)
async def delete_mcp_server(server_id: str) -> DeleteMCPServerResponse:
    """Delete an MCP server configuration."""
    manager = get_manager()
    try:
        manager.delete_server(server_id)
        return DeleteMCPServerResponse(
            status="deleted", message=f"MCP server '{server_id}' deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete MCP server: {str(exc)}"
        ) from exc
