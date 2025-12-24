"""DuckDuckGo-powered search toolkit for web intelligence."""

from __future__ import annotations

from typing import List

from agno.tools.duckduckgo import DuckDuckGoTools


def get_tools() -> List[object]:
    return [DuckDuckGoTools()]
