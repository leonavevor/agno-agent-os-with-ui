"""Cookbook example: Building a progressive disclosure agent with skill composition."""

from textwrap import dedent

from agno.agent import Agent
from agno.models.openai import OpenAIChat

from core import skill_orchestrator

# 1. Progressive Disclosure: Start with minimal context
print("=== Progressive Disclosure Example ===\n")

# Initially build context without any specific skills
initial_context = skill_orchestrator.build_context(
    skill_ids=None,
    include_shared=True,
)

print(f"Initial tools loaded: {len(initial_context.tools)}")
print(f"Initial skills loaded: {len(initial_context.skills)}")
print(f"Instructions length: {len(initial_context.instructions)} chars\n")

# 2. Dynamic Skill Routing: Load skills based on user intent
print("=== Dynamic Skill Routing ===\n")

user_message = (
    "I need to research NVIDIA's latest quarterly earnings and stock performance"
)

# Route skills based on message content
routed_context = skill_orchestrator.route_and_build(
    "web-search-agent",
    message=user_message,
    extra_instructions="Focus on data-driven insights with citations.",
)

print(f"Routed skills: {[skill.name for skill in routed_context.skills]}")
print(f"Total tools available: {len(routed_context.tools)}")
print(f"References loaded: {len(routed_context.references)}\n")

# 3. Skill Composition: Combine multiple skills explicitly
print("=== Skill Composition ===\n")

# Build context with multiple complementary skills
composed_context = skill_orchestrator.build_context(
    skill_ids=["web_search", "finance_research", "agno_docs"],
    extra_instructions=dedent(
        """
        You are a research analyst assistant with access to:
        - Web search for current events and news
        - Financial analysis tools for equity research
        - Documentation search for technical references
        
        Use the appropriate skill for each aspect of the user's request.
        Always cite your sources and provide confidence levels for analyses.
        """
    ),
)

print(f"Composed skills: {[skill.name for skill in composed_context.skills]}")
print(f"Total tools: {len(composed_context.tools)}")
print(f"References: {len(composed_context.references)}")
print(f"Instructions length: {len(composed_context.instructions)} chars\n")

# 4. Agentic RAG: Search references dynamically
print("=== Agentic RAG with Reference Search ===\n")

# Build agent with reference search capability
research_agent = Agent(
    name="Research Agent",
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=composed_context.tools,
    instructions=composed_context.instructions,
    markdown=True,
    add_datetime_to_context=True,
)

print(f"Agent '{research_agent.name}' initialized")
print(
    f"Available tools: {[getattr(t, 'name', type(t).__name__) for t in research_agent.tools]}"
)
print(
    f"Reference search enabled: {'search_skill_references' in [getattr(t, 'name', '') for t in research_agent.tools]}"
)

# Show that references are accessible
if composed_context.references:
    print(f"\nReference files accessible to search tool:")
    for ref in composed_context.references[:5]:  # Show first 5
        print(f"  - {ref.relative_to(ref.parents[2])}")
    if len(composed_context.references) > 5:
        print(f"  ... and {len(composed_context.references) - 5} more")

print("\n=== Example Complete ===")
print(
    "\nKey Principles Demonstrated:"
    "\n1. Progressive Disclosure: Start minimal, load skills on demand"
    "\n2. Dynamic Routing: Match user intent to relevant skills automatically"
    "\n3. Skill Composition: Combine multiple capabilities as needed"
    "\n4. Agentic RAG: Search references at runtime instead of loading everything upfront"
)

# 5. Demonstrate config-driven approach
print("\n=== Config-Driven Agent Initialization ===\n")

# This approach uses skills_config.yaml to define default skills per agent
config_context = skill_orchestrator.build_for_agent(
    "agno-assist",
    extra_instructions="Provide concise answers with code examples when appropriate.",
)

print(f"Agent 'agno-assist' defaults:")
print(f"  Skills: {[skill.name for skill in config_context.skills]}")
print(f"  Tools: {len(config_context.tools)}")
print(f"  Config-driven: Yes (from core/skills_config.yaml)")

# 6. Cache Management
print("\n=== Cache and Reload ===\n")

print("Reloading skill configurations...")
skill_orchestrator.reload_config()
print("✓ Config cache cleared")

print("Reloading shared assets...")
skill_orchestrator.reload_shared_assets()
print("✓ Shared tools and prompts cache cleared")

print("\nAll caches refreshed - new skills and changes will be picked up")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Run this example to see skill-based architecture in action!")
    print("=" * 60)
