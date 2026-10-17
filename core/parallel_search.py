"""Permission-aware Agno tools backed by Parallel's Streamable HTTP MCP server."""

from __future__ import annotations

import asyncio
import hashlib
import json
from os import getenv
from urllib.parse import urlsplit

import httpx
from agno.run import RunContext
from agno.tools import Toolkit
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from mcp.shared.exceptions import McpError

from app.api.tools import get_manager

MCP_URL = "https://search.parallel.ai/mcp"
USER_AGENT = "agno-agent-os-with-ui/1.0 (https://github.com/leonavevor/agno-agent-os-with-ui)"
REQUEST_TIMEOUT = 30.0


def _http_client(headers: dict[str, str]) -> httpx.AsyncClient:
    return httpx.AsyncClient(headers=headers, timeout=REQUEST_TIMEOUT)


class ParallelSearchTools(Toolkit):
    """Connect only when selected and called; never change provider on failure.

    External-access settings are checked for every call. Confirmation is handled
    by Agno's normal paused-run mechanism, before the tool entrypoint executes.
    """

    def __init__(self) -> None:
        self._confirmation_required = get_manager().get_external_access_settings().require_confirmation
        names = ["parallel_web_search", "parallel_web_fetch"]
        super().__init__(
            name="parallel_search",
            tools=[self.parallel_web_search, self.parallel_web_fetch],
            requires_confirmation_tools=names if self._confirmation_required else [],
        )

    async def parallel_web_search(self, run_context: RunContext, objective: str, search_queries: list[str]) -> str:
        """Search the web with Parallel. Use returned source URLs to cite findings.

        Args:
            objective: A focused description of the information to find.
            search_queries: One or more concise keyword queries for that goal.
        """
        if not objective.strip() or not search_queries or any(not query.strip() for query in search_queries):
            return json.dumps({"error": "Provide an objective and at least one nonempty search query."})
        return await self._call("web_search", {"objective": objective, "search_queries": search_queries}, run_context)

    async def parallel_web_fetch(self, run_context: RunContext, urls: list[str], objective: str = "") -> str:
        """Fetch excerpts from source pages with Parallel; preserve URLs in citations.

        Args:
            urls: Between one and twenty HTTP or HTTPS source URLs.
            objective: Optional focus for excerpts, at most 200 characters.
        """
        if not 1 <= len(urls) <= 20 or len(objective) > 200:
            return json.dumps({"error": "Provide 1-20 URLs and an objective of at most 200 characters."})
        for url in urls:
            try:
                parsed = urlsplit(url)
                valid = (
                    parsed.scheme in ("http", "https")
                    and parsed.hostname
                    and not parsed.username
                    and not parsed.password
                )
            except ValueError:
                valid = False
            if not valid:
                return json.dumps({"error": "Only HTTP or HTTPS URLs without embedded credentials are supported."})
        arguments: dict[str, object] = {"urls": urls}
        if objective:
            arguments["objective"] = objective
        return await self._call("web_fetch", arguments, run_context)

    async def _call(self, name: str, arguments: dict[str, object], run_context: RunContext) -> str:
        settings = get_manager().get_external_access_settings()
        tool_id = "parallel_" + name
        if not settings.enabled:
            return json.dumps({"error": "External tool access is disabled."})
        if settings.whitelist and tool_id not in settings.whitelist:
            return json.dumps({"error": f"{tool_id} is not in the external tool whitelist."})
        if settings.require_confirmation and not self._confirmation_required:
            return json.dumps({"error": "Confirmation policy changed; reload skills or restart before using Parallel."})

        # A stable conversation identifier shared by search and fetch. Do not send
        # raw user/session identifiers or let the model choose this metadata.
        arguments = {**arguments, "session_id": hashlib.sha256(run_context.session_id.encode()).hexdigest()}
        headers = {"User-Agent": USER_AGENT}
        api_key = getenv("PARALLEL_API_KEY")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        try:
            async with (
                asyncio.timeout(REQUEST_TIMEOUT),
                _http_client(headers) as client,
                streamable_http_client(MCP_URL, http_client=client) as (read, write, _),
                ClientSession(read, write) as session,
            ):
                await session.initialize()
                available = await session.list_tools()
                if name not in {item.name for item in available.tools}:
                    return json.dumps({"error": f"Parallel MCP does not advertise {name}."})
                result = await session.call_tool(name, arguments)
                # Keep text, structured results, URLs and the MCP error
                # flag intact for the agent's downstream consumption.
                return result.model_dump_json(exclude_none=True)
        except TimeoutError:
            return json.dumps({"error": "Parallel MCP request timed out."})
        except (ExceptionGroup, httpx.HTTPError, McpError):
            # Cancellation (BaseException) propagates through MCP cleanup. Avoid
            # leaking transport diagnostics or credentials into model context.
            return json.dumps({"error": "Parallel MCP request failed. No alternate provider was called."})
