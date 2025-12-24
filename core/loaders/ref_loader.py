"""Helpers for collecting passive reference assets shipped with skills."""

from __future__ import annotations

from pathlib import Path
from typing import List


def load_references_from_dir(directory: Path) -> List[Path]:
    """Return every file path inside *directory* (recursively).

    The loader keeps paths as ``Path`` objects so that calling code can
    decide how and when to open the resources (for example, embedding them
    into a vector store on first use).
    """

    if not directory.exists() or not directory.is_dir():
        return []

    references: List[Path] = []
    for path in sorted(directory.rglob("*")):
        if path.is_file():
            references.append(path)
    return references
