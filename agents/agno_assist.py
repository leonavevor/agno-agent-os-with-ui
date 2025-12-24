from textwrap import dedent

from agno.agent import Agent
from agno.knowledge import Knowledge
from agno.knowledge.embedder.openai import OpenAIEmbedder
from agno.models.openai import OpenAIChat
from agno.vectordb.pgvector import PgVector, SearchType

from app.models import OPENAI_EMBEDDER_MODEL_ID, OPENAI_MODEL_ID
from db.session import db_url, get_postgres_db
from core import skill_orchestrator

_context = skill_orchestrator.build_for_agent("agno-assist")

agno_assist = Agent(
    id="agno-assist",
    name="Agno Assist",
    model=OpenAIChat(id=OPENAI_MODEL_ID),
    # Tools available to the agent
    tools=_context.tools,
    # Description of the agent
    description=dedent(
        """\
        You are AgnoAssist, an advanced AI Agent specializing in Agno: a lightweight framework for building multi-modal, reasoning Agents.

        Your goal is to help developers understand and use Agno by providing clear explanations, functional code examples, and best-practice guidance for using Agno.
    """
    ),
    # Instructions for the agent
    instructions=_context.instructions,
    # -*- Knowledge -*-
    # Add the knowledge base to the agent
    knowledge=Knowledge(
        contents_db=get_postgres_db(),
        vector_db=PgVector(
            db_url=db_url,
            table_name="agno_assist_knowledge",
            search_type=SearchType.hybrid,
            embedder=OpenAIEmbedder(id=OPENAI_EMBEDDER_MODEL_ID),
        ),
    ),
    # Give the agent a tool to search the knowledge base (this is True by default but set here for clarity)
    search_knowledge=True,
    # -*- Storage -*-
    # Storage chat history and session state in a Postgres table
    db=get_postgres_db(),
    # -*- History -*-
    # Send the last 3 messages from the chat history
    add_history_to_context=True,
    num_history_runs=3,
    # Add a tool to read the chat history if needed
    read_chat_history=True,
    # -*- Memory -*-
    # Enable agentic memory where the Agent can personalize responses to the user
    enable_agentic_memory=True,
    # -*- Other settings -*-
    # Format responses using markdown
    markdown=True,
    # Add the current date and time to the instructions
    add_datetime_to_context=True,
)

if __name__ == "__main__":
    # Add knowledge to Agno Assist agent
    if agno_assist.knowledge:
        agno_assist.knowledge.add_content(
            name="Agno Docs",
            url="https://docs.agno.com/llms.txt",
        )
