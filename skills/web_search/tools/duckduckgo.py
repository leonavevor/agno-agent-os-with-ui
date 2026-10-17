"""Select the web-search skill's explicitly configured provider."""

from __future__ import annotations

from os import getenv

from agno.tools.duckduckgo import DuckDuckGoTools


def get_tools() -> list[object]:
    provider = (getenv("WEB_SEARCH_PROVIDER") or "duckduckgo").strip().lower()
    if provider == "duckduckgo":
        return [DuckDuckGoTools()]
    if provider == "parallel":
        from core.parallel_search import ParallelSearchTools

        return [ParallelSearchTools()]
    if provider == "none":
        return []
    raise ValueError("WEB_SEARCH_PROVIDER must be duckduckgo, parallel or none")
