"""Skill registry responsible for discovery and lazy loading."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

import yaml

from ..loaders.ref_loader import load_references_from_dir
from ..loaders.tool_loader import load_tools_from_dir
from .models import SkillMetadata, SkillPackage


class SkillRegistry:
    """Discover skills on disk and resolve them on demand."""

    def __init__(self, root: Path):
        self._root = root
        self._catalog: Dict[str, SkillMetadata] = {}
        self._package_cache: Dict[str, SkillPackage] = {}
        self._discover()

    @property
    def root(self) -> Path:
        return self._root

    def _discover(self) -> None:
        if not self._root.exists():
            return
        for path in sorted(self._root.iterdir()):
            if not path.is_dir():
                continue
            manifest = path / "skill.yaml"
            if not manifest.exists():
                continue
            metadata = self._parse_manifest(manifest)
            if metadata.id in self._catalog:
                raise ValueError(f"Duplicate skill id detected: {metadata.id}")
            self._catalog[metadata.id] = metadata

    def _parse_manifest(self, manifest_path: Path) -> SkillMetadata:
        data = yaml.safe_load(manifest_path.read_text(encoding="utf-8")) or {}
        if "id" not in data:
            raise ValueError(f"Skill manifest {manifest_path} missing 'id'")

        tags: Sequence[str] = tuple(str(tag) for tag in (data.get("tags", []) or []))
        match_terms: Sequence[str] = tuple(
            str(term).lower() for term in (data.get("match_terms", []) or [])
        )

        metadata = SkillMetadata(
            id=str(data["id"]),
            name=str(data.get("name", data["id"])),
            description=str(data.get("description", "")),
            root=manifest_path.parent,
            tags=tuple(tags),
            match_terms=tuple(match_terms),
            version=str(data["version"]) if data.get("version") else None,
        )

        instructions_rel = Path(data.get("instructions", metadata.instructions_relpath))
        tools_rel = Path(data.get("tools_path", metadata.tools_relpath))
        refs_rel = Path(data.get("refs_path", metadata.refs_relpath))

        return replace(
            metadata,
            instructions_relpath=instructions_rel,
            tools_relpath=tools_rel,
            refs_relpath=refs_rel,
        )

    def list_metadata(self) -> List[SkillMetadata]:
        return sorted(self._catalog.values(), key=lambda item: item.id)

    def get_metadata(self, skill_id: str) -> SkillMetadata:
        if skill_id not in self._catalog:
            raise KeyError(f"Unknown skill id: {skill_id}")
        return self._catalog[skill_id]

    def load_skill(self, skill_id: str) -> SkillPackage:
        if skill_id in self._package_cache:
            return self._package_cache[skill_id]

        metadata = self.get_metadata(skill_id)

        instructions_path = metadata.root / metadata.instructions_relpath
        if not instructions_path.exists():
            raise FileNotFoundError(
                f"Skill {skill_id} missing instructions file at {instructions_path}"
            )
        instructions = instructions_path.read_text(encoding="utf-8").strip()

        tools_dir = metadata.root / metadata.tools_relpath
        tools = load_tools_from_dir(tools_dir)

        refs_dir = metadata.root / metadata.refs_relpath
        references = load_references_from_dir(refs_dir)

        package = SkillPackage(
            metadata=metadata,
            instructions=instructions,
            tools=tools,
            references=references,
        )
        self._package_cache[skill_id] = package
        return package

    def ensure_skills(self, skill_ids: Iterable[str]) -> None:
        for skill_id in skill_ids:
            self.get_metadata(skill_id)

    def reload(self) -> None:
        """Clear discovery caches so changes on disk are reloaded."""

        self._catalog.clear()
        self._package_cache.clear()
        self._discover()
