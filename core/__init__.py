"""Core orchestration helpers for skill-driven agents."""

from pathlib import Path

from .orchestrator import SkillOrchestrator
from .skills import AgentContext, SkillMetadata, SkillPackage, SkillRegistry

__all__ = [
    "AgentContext",
    "SkillMetadata",
    "SkillPackage",
    "SkillRegistry",
    "SkillOrchestrator",
    "skill_orchestrator",
]


_CORE_DIR = Path(__file__).resolve().parent
_BASE_DIR = _CORE_DIR.parent
_SKILLS_PATH = _BASE_DIR / "skills"
_SHARED_PROMPT_PATH = _BASE_DIR / "shared" / "prompt.md"
_SHARED_TOOLS_PATH = _BASE_DIR / "shared" / "tools"
_SKILLS_CONFIG_PATH = _CORE_DIR / "skills_config.yaml"

skill_orchestrator = SkillOrchestrator(
    skills_path=_SKILLS_PATH,
    shared_prompt_path=_SHARED_PROMPT_PATH,
    shared_tools_path=_SHARED_TOOLS_PATH,
    config_path=_SKILLS_CONFIG_PATH,
)
