"""Finance-oriented tools built on top of Yahoo Finance."""

from __future__ import annotations

from typing import List

from agno.tools.yfinance import YFinanceTools


def get_tools() -> List[object]:
    return [YFinanceTools()]
