"""Tests for MCP Server management API."""

import pytest
import tempfile
import shutil
from pathlib import Path

from app.api.mcp_servers import (
    MCPServerManager,
    CreateMCPServerRequest,
    UpdateMCPServerRequest,
)


@pytest.fixture
def temp_config_dir():
    """Create a temporary config directory for testing."""
    temp_dir = Path(tempfile.mkdtemp())
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def manager(temp_config_dir):
    """Create a test MCP server manager."""
    return MCPServerManager(temp_config_dir)


def test_list_mcp_servers_empty(manager):
    """Test listing MCP servers when none exist."""
    servers = manager.list_servers()
    assert isinstance(servers, list)
    assert len(servers) == 0


def test_create_mcp_server(manager):
    """Test creating a new MCP server."""
    payload = CreateMCPServerRequest(
        name="Test GitHub Server",
        description="A test GitHub MCP server",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-github"],
        env={"GITHUB_TOKEN": "test_token"},
        transport="stdio",
        tags=["github", "test"],
        version="1.0.0",
    )

    server = manager.create_server(payload)
    assert server.name == payload.name
    assert server.command == payload.command
    assert server.enabled is True
    assert len(server.tags) == 2


def test_create_duplicate_mcp_server(manager):
    """Test that creating a duplicate server fails."""
    from fastapi import HTTPException

    payload = CreateMCPServerRequest(
        name="Duplicate Server",
        description="A duplicate server",
        command="test",
    )

    # Create first server
    manager.create_server(payload)

    # Try to create duplicate
    with pytest.raises(HTTPException) as exc_info:
        manager.create_server(payload)
    assert exc_info.value.status_code == 409


def test_get_mcp_server(manager):
    """Test getting a specific MCP server."""
    payload = CreateMCPServerRequest(
        name="Get Test Server",
        description="Server for get test",
        command="npx",
    )

    created = manager.create_server(payload)

    # Get the server
    server = manager.get_server(created.id)
    assert server is not None
    assert server.id == created.id
    assert server.name == payload.name


def test_get_nonexistent_mcp_server(manager):
    """Test getting a server that doesn't exist."""
    server = manager.get_server("nonexistent-server")
    assert server is None


def test_update_mcp_server(manager):
    """Test updating an MCP server."""
    payload = CreateMCPServerRequest(
        name="Update Test Server",
        description="Original description",
        command="npx",
    )

    created = manager.create_server(payload)

    # Update the server
    update_payload = UpdateMCPServerRequest(
        description="Updated description",
        enabled=False,
    )

    updated = manager.update_server(created.id, update_payload)
    assert updated.description == "Updated description"
    assert updated.enabled is False
    assert updated.name == payload.name  # Unchanged


def test_update_nonexistent_mcp_server(manager):
    """Test updating a server that doesn't exist."""
    from fastapi import HTTPException

    update_payload = UpdateMCPServerRequest(description="Updated")

    with pytest.raises(HTTPException) as exc_info:
        manager.update_server("nonexistent", update_payload)
    assert exc_info.value.status_code == 404


def test_delete_mcp_server(manager):
    """Test deleting an MCP server."""
    payload = CreateMCPServerRequest(
        name="Delete Test Server",
        description="Server to delete",
        command="npx",
    )

    created = manager.create_server(payload)

    # Delete the server
    manager.delete_server(created.id)

    # Verify it's gone
    server = manager.get_server(created.id)
    assert server is None


def test_delete_nonexistent_mcp_server(manager):
    """Test deleting a server that doesn't exist."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        manager.delete_server("nonexistent")
    assert exc_info.value.status_code == 404


def test_list_mcp_servers_with_multiple(manager):
    """Test listing multiple MCP servers."""
    servers_data = [
        CreateMCPServerRequest(
            name=f"Server {i}",
            description=f"Description {i}",
            command="npx",
            tags=["test"],
        )
        for i in range(3)
    ]

    # Create multiple servers
    for server_data in servers_data:
        manager.create_server(server_data)

    # List all servers
    servers = manager.list_servers()
    assert len(servers) == 3


def test_mcp_server_transport_types(manager):
    """Test creating servers with different transport types."""
    transports = ["stdio", "sse", "http"]

    for transport in transports:
        payload = CreateMCPServerRequest(
            name=f"Server {transport}",
            description=f"Server with {transport} transport",
            command="npx",
            transport=transport,
        )

        if transport in ["sse", "http"]:
            payload.url = f"https://example.com/{transport}"

        server = manager.create_server(payload)
        assert server.transport == transport


def test_mcp_server_with_env_vars(manager):
    """Test creating a server with environment variables."""
    payload = CreateMCPServerRequest(
        name="Env Test Server",
        description="Server with env vars",
        command="npx",
        env={
            "API_KEY": "test_key",
            "DEBUG": "true",
        },
    )

    server = manager.create_server(payload)
    assert server.env["API_KEY"] == "test_key"
    assert server.env["DEBUG"] == "true"


def test_mcp_server_with_args(manager):
    """Test creating a server with command arguments."""
    payload = CreateMCPServerRequest(
        name="Args Test Server",
        description="Server with args",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-github", "--verbose"],
    )

    server = manager.create_server(payload)
    assert server.args == payload.args


def test_mcp_server_id_generation(manager):
    """Test that server IDs are generated correctly from names."""
    test_cases = [
        ("GitHub Server", "github-server"),
        ("Test Server 123", "test-server-123"),
        ("Server!!!Name", "server-name"),
        ("CamelCaseServer", "camelcaseserver"),
    ]

    for name, expected_id in test_cases:
        payload = CreateMCPServerRequest(
            name=name,
            description="Test",
            command="test",
        )
        server = manager.create_server(payload)
        assert server.id == expected_id


def test_config_persistence(temp_config_dir):
    """Test that configuration persists across manager instances."""
    # Create first manager and add a server
    manager1 = MCPServerManager(temp_config_dir)
    payload = CreateMCPServerRequest(
        name="Persistent Server",
        description="Test persistence",
        command="test",
    )
    created = manager1.create_server(payload)

    # Create second manager instance
    manager2 = MCPServerManager(temp_config_dir)
    servers = manager2.list_servers()

    assert len(servers) == 1
    assert servers[0].id == created.id
    assert servers[0].name == payload.name


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
