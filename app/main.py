"""AgentOS"""

from pathlib import Path

from agno.os import AgentOS

from agents.agno_assist import agno_assist
from agents.web_agent import web_agent
from app.api.health import router as health_router
from app.api.memory import router as memory_router
from app.api.references import router as references_router
from app.api.skills import router as skills_router
from app.api.knowledge import router as knowledge_router
from teams.multilingual_team import multilingual_team
from teams.reasoning_finance_team import reasoning_research_team
from workflows.investment_workflow import investment_workflow
from workflows.research_workflow import research_workflow

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
app.include_router(skills_router)
app.include_router(memory_router)
app.include_router(references_router)
app.include_router(knowledge_router)

if __name__ == "__main__":
    # Serve the application
    agent_os.serve(app="main:app", reload=True)
