"""
Tests for tools management API
"""

import os
import tempfile
from pathlib import Path
import pytest
import yaml
from app.api.tools import ToolManager, ExternalToolAccessSettings
from app.models import CreateToolPayload, UpdateToolPayload


@pytest.fixture
def temp_tool_dir():
    """Create a temporary directory for tool configuration"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create config directory
        config_dir = Path(tmpdir) / "config"
        config_dir.mkdir()

        # Create initial tools.yaml
        tools_file = config_dir / "tools.yaml"
        initial_tools = {
            "tools": [
                {
                    "id": "test_tool_1",
                    "name": "Test Tool 1",
                    "description": "First test tool",
                    "language": "python",
                    "code": "def test():\n    return 'test1'",
                    "params": {},
                    "tags": ["test", "python"],
                    "enabled": True,
                    "is_external": False,
                    "version": "1.0.0",
                },
                {
                    "id": "test_tool_2",
                    "name": "Test Tool 2",
                    "description": "Second test tool",
                    "language": "bash",
                    "code": "echo 'test2'",
                    "params": {},
                    "tags": ["test", "bash"],
                    "enabled": False,
                    "is_external": True,
                    "version": "1.0.0",
                },
            ]
        }
        with open(tools_file, "w", encoding="utf-8") as f:
            yaml.dump(initial_tools, f)

        # Create initial tool_settings.yaml
        settings_file = config_dir / "tool_settings.yaml"
        initial_settings = {
            "external_access": {
                "enabled": False,
                "whitelist": [],
                "require_confirmation": True,
            }
        }
        with open(settings_file, "w", encoding="utf-8") as f:
            yaml.dump(initial_settings, f)

        yield str(config_dir)


@pytest.fixture
def tool_manager(temp_tool_dir):
    """Create a ToolManager instance with temporary config"""
    return ToolManager(config_dir=temp_tool_dir)


def test_load_tools(tool_manager):
    """Test loading tools from configuration"""
    tools = tool_manager.list_tools()
    assert len(tools) == 2
    assert tools[0].name == "Test Tool 1"
    assert tools[1].name == "Test Tool 2"


def test_load_external_access_settings(tool_manager):
    """Test loading external access settings"""
    settings = tool_manager.get_external_access_settings()
    assert settings.enabled is False
    assert settings.whitelist == []
    assert settings.require_confirmation is True


def test_create_tool(tool_manager):
    """Test creating a new tool"""
    new_tool = CreateToolPayload(
        name="New Tool",
        description="A newly created tool",
        language="javascript",
        code="console.log('hello');",
        params={},
        tags=["new", "js"],
        is_external=False,
        version="1.0.0",
    )

    result = tool_manager.create_tool(new_tool)
    assert result.name == "New Tool"
    assert result.language == "javascript"
    assert result.id is not None

    # Verify tool was added
    tools = tool_manager.list_tools()
    assert len(tools) == 3


def test_create_tool_duplicate_name(tool_manager):
    """Test creating a tool with duplicate name raises error"""
    new_tool = CreateToolPayload(
        name="Test Tool 1",  # This name already exists
        description="Duplicate",
        language="python",
        code="pass",
        params={},
        tags=[],
        is_external=False,
        version="1.0.0",
    )

    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        tool_manager.create_tool(new_tool)


def test_update_tool(tool_manager):
    """Test updating an existing tool"""
    update_data = UpdateToolPayload(description="Updated description", enabled=True)

    result = tool_manager.update_tool("test_tool_1", update_data)
    assert result.description == "Updated description"
    assert result.enabled is True


def test_update_nonexistent_tool(tool_manager):
    """Test updating a non-existent tool raises error"""
    update_data = UpdateToolPayload(description="Test")

    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        tool_manager.update_tool("nonexistent_id", update_data)


def test_delete_tool(tool_manager):
    """Test deleting a tool"""
    tool_manager.delete_tool("test_tool_1")

    tools = tool_manager.list_tools()
    assert len(tools) == 1
    assert tools[0].id == "test_tool_2"


def test_delete_nonexistent_tool(tool_manager):
    """Test deleting a non-existent tool raises error"""
    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        tool_manager.delete_tool("nonexistent_id")


def test_list_tools_enabled_filter(tool_manager):
    """Test listing only enabled tools"""
    enabled_tools = tool_manager.list_tools(include_disabled=False)
    assert len(enabled_tools) == 1
    assert enabled_tools[0].id == "test_tool_1"


def test_can_execute_tool_internal(tool_manager):
    """Test execution check for internal tool"""
    # Internal tool should always be executable
    can_execute, reason = tool_manager.can_execute_tool("test_tool_1")
    assert can_execute is True


def test_can_execute_tool_external_disabled(tool_manager):
    """Test execution check for external tool when access is disabled"""
    # First enable the tool
    tool_manager.update_tool("test_tool_2", UpdateToolPayload(enabled=True))
    # External tool with disabled access should not be executable
    can_execute, reason = tool_manager.can_execute_tool("test_tool_2")
    assert can_execute is False


def test_can_execute_tool_external_enabled(tool_manager):
    """Test execution check for external tool when access is enabled"""
    # Enable the tool first
    tool_manager.update_tool("test_tool_2", UpdateToolPayload(enabled=True))
    # Enable external access
    new_settings = ExternalToolAccessSettings(
        enabled=True, whitelist=[], require_confirmation=False
    )
    tool_manager.update_external_access_settings(new_settings)

    # Now external tool should be executable
    can_execute, reason = tool_manager.can_execute_tool("test_tool_2")
    assert can_execute is True


def test_can_execute_tool_whitelist(tool_manager):
    """Test execution check with whitelist"""
    # Enable the tool first
    tool_manager.update_tool("test_tool_2", UpdateToolPayload(enabled=True))
    # Enable external access with whitelist
    new_settings = ExternalToolAccessSettings(
        enabled=True, whitelist=["test_tool_2"], require_confirmation=False
    )
    tool_manager.update_external_access_settings(new_settings)

    # Whitelisted tool should be executable
    can_execute, reason = tool_manager.can_execute_tool("test_tool_2")
    assert can_execute is True

    # Create another external tool not in whitelist
    new_tool = CreateToolPayload(
        name="External Tool 3",
        description="Not whitelisted",
        language="python",
        code="pass",
        params={},
        tags=[],
        is_external=True,
        version="1.0.0",
    )
    result = tool_manager.create_tool(new_tool)

    # Non-whitelisted tool should not be executable
    can_execute, reason = tool_manager.can_execute_tool(result.id)
    assert can_execute is False


def test_update_external_access_settings(tool_manager):
    """Test updating external access settings"""
    new_settings = ExternalToolAccessSettings(
        enabled=True, whitelist=["test_tool_2"], require_confirmation=False
    )

    result = tool_manager.update_external_access_settings(new_settings)
    assert result.enabled is True
    assert result.whitelist == ["test_tool_2"]
    assert result.require_confirmation is False

    # Verify settings were persisted
    settings = tool_manager.get_external_access_settings()
    assert settings.enabled is True


def test_tool_persistence(temp_tool_dir):
    """Test that tools persist across manager instances"""
    # Create tool with first manager
    manager1 = ToolManager(config_dir=temp_tool_dir)
    new_tool = CreateToolPayload(
        name="Persistent Tool",
        description="Should persist",
        language="python",
        code="pass",
        params={},
        tags=["persist"],
        is_external=False,
        version="1.0.0",
    )
    created = manager1.create_tool(new_tool)

    # Create new manager and verify tool exists
    manager2 = ToolManager(config_dir=temp_tool_dir)
    tools = manager2.list_tools()
    tool_names = [t.name for t in tools]
    assert "Persistent Tool" in tool_names


def test_external_access_persistence(temp_tool_dir):
    """Test that external access settings persist across manager instances"""
    # Update settings with first manager
    manager1 = ToolManager(config_dir=temp_tool_dir)
    new_settings = ExternalToolAccessSettings(
        enabled=True, whitelist=["test_tool_1"], require_confirmation=False
    )
    manager1.update_external_access_settings(new_settings)

    # Create new manager and verify settings
    manager2 = ToolManager(config_dir=temp_tool_dir)
    settings = manager2.get_external_access_settings()
    assert settings.enabled is True
    assert settings.whitelist == ["test_tool_1"]
    assert settings.require_confirmation is False


def test_tool_code_with_special_characters(tool_manager):
    """Test tool creation with special characters in code"""
    new_tool = CreateToolPayload(
        name="Special Chars Tool",
        description="Tool with special chars",
        language="python",
        code='def test():\n    return "Hello \\"World\\"\' with quotes"',
        params={},
        tags=[],
        is_external=False,
        version="1.0.0",
    )

    result = tool_manager.create_tool(new_tool)
    assert '"Hello \\"World\\"\' with quotes"' in result.code


def test_tool_with_params(tool_manager):
    """Test tool creation with parameters"""
    new_tool = CreateToolPayload(
        name="Param Tool",
        description="Tool with params",
        language="python",
        code="def test(x, y):\n    return x + y",
        params={"x": "int", "y": "int"},
        tags=["math"],
        is_external=False,
        version="1.0.0",
    )

    result = tool_manager.create_tool(new_tool)
    assert result.params == {"x": "int", "y": "int"}


def test_tool_update_partial(tool_manager):
    """Test partial tool update"""
    # Update only description
    update_data = UpdateToolPayload(description="New description only")
    result = tool_manager.update_tool("test_tool_1", update_data)

    # Verify only description changed
    assert result.description == "New description only"
    assert result.name == "Test Tool 1"  # Unchanged
    assert result.language == "python"  # Unchanged
