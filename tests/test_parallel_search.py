"""Exercise skill selection, Agno dispatch and real MCP framing with scripted I/O."""

from __future__ import annotations

import asyncio
import hashlib
import json
from pathlib import Path

import httpx
import pytest
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.run import RunContext
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.function import FunctionCall
from openai import AsyncOpenAI

from app.api import tools as tools_api
from core import parallel_search
from core.orchestrator import SkillOrchestrator

ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://example.org/research?year=2026#findings"
RUN_CONTEXT = RunContext(run_id="test-run", session_id="persistent-test-conversation")


@pytest.fixture
def permissions(tmp_path, monkeypatch):
    manager = tools_api.ToolManager(tmp_path)
    manager.settings_file.write_text(
        "external_tool_access:\n  enabled: true\n  whitelist: []\n  require_confirmation: false\n"
    )
    monkeypatch.setattr(tools_api, "_manager", manager)
    monkeypatch.delenv("PARALLEL_API_KEY", raising=False)
    monkeypatch.setenv("WEB_SEARCH_PROVIDER", "parallel")
    return manager


def context(config_path=None):
    return SkillOrchestrator(
        skills_path=ROOT / "skills", config_path=config_path or ROOT / "core/skills_config.yaml"
    ).build_for_agent("web-search-agent", include_shared=False)


def selected_tools():
    (toolkit,) = context().tools
    assert isinstance(toolkit, parallel_search.ParallelSearchTools)
    return toolkit


async def dispatch(toolkit, name="parallel_web_search", arguments=None):
    function = toolkit.functions[name]
    function._run_context = RUN_CONTEXT
    function.process_entrypoint()
    call = FunctionCall(
        function=function,
        arguments=arguments or {"objective": "Find research", "search_queries": ["research findings 2026"]},
    )
    assert await call.aexecute()
    return json.loads(call.result)


class MCPFixture:
    """A deterministic MCP server at the HTTP boundary, not a mocked MCP session."""

    def __init__(self, error=False, delay=False, missing=False):
        self.requests = []
        self.error, self.delay, self.missing = error, delay, missing
        self.started = asyncio.Event()
        self.clients = []

    async def handle(self, request):
        self.requests.append(request)
        assert str(request.url) == parallel_search.MCP_URL
        assert request.headers["user-agent"] == parallel_search.USER_AGENT
        if request.method == "GET":
            return httpx.Response(405)
        message = json.loads(request.content)
        method = message["method"]
        if "id" not in message:
            return httpx.Response(202)
        if method == "initialize":
            result = {
                "protocolVersion": message["params"]["protocolVersion"],
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "fixture", "version": "1"},
            }
        elif method == "tools/list":
            result = {
                "tools": []
                if self.missing
                else [{"name": name, "inputSchema": {"type": "object"}} for name in ["web_search", "web_fetch"]]
            }
        elif method == "tools/call":
            self.started.set()
            if self.delay:
                await asyncio.Event().wait()
            result = {
                "content": [
                    {
                        "type": "text",
                        "text": "quota exceeded" if self.error else f"Research finding with citation: {SOURCE_URL}",
                    }
                ],
                "isError": self.error,
            }
        else:
            raise AssertionError(method)
        return httpx.Response(200, json={"jsonrpc": "2.0", "id": message["id"], "result": result})

    def install(self, monkeypatch):
        def client(headers):
            instance = httpx.AsyncClient(headers=headers, transport=httpx.MockTransport(self.handle))
            self.clients.append(instance)
            return instance

        monkeypatch.setattr(parallel_search, "_http_client", client)

    @property
    def calls(self):
        return [
            json.loads(r.content)["params"]
            for r in self.requests
            if r.method == "POST" and json.loads(r.content).get("method") == "tools/call"
        ]


def test_default_saved_skill_choices_and_disabled_search(permissions, monkeypatch, tmp_path):
    monkeypatch.delenv("WEB_SEARCH_PROVIDER")
    assert isinstance(context().tools[0], DuckDuckGoTools)
    monkeypatch.setenv("WEB_SEARCH_PROVIDER", "duckduckgo")
    assert isinstance(context().tools[0], DuckDuckGoTools)
    monkeypatch.setenv("WEB_SEARCH_PROVIDER", "none")
    assert context().tools == []
    monkeypatch.setenv("WEB_SEARCH_PROVIDER", "parallel")
    config = tmp_path / "skills.yaml"
    config.write_text("agents:\n  web-search-agent:\n    skills: []\n")
    assert context(config).tools == []
    config.write_text("agents:\n  web-search-agent:\n    skills: [agno_docs]\n")
    assert [s.id for s in context(config).skills] == ["agno_docs"]
    monkeypatch.setenv("WEB_SEARCH_PROVIDER", "misspelled")
    assert context().tools == []  # Existing loader fails closed, with no DDG fallback.


