"""Utility helpers for dynamically loading tool callables from skill packages."""

from __future__ import annotations

import hashlib
import importlib
import importlib.util
import inspect
import sys
from pathlib import Path
from types import ModuleType
from typing import Any, List


def load_tools_from_dir(directory: Path) -> List[Any]:
    """Import every Python module in *directory* and aggregate tool callables.

    Modules can expose tools in three different ways:
    - provide a ``get_tools`` callable that returns an iterable of tool instances
    - define ``SKILL_TOOLS`` or ``TOOLS`` iterables
    - declare tool classes ending with ``Tools`` (these are instantiated without args)

    Empty or missing directories are ignored gracefully.
    """

    tools: List[Any] = []

    if not directory.exists() or not directory.is_dir():
        return tools

    for file_path in sorted(directory.glob("*.py")):
        if file_path.name.startswith("__"):
            continue
        module = _import_module_from_path(file_path)
        if module is None:
            continue
        tools.extend(_extract_tools(module))

    return tools


def _import_module_from_path(path: Path) -> ModuleType | None:
    try:
        source_bytes = path.read_bytes()
    except FileNotFoundError:
        return None

    digest = hashlib.blake2s(source_bytes, digest_size=12).hexdigest()
    module_name = f"skill_module_{path.stem}_{digest}"
    pycache_dir = path.parent / "__pycache__"
    if pycache_dir.exists():
        for pycache_file in pycache_dir.glob(f"{path.stem}.*.pyc"):
            try:
                pycache_file.unlink()
            except OSError:
                continue
    importlib.invalidate_caches()
    if module_name in sys.modules:
        del sys.modules[module_name]
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        return None

    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)  # type: ignore[assignment]
    except Exception:
        return None
    return module


def _normalize_tools(result: Any) -> List[Any]:
    if result is None:
        return []
    if isinstance(result, (list, tuple, set)):
        return [tool for tool in result if tool is not None]
    return [result]


def _extract_tools(module: ModuleType) -> List[Any]:
    if hasattr(module, "get_tools") and callable(module.get_tools):  # type: ignore[attr-defined]
        try:
            return _normalize_tools(module.get_tools())  # type: ignore[attr-defined]
        except Exception:
            return []

    for attr_name in ("SKILL_TOOLS", "TOOLS"):
        if hasattr(module, attr_name):
            return _normalize_tools(getattr(module, attr_name))

    tools: List[Any] = []
    for _, value in inspect.getmembers(module):
        if isinstance(value, list):
            continue
        if _looks_like_tool_instance(value):
            tools.append(value)
        elif inspect.isclass(value) and value.__name__.endswith("Tools"):
            try:
                tools.append(value())
            except Exception:
                continue
    return tools


def _looks_like_tool_instance(obj: Any) -> bool:
    """Best-effort check to avoid importing unrelated globals."""

    if obj is None:
        return False
    obj_type = type(obj)
    name = obj_type.__name__
    if name.endswith("Tools"):
        return True
    module_name = getattr(obj_type, "__module__", "")
    return module_name.startswith("agno.tools")
