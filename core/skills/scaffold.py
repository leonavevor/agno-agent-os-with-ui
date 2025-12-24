"""Utilities for scaffolding new skill packages."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


@dataclass(slots=True)
class SkillScaffoldConfig:
    skill_id: str
    name: str
    description: str
    tags: Sequence[str]
    match_terms: Sequence[str]


DEFAULT_SKILL_MD = """# {name}

Describe the workflow, required tools, guardrails, and output format for this skill.
"""

DEFAULT_TOOL_STUB = '"""Custom tools for this skill."""\n\nfrom __future__ import annotations\n\nfrom typing import List\n\n\nclass {class_name}:\n    """Add callable methods decorated with @tool or implement __call__."""\n\n    def __call__(self, query: str) -> str:  # pragma: no cover - stub\n        raise NotImplementedError("Implement tool logic")\n\n\nSKILL_TOOLS = [{class_name}()]\n'


def create_skill_package(
    base_dir: Path,
    *,
    skill_id: str,
    name: str | None = None,
    description: str = "",
    tags: Iterable[str] | None = None,
    match_terms: Iterable[str] | None = None,
    force: bool = False,
) -> Path:
    """Create a new skill package directory under *base_dir/skills*.

    Returns the path to the created skill directory.
    """

    if not skill_id:
        raise ValueError("skill_id must not be empty")

    skill_dir = base_dir / "skills" / skill_id
    if skill_dir.exists() and not force:
        raise FileExistsError(f"Skill directory already exists at {skill_dir}")

    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "tools").mkdir(exist_ok=True)
    (skill_dir / "refs").mkdir(exist_ok=True)

    resolved_name = name or skill_id.replace("_", " ").title()
    scaffold = SkillScaffoldConfig(
        skill_id=skill_id,
        name=resolved_name,
        description=description.strip(),
        tags=tuple(tag.strip() for tag in (tags or []) if tag.strip()),
        match_terms=tuple(
            term.strip().lower() for term in (match_terms or []) if term.strip()
        ),
    )

    _write_manifest(skill_dir, scaffold)
    _write_skill_md(skill_dir, scaffold)
    _write_tool_stub(skill_dir, scaffold)
    _write_refs_placeholder(skill_dir)

    return skill_dir


def _write_manifest(directory: Path, config: SkillScaffoldConfig) -> None:
    manifest_path = directory / "skill.yaml"
    manifest_lines = [
        f"id: {config.skill_id}",
        f"name: {config.name}",
        f"description: {config.description}",
        "tags:",
    ]
    manifest_lines.extend(f"  - {tag}" for tag in config.tags or ("general",))
    manifest_lines.append("match_terms:")
    manifest_lines.extend(
        f"  - {term}" for term in config.match_terms or (config.skill_id,)
    )
    manifest_lines.extend(
        [
            'version: "0.1.0"',
            "instructions: SKILL.md",
            "tools_path: tools",
            "refs_path: refs",
        ]
    )
    manifest_path.write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")


def _write_skill_md(directory: Path, config: SkillScaffoldConfig) -> None:
    (directory / "SKILL.md").write_text(
        DEFAULT_SKILL_MD.format(name=config.name),
        encoding="utf-8",
    )


def _write_tool_stub(directory: Path, config: SkillScaffoldConfig) -> None:
    class_name = f"{config.skill_id.title().replace('_', '')}Tools"
    tool_file = directory / "tools" / "toolkit.py"
    tool_file.write_text(
        DEFAULT_TOOL_STUB.format(class_name=class_name),
        encoding="utf-8",
    )


def _write_refs_placeholder(directory: Path) -> None:
    (directory / "refs" / "README.md").write_text(
        "Add supplementary resources for retrieval or documentation.\n",
        encoding="utf-8",
    )
