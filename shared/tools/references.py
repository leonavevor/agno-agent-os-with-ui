"""Agentic RAG tool for searching skill references dynamically."""

from __future__ import annotations

from pathlib import Path

from agno.tools import tool


def _search_file_content(file_path: Path, query: str) -> tuple[bool, str]:
    """Search a single file for query terms, returning matches with context."""
    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        query_lower = query.lower()

        if query_lower not in content.lower():
            return False, ""

        # Extract snippet with context
        lines = content.split("\n")
        matching_lines = []

        for i, line in enumerate(lines):
            if query_lower in line.lower():
                # Include context: 1 line before and 1 line after
                start = max(0, i - 1)
                end = min(len(lines), i + 2)
                context_lines = lines[start:end]
                matching_lines.append("\n".join(context_lines))

        if matching_lines:
            snippet = "\n...\n".join(matching_lines[:3])  # Limit to 3 matches
            return True, f"[{file_path.name}]\n{snippet}\n"

        return False, ""
    except Exception:
        return False, ""


@tool(description="Search skill reference documents for relevant information")
def search_skill_references(
    agent, query: str, skill_references: list | None = None
) -> str:
    """
    Search through skill reference files to find information matching the query.

    This tool performs keyword-based search across all reference documents
    loaded for the current skill context. Use it when you need to find
    specific information from documentation, guides, or knowledge artifacts.

    Args:
        query: Search terms or keywords to look for in reference documents
        skill_references: List of reference file paths (injected by orchestrator)

    Returns:
        Formatted search results with file names and matching snippets
    """
    if not query or not query.strip():
        return "Error: Search query cannot be empty"

    if not skill_references or len(skill_references) == 0:
        return "No reference documents available for the current skill context"

    results = []
    query = query.strip()

    for ref_path in skill_references:
        if not ref_path.exists() or not ref_path.is_file():
            continue

        found, snippet = _search_file_content(ref_path, query)
        if found:
            results.append(snippet)

    if not results:
        return f"No matches found for '{query}' in {len(skill_references)} reference document(s)"

    header = f"Found {len(results)} reference(s) matching '{query}':\n\n"
    return header + "\n---\n".join(results)


TOOLS = [search_skill_references]