@pytest.mark.asyncio
async def test_search_fetch_headers_session_and_result_consumption(permissions, monkeypatch):
    server = MCPFixture()
    server.install(monkeypatch)
    toolkit = selected_tools()
    search = await dispatch(toolkit)
    fetch = await dispatch(toolkit, "parallel_web_fetch", {"urls": [SOURCE_URL], "objective": "Verify findings"})
    assert SOURCE_URL in search["content"][0]["text"]
    assert SOURCE_URL in fetch["content"][0]["text"]
    assert not search["isError"] and not fetch["isError"]
    assert [call["name"] for call in server.calls] == ["web_search", "web_fetch"]
    assert server.calls[1]["arguments"]["urls"] == [SOURCE_URL]
    assert {call["arguments"]["session_id"] for call in server.calls} == {
        hashlib.sha256(RUN_CONTEXT.session_id.encode()).hexdigest()
    }
    assert all("authorization" not in request.headers for request in server.requests)


@pytest.mark.asyncio
async def test_explicit_key_preserved(permissions, monkeypatch):
    server = MCPFixture()
    server.install(monkeypatch)
    monkeypatch.setenv("PARALLEL_API_KEY", "configured-test-key")
    await dispatch(selected_tools())
    assert all(r.headers["authorization"] == "Bearer configured-test-key" for r in server.requests)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "policy,message",
    [
        ("enabled: false", "disabled"),
        ("enabled: true\n  whitelist: [other_tool]", "whitelist"),
        ("enabled: true\n  require_confirmation: true", "Confirmation policy changed"),
    ],
)
async def test_permission_changes_block_existing_tool(permissions, monkeypatch, policy, message):
    toolkit = selected_tools()
    permissions.settings_file.write_text("external_tool_access:\n  " + policy + "\n")
    server = MCPFixture()
    server.install(monkeypatch)
    result = await dispatch(toolkit)
    assert message in result["error"]
    assert server.requests == []


@pytest.mark.asyncio
async def test_whitelist_allows_only_selected_operation(permissions, monkeypatch):
    permissions.settings_file.write_text(
        "external_tool_access:\n  enabled: true\n  whitelist: [parallel_web_search]\n  require_confirmation: false\n"
    )
    server = MCPFixture()
    server.install(monkeypatch)
    toolkit = selected_tools()
    assert not (await dispatch(toolkit))["isError"]
    assert "whitelist" in (await dispatch(toolkit, "parallel_web_fetch", {"urls": [SOURCE_URL]}))["error"]
    assert len(server.calls) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "name,arguments",
    [
        ("parallel_web_search", {"objective": "", "search_queries": ["test"]}),
        ("parallel_web_search", {"objective": "test", "search_queries": []}),
        ("parallel_web_fetch", {"urls": ["file:///etc/passwd"]}),
        ("parallel_web_fetch", {"urls": ["https://user:password@example.org"]}),
        ("parallel_web_fetch", {"urls": []}),
        ("parallel_web_fetch", {"urls": [SOURCE_URL] * 21}),
    ],
)
async def test_invalid_inputs_do_not_contact_server(permissions, monkeypatch, name, arguments):
    server = MCPFixture()
    server.install(monkeypatch)
    assert "error" in await dispatch(selected_tools(), name, arguments)
    assert server.requests == []


@pytest.mark.asyncio
async def test_mcp_errors_and_missing_tools(permissions, monkeypatch):
    server = MCPFixture(error=True)
    server.install(monkeypatch)
    result = await dispatch(selected_tools())
    assert result["isError"] and "quota exceeded" in result["content"][0]["text"]
    server = MCPFixture(missing=True)
    server.install(monkeypatch)
    assert "does not advertise" in (await dispatch(selected_tools()))["error"]
    assert server.calls == []


