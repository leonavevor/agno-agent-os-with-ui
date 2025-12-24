"""High-level orchestrator that assembles agent contexts from skills."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

import yaml

from .loaders.tool_loader import load_tools_from_dir
from .skills import AgentContext, SkillMetadata, SkillRegistry, SkillRouter


class SkillOrchestrator:
    """Aggregate shared prompts, tools, and skill packages on demand."""

    def __init__(
        self,
        skills_path: Path,
        shared_prompt_path: Path | None = None,
        shared_tools_path: Path | None = None,
        config_path: Path | None = None,
    ) -> None:
        self._registry = SkillRegistry(skills_path)
        self._shared_prompt_path = shared_prompt_path
        self._shared_tools_path = shared_tools_path
        self._shared_prompt_cache: Optional[str] = None
        self._shared_tools_cache: Optional[List[object]] = None
        self._config_path = config_path
        self._config_cache: Optional[Dict[str, Any]] = None
        self._router: Optional[SkillRouter] = None

    @property
    def registry(self) -> SkillRegistry:
        return self._registry

    def catalog(self) -> Sequence[SkillMetadata]:
        return self._registry.list_metadata()

    def build_for_agent(
        self,
        agent_id: str,
        *,
        message: str | None = None,
        fallback_skill_ids: Iterable[str] | None = None,
        extra_instructions: str | None = None,
        extra_tools: Iterable[object] | None = None,
        include_shared: bool | None = None,
    ) -> AgentContext:
        """Build a context based on declarative agent configuration."""

        config = self._load_config()
        agent_config = config.get("agents", {}).get(agent_id, {})

        skills_config = agent_config.get("skills")
        skill_ids = self._resolve_skill_ids(
            skills_config, message=message, fallback_skill_ids=fallback_skill_ids
        )

        include_shared_flag = agent_config.get("include_shared")
        resolved_include_shared = (
            include_shared
            if include_shared is not None
            else (True if include_shared_flag is None else bool(include_shared_flag))
        )

        merged_instructions: List[str] = []
        agent_extra = str(agent_config.get("extra_instructions", "")).strip()
        if agent_extra:
            merged_instructions.append(agent_extra)
        if extra_instructions:
            cleaned = extra_instructions.strip()
            if cleaned:
                merged_instructions.append(cleaned)

        merged_tools: List[object] = []
        if extra_tools:
            merged_tools.extend(extra_tools)

        extra_payload = "\n\n".join(merged_instructions) or None

        return self.build_context(
            skill_ids=skill_ids,
            extra_instructions=extra_payload,
            extra_tools=merged_tools or None,
            include_shared=resolved_include_shared,
        )

    def route_and_build(
        self,
        agent_id: str,
        message: str,
        *,
        fallback_skill_ids: Iterable[str] | None = None,
        extra_instructions: str | None = None,
        extra_tools: Iterable[object] | None = None,
        include_shared: bool | None = None,
    ) -> AgentContext:
        return self.build_for_agent(
            agent_id,
            message=message,
            fallback_skill_ids=fallback_skill_ids,
            extra_instructions=extra_instructions,
            extra_tools=extra_tools,
            include_shared=include_shared,
        )

    def build_context(
        self,
        skill_ids: Iterable[str] | None = None,
        extra_instructions: str | None = None,
        extra_tools: Iterable[object] | None = None,
        include_shared: bool = True,
    ) -> AgentContext:
        instructions_parts: List[str] = []
        collected_tools: List[object] = []
        collected_references: List[Path] = []
        loaded_skills: List[SkillMetadata] = []

        if include_shared:
            shared_prompt = self._load_shared_prompt()
            if shared_prompt:
                instructions_parts.append(shared_prompt)
            collected_tools.extend(self._load_shared_tools())
            # Bind collected references to search tool for agentic RAG
            self._bind_references_to_tools(collected_tools, collected_references)

        if skill_ids:
            for skill_id in skill_ids:
                package = self._registry.load_skill(skill_id)
                loaded_skills.append(package.metadata)
                if package.instructions:
                    instructions_parts.append(package.instructions)
                if package.tools:
                    collected_tools.extend(package.tools)
                if package.references:
                    collected_references.extend(package.references)

        if extra_instructions:
            cleaned = extra_instructions.strip()
            if cleaned:
                instructions_parts.append(cleaned)

        if extra_tools:
            collected_tools.extend(extra_tools)

        # Final reference binding after all tools collected
        self._bind_references_to_tools(collected_tools, collected_references)

        instructions = "\n\n".join(part for part in instructions_parts if part).strip()

        return AgentContext(
            instructions=instructions,
            tools=collected_tools,
            references=collected_references,
            skills=loaded_skills,
        )

    def reload_config(self) -> None:
        """Clear cached configuration so changes on disk are picked up."""

        self.reload_shared_assets()
        self._config_cache = None
        self._router = None
        self._registry.reload()

    def reload_shared_assets(self) -> None:
        """Invalidate shared prompt and tool caches."""

        self._shared_prompt_cache = None
        self._shared_tools_cache = None

    def route_skills(
        self,
        message: str,
        *,
        limit: int | None = None,
        tags: Iterable[str] | None = None,
        min_score: float = 0.0,
    ) -> List[SkillMetadata]:
        router = self._ensure_router()
        return router.route(message, limit=limit, tags=tags, min_score=min_score)

    def _load_shared_prompt(self) -> str:
        if not self._shared_prompt_path:
            return ""
        if self._shared_prompt_cache is None:
            if self._shared_prompt_path.exists():
                self._shared_prompt_cache = self._shared_prompt_path.read_text(
                    encoding="utf-8"
                ).strip()
            else:
                self._shared_prompt_cache = ""
        return self._shared_prompt_cache

    def _load_shared_tools(self) -> List[object]:
        if not self._shared_tools_path:
            return []
        if self._shared_tools_cache is None:
            self._shared_tools_cache = load_tools_from_dir(self._shared_tools_path)
        return list(self._shared_tools_cache)

    def _load_config(self) -> Dict[str, Any]:
        if not self._config_path:
            return {}
        if self._config_cache is None:
            if self._config_path.exists():
                data = (
                    yaml.safe_load(self._config_path.read_text(encoding="utf-8")) or {}
                )
                if not isinstance(data, dict):
                    raise ValueError(
                        "skills_config.yaml must contain a mapping at the root"
                    )
                self._config_cache = data
            else:
                self._config_cache = {}
        return self._config_cache

    def _ensure_router(self) -> SkillRouter:
        if self._router is None:
            self._router = SkillRouter(self._registry)
        return self._router

    def _bind_references_to_tools(
        self, tools: List[object], references: List[Path]
    ) -> None:
        """Inject reference paths into search_skill_references tool for agentic RAG."""
        for tool in tools:
            if hasattr(tool, "name") and tool.name == "search_skill_references":
                # Bind references to tool parameters for runtime access
                if hasattr(tool, "entrypoint") and callable(tool.entrypoint):
                    original_fn = tool.entrypoint

                    def wrapped_fn(agent, query: str) -> str:
                        return original_fn(agent, query, skill_references=references)

                    tool.entrypoint = wrapped_fn
                break

    def _resolve_skill_ids(
        self,
        skills_config: Any,
        *,
        message: str | None,
        fallback_skill_ids: Iterable[str] | None,
    ) -> List[str] | None:
        skill_ids: List[str] = []

        if isinstance(skills_config, (list, tuple)):
            skill_ids.extend(str(skill_id) for skill_id in skills_config)
        elif isinstance(skills_config, dict):
            defaults = skills_config.get("default") or []
            skill_ids.extend(str(skill_id) for skill_id in defaults)

            auto_cfg = skills_config.get("auto") or {}
            if auto_cfg and message:
                if isinstance(auto_cfg, dict) and auto_cfg.get("enabled", True):
                    limit = auto_cfg.get("limit")
                    limit_value = int(limit) if isinstance(limit, int) else None
                    tags = auto_cfg.get("tags")
                    min_score = float(auto_cfg.get("min_score", 0.0))
                    routed = self.route_skills(
                        message,
                        limit=limit_value,
                        tags=tags,
                        min_score=min_score,
                    )
                    for metadata in routed:
                        if metadata.id not in skill_ids:
                            skill_ids.append(metadata.id)
            additional = (
                auto_cfg.get("additional") if isinstance(auto_cfg, dict) else None
            )
            if additional:
                for skill_id in additional:
                    if skill_id and skill_id not in skill_ids:
                        skill_ids.append(str(skill_id))
        elif (
            isinstance(skills_config, str)
            and skills_config.lower() == "auto"
            and message
        ):
            routed = self.route_skills(message)
            skill_ids.extend(metadata.id for metadata in routed)

        if not skill_ids and fallback_skill_ids is not None:
            skill_ids.extend(str(skill_id) for skill_id in fallback_skill_ids)

        return skill_ids or None
