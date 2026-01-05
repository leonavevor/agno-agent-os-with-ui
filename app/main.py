"""AgentOS"""

import os
from pathlib import Path

import litellm
from agno.os import AgentOS

from agents.agno_assist import agno_assist
from agents.web_agent import web_agent
from app.api.health import router as health_router
from app.api.memory import router as memory_router
from app.api.mcp_servers import router as mcp_servers_router
from app.api.models import router as models_router
from app.api.references import router as references_router
from app.api.skills import router as skills_router
from app.api.tools import router as tools_router
from app.api.knowledge import router as knowledge_router
from app.api.metrics import router as metrics_router
from app.api.audio import router as audio_router
from app.logging_config import setup_logging
from teams.multilingual_team import multilingual_team
from teams.reasoning_finance_team import reasoning_research_team
from workflows.investment_workflow import investment_workflow
from workflows.research_workflow import research_workflow

# Setup logging with environment-controlled verbosity
log_level = os.getenv("LOG_LEVEL", "INFO")
suppress_health_checks = os.getenv("SUPPRESS_HEALTH_LOGS", "true").lower() == "true"
setup_logging(log_level=log_level, suppress_health_checks=suppress_health_checks)

# Configure LiteLLM to drop unsupported parameters for each provider
litellm.drop_params = True

os_config_path = str(Path(__file__).parent.joinpath("config.yaml"))

# Create the AgentOS
agent_os = AgentOS(
    id="agentos-docker",
    agents=[web_agent, agno_assist],
    teams=[multilingual_team, reasoning_research_team],
    workflows=[investment_workflow, research_workflow],
    # Configuration for the AgentOS
    config=os_config_path,
)
app = agent_os.get_app()

# Store agent_os in app state for access by routers
app.state.agent_os = agent_os

# Include custom API routers for advanced features
app.include_router(health_router)
app.include_router(models_router)
app.include_router(mcp_servers_router)
app.include_router(skills_router)
app.include_router(tools_router)
app.include_router(memory_router)
app.include_router(references_router)
app.include_router(knowledge_router)
app.include_router(metrics_router)
app.include_router(audio_router)

if __name__ == "__main__":
    # Serve the application with custom log config
    from app.logging_config import get_uvicorn_log_config

    agent_os.serve(
        app="main:app",
        reload=True,
        log_config=get_uvicorn_log_config(),
    )