@pytest.mark.asyncio
async def test_transport_failure(permissions, monkeypatch):
    async def fail(request):
        raise httpx.ConnectError("private diagnostic", request=request)

    monkeypatch.setattr(
        parallel_search,
        "_http_client",
        lambda headers: httpx.AsyncClient(headers=headers, transport=httpx.MockTransport(fail)),
    )
    result = await dispatch(selected_tools())
    assert result == {"error": "Parallel MCP request failed. No alternate provider was called."}


@pytest.mark.asyncio
async def test_timeout_and_cancellation(permissions, monkeypatch):
    server = MCPFixture(delay=True)
    server.install(monkeypatch)
    monkeypatch.setattr(parallel_search, "REQUEST_TIMEOUT", 0.05)
    assert "timed out" in (await dispatch(selected_tools()))["error"]
    monkeypatch.setattr(parallel_search, "REQUEST_TIMEOUT", 10)
    server = MCPFixture(delay=True)
    server.install(monkeypatch)
    task = asyncio.create_task(dispatch(selected_tools()))
    await asyncio.wait_for(server.started.wait(), 2)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert all(client.is_closed for client in server.clients)


@pytest.mark.asyncio
@pytest.mark.parametrize("confirmation", [False, True, "reject"])
async def test_scripted_agent_loop_and_confirmation_pause(permissions, monkeypatch, confirmation):
    """Scripted OpenAI responses exercise Agent.arun without real model inference."""
    permissions.settings_file.write_text(
        f"external_tool_access:\n  enabled: true\n  require_confirmation: {str(bool(confirmation)).lower()}\n"
    )
    server = MCPFixture()
    server.install(monkeypatch)
    model_requests = []

    async def model_response(request):
        body = json.loads(request.content)
        model_requests.append(body)
        tools = [message for message in body["messages"] if message["role"] == "tool"]
        if tools and confirmation == "reject":
            assert not server.requests
            message = {"role": "assistant", "content": "Search was declined."}
        elif not tools:
            names = {item["function"]["name"] for item in body["tools"]}
            assert names == {"parallel_web_search", "parallel_web_fetch"}
            message = {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": "search-1",
                        "type": "function",
                        "function": {
                            "name": "parallel_web_search",
                            "arguments": json.dumps(
                                {"objective": "Find research", "search_queries": ["research findings"]}
                            ),
                        },
                    }
                ],
            }
        elif len(tools) == 1:
            result = json.loads(tools[0]["content"])
            assert SOURCE_URL in result["content"][0]["text"]
            message = {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": "fetch-1",
                        "type": "function",
                        "function": {
                            "name": "parallel_web_fetch",
                            "arguments": json.dumps({"urls": [SOURCE_URL], "objective": "Verify the source"}),
                        },
                    }
                ],
            }
        else:
            assert SOURCE_URL in json.loads(tools[1]["content"])["content"][0]["text"]
            message = {"role": "assistant", "content": f"Research finding [source]({SOURCE_URL})."}
        return httpx.Response(
            200,
            json={
                "id": "fixture",
                "object": "chat.completion",
                "created": 1,
                "model": "scripted-fixture",
                "choices": [
                    {
                        "index": 0,
                        "message": message,
                        "finish_reason": "tool_calls" if message.get("tool_calls") else "stop",
                    }
                ],
                "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(model_response)) as client:
        model = OpenAIChat(id="scripted-fixture", async_client=AsyncOpenAI(api_key="test", http_client=client))
        assembled = context()
        agent = Agent(model=model, tools=assembled.tools, instructions=assembled.instructions, telemetry=False)
        response = await agent.arun("Find research and cite it", session_id=RUN_CONTEXT.session_id)
        if confirmation:
            assert response.is_paused
            assert response.requirements[0].needs_confirmation
            assert server.requests == []
            assert len(model_requests) == 1
            while response.is_paused:
                # Agno 2.3.12 continuations expose each newly paused call in
                # RunOutput.tools; requirements may also retain earlier calls.
                for pending in response.tools:
                    if pending.requires_confirmation and pending.result is None:
                        pending.confirmed = confirmation != "reject"
                response = await agent.acontinue_run(response)
    if confirmation == "reject":
        assert response.content == "Search was declined."
        assert server.requests == []
        assert len(model_requests) == 2
    else:
        assert SOURCE_URL in response.content
        assert [call["name"] for call in server.calls] == ["web_search", "web_fetch"]
        assert len(model_requests) == 3
