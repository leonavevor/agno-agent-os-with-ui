"""Unit tests for the skill registry and orchestrator."""

from __future__ import annotations

import textwrap
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from agno.tools.duckduckgo import DuckDuckGoTools

from core import skill_orchestrator
from core.orchestrator import SkillOrchestrator
from core.skills.scaffold import create_skill_package
from app.api.skills import router as skills_router
from scripts import create_skill


def _make_orchestrator() -> SkillOrchestrator:
    project_root = Path(__file__).resolve().parent.parent
    return SkillOrchestrator(
        skills_path=project_root / "skills",
        shared_prompt_path=project_root / "shared" / "prompt.md",
        shared_tools_path=project_root / "shared" / "tools",
        config_path=project_root / "core" / "skills_config.yaml",
    )


def test_skill_registry_catalog_contains_expected_skills() -> None:
    orchestrator = _make_orchestrator()
    skill_ids = {metadata.id for metadata in orchestrator.catalog()}
    assert {"web_search", "agno_docs", "finance_research"}.issubset(skill_ids)


def test_load_skill_returns_tools_and_instructions() -> None:
    orchestrator = _make_orchestrator()
    package = orchestrator.registry.load_skill("web_search")
    assert "Web Search Skill" in package.instructions
    assert any(isinstance(tool, DuckDuckGoTools) for tool in package.tools)


def test_build_context_merges_shared_prompt_and_skills() -> None:
    orchestrator = _make_orchestrator()
    context = orchestrator.build_context(
        skill_ids=["agno_docs", "web_search"],
        extra_instructions="Keep answers short when possible.",
    )

    assert "Shared Operating Principles" in context.instructions
    assert "Agno Documentation Skill" in context.instructions
    assert any(isinstance(tool, DuckDuckGoTools) for tool in context.tools)
    assert any(path.name == "README.md" for path in context.references)


def test_build_for_agent_uses_configuration_defaults() -> None:
    orchestrator = _make_orchestrator()
    context = orchestrator.build_for_agent("web-search-agent")

    assert any(skill.id == "web_search" for skill in context.skills)
    assert "Operate under the codename WebX" in context.instructions


def test_route_skills_prefers_relevant_match_terms() -> None:
    orchestrator = _make_orchestrator()
    matches = orchestrator.route_skills("Need a quick Agno tutorial")

    assert matches
    assert matches[0].id == "agno_docs"


def test_route_and_build_appends_auto_skills_when_message_matches() -> None:
    orchestrator = _make_orchestrator()
    context = orchestrator.route_and_build(
        "web-search-agent",
        message="Find the latest technology news",
    )

    assert any(skill.id == "web_search" for skill in context.skills)


def test_finance_request_triggers_finance_skill() -> None:
    orchestrator = _make_orchestrator()
    context = orchestrator.route_and_build(
        "web-search-agent",
        message="Compare NVDA and AMD valuations",
    )

    assert any(skill.id == "finance_research" for skill in context.skills)


def test_create_skill_package(tmp_path: Path) -> None:
    skill_dir = create_skill_package(
        tmp_path,
        skill_id="demo_skill",
        name="Demo Skill",
        description="Demonstration skill",
        tags=["demo"],
        match_terms=["demo"],
    )

    assert skill_dir.exists()
    assert (skill_dir / "skill.yaml").exists()
    assert (skill_dir / "SKILL.md").exists()
    assert (skill_dir / "tools" / "toolkit.py").exists()
    assert (skill_dir / "refs" / "README.md").exists()


def test_skills_router_endpoints() -> None:
    app = FastAPI()
    app.include_router(skills_router)
    client = TestClient(app)

    response = client.get("/skills")
    assert response.status_code == 200
    assert any(item["id"] == "web_search" for item in response.json())

    route_response = client.post(
        "/skills/route", json={"message": "Compare NVDA and AMD valuations"}
    )
    assert route_response.status_code == 200
    routed_ids = [item["id"] for item in route_response.json()["skills"]]
    assert "finance_research" in routed_ids

    reload_response = client.post("/skills/reload")
    assert reload_response.status_code == 200


def test_shared_tools_registered() -> None:
    shared_tools = skill_orchestrator._load_shared_tools()
    tool_names = {getattr(tool, "name", "") for tool in shared_tools}
    assert {
        "emit_skill_event",
        "current_timestamp",
        "suggest_follow_up_questions",
        "search_skill_references",
    }.issubset(tool_names)


def test_register_skill_updates_config(tmp_path: Path) -> None:
    config_path = tmp_path / "skills_config.yaml"
    config_path.write_text(
        """agents:
  agno-assist:
    skills:
      auto:
        additional: []
""",
        encoding="utf-8",
    )

    create_skill._register_skill(tmp_path, "demo_skill", config_path)

    updated = config_path.read_text(encoding="utf-8")
    assert "demo_skill" in updated

    # Calling again should not duplicate the entry
    create_skill._register_skill(tmp_path, "demo_skill", config_path)
    assert updated == config_path.read_text(encoding="utf-8")


def test_reload_shared_assets_refreshes_prompt_and_tools(tmp_path: Path) -> None:
    shared_dir = tmp_path / "shared"
    tools_dir = shared_dir / "tools"
    tools_dir.mkdir(parents=True)

    prompt_path = shared_dir / "prompt.md"
    prompt_path.write_text("Initial shared prompt", encoding="utf-8")

    toolkit_path = tools_dir / "toolkit.py"
    toolkit_path.write_text(
        textwrap.dedent(
            """
            from agno.tools import tool


            @tool(description="Initial shared helper")
            def initial_shared_tool(agent):
                return "initial"


            TOOLS = [initial_shared_tool]
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )

    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()

    orchestrator = SkillOrchestrator(
        skills_path=skills_dir,
        shared_prompt_path=prompt_path,
        shared_tools_path=tools_dir,
    )

    initial_context = orchestrator.build_context(include_shared=True)
    assert "Initial shared prompt" in initial_context.instructions
    initial_tool_names = {
        getattr(tool, "name", "") for tool in orchestrator._load_shared_tools()
    }
    assert "initial_shared_tool" in initial_tool_names

    prompt_path.write_text("Updated shared prompt", encoding="utf-8")
    toolkit_path.write_text(
        textwrap.dedent(
            """
            from agno.tools import tool


            @tool(description="Updated shared helper")
            def updated_shared_tool(agent):
                return "updated"


            TOOLS = [updated_shared_tool]
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )

    cached_context = orchestrator.build_context(include_shared=True)
    assert "Initial shared prompt" in cached_context.instructions

    orchestrator.reload_shared_assets()

    refreshed_context = orchestrator.build_context(include_shared=True)
    assert "Updated shared prompt" in refreshed_context.instructions
    refreshed_tool_names = {
        getattr(tool, "name", "") for tool in orchestrator._load_shared_tools()
    }
    assert "updated_shared_tool" in refreshed_tool_names


def test_reference_search_tool_bound_to_context() -> None:
    orchestrator = _make_orchestrator()
    context = orchestrator.build_context(skill_ids=["agno_docs"], include_shared=True)

    # Verify search tool is present
    tool_names = {getattr(tool, "name", "") for tool in context.tools}
    assert "search_skill_references" in tool_names

    # Verify references are loaded
    assert len(context.references) > 0
