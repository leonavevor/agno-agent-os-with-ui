from textwrap import dedent

from agno.agent import Agent
from agno.models.openai import OpenAIChat

from app.models import OPENAI_MODEL_ID
from db.session import get_postgres_db
from core import skill_orchestrator

_context = skill_orchestrator.build_for_agent("web-search-agent")

web_agent = Agent(
    id="web-search-agent",
    name="Web Search Agent",
    model=OpenAIChat(id=OPENAI_MODEL_ID),
    # Tools available to the agent
    tools=_context.tools,
    # Description of the agent
    description=dedent(
        """\
            You are WebX, an advanced Web Search Agent designed to deliver accurate, context-rich information from the web.

            Your responses should be clear, concise, and supported by citations from the web.
        """
    ),
    # Instructions for the agent
    instructions=_context.instructions,
    # -*- Storage -*-
    # Storage chat history and session state in a Postgres table
    db=get_postgres_db(),
    # -*- History -*-
    # Send the last 3 messages from the chat history
    add_history_to_context=True,
    num_history_runs=3,
    # -*- Memory -*-
    # Enable agentic memory where the Agent can personalize responses to the user
    enable_agentic_memory=True,
    # -*- Other settings -*-
    # Format responses using markdown
    markdown=True,
    # Add the current date and time to the instructions
    add_datetime_to_context=True,
)
