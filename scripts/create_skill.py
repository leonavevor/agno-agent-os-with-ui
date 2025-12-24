#!/usr/bin/env python3
"""CLI utility to scaffold new skills using project conventions."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import typer

from core.skills.scaffold import create_skill_package

CONFIG_RELATIVE_PATH = Path("core/skills_config.yaml")

app = typer.Typer(add_completion=False)


@app.command()
def main(
    skill_id: str = typer.Argument(
        ..., help="Identifier for the new skill (snake_case)"
    ),
    name: Optional[str] = typer.Option(None, help="Human readable skill name"),
    description: str = typer.Option(
        "", help="One-line description stored in the manifest"
    ),
    tags: List[str] = typer.Option([], help="Tags to attach to the skill metadata"),
    match_terms: List[str] = typer.Option(
        [], help="Optional routing keywords that should trigger the skill"
    ),
    force: bool = typer.Option(
        False, "--force", help="Overwrite an existing directory if present"
    ),
    register: bool = typer.Option(
        False,
        "--register",
        help="Append the new skill under skills.auto.additional for agno-assist",
    ),
    config_path: Optional[Path] = typer.Option(
        None,
        "--config-path",
        help="Override skills_config.yaml path (defaults to core/skills_config.yaml)",
    ),
) -> None:
    project_root = Path(__file__).resolve().parent.parent

    try:
        skill_path = create_skill_package(
            project_root,
            skill_id=skill_id,
            name=name,
            description=description,
            tags=tags,
            match_terms=match_terms,
            force=force,
        )
    except Exception as exc:  # pragma: no cover - surface to CLI
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    typer.echo(f"Created skill at {skill_path}")

    if register:
        _register_skill(project_root, skill_id, config_path)


def _register_skill(
    project_root: Path, skill_id: str, config_override: Optional[Path]
) -> None:
    config_path = config_override or (project_root / CONFIG_RELATIVE_PATH)
    if not config_path.exists():
        typer.echo(f"Warning: {config_path} not found; skipping registration", err=True)
        return

    import yaml

    data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    agents = data.setdefault("agents", {})
    agno_config = agents.setdefault("agno-assist", {})
    skills_cfg = agno_config.setdefault("skills", {})
    auto_cfg = skills_cfg.setdefault("auto", {})
    additional = auto_cfg.setdefault("additional", [])
    if skill_id not in additional:
        additional.append(skill_id)

    config_path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    typer.echo(f"Registered skill '{skill_id}' under agno-assist auto routing")


if __name__ == "__main__":
    app()
