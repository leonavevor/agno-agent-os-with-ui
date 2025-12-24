"""
Advanced patterns: Memory, Validation, and Vector RAG

Demonstrates the complete 2025 agentic architecture:
- Session-based persistent memory
- Self-healing validation loops
- Vector-powered semantic search
"""

import json
import os
from pathlib import Path

from agno.agent import Agent
from pydantic import BaseModel, Field

from core.memory_manager import MemoryManager
from core.orchestrator import SkillOrchestrator
from core.validation_loop import validate_response
from shared.tools.vector_references import VectorReferenceStore, get_vector_store

# Initialize components
BASE_DIR = Path(__file__).parent.parent.parent
orchestrator = SkillOrchestrator(
    skills_path=BASE_DIR / "skills",
    shared_prompt_path=BASE_DIR / "shared" / "prompt.md",
    shared_tools_path=BASE_DIR / "shared" / "tools",
    config_path=BASE_DIR / "app" / "config.yaml",
)

memory_manager = MemoryManager()


# ==============================================================================
# 1. SESSION-BASED PERSISTENT MEMORY
# ==============================================================================
def demo_persistent_memory():
    """Demonstrate chat history and learned facts across sessions."""
    print("=" * 80)
    print("1. PERSISTENT MEMORY DEMONSTRATION")
    print("=" * 80)

    session_id = "demo_session_001"
    user_id = "demo_user"

    # Initialize session
    memory_manager.initialize_session(session_id, user_id=user_id)
    print(f"✓ Initialized session: {session_id}\n")

    # Add conversation history
    memory_manager.add_message(
        session_id, "user", "I prefer concise technical explanations"
    )
    memory_manager.add_message(
        session_id, "assistant", "Noted! I'll keep responses technical and brief."
    )
    memory_manager.add_message(
        session_id, "user", "What's the difference between Agent and Workflow?"
    )

    # Store learned facts
    learned_facts = json.dumps(
        {
            "communication_style": "technical",
            "verbosity": "concise",
            "topics_discussed": ["agent_vs_workflow"],
        }
    )
    memory_manager.update_learned_facts(session_id, learned_facts)

    # Retrieve history
    history = memory_manager.get_chat_history(session_id, limit=10)
    print(f"📝 Chat History ({len(history)} messages):")
    for msg in history:
        role_icon = "👤" if msg["role"] == "user" else "🤖"
        print(f"  {role_icon} {msg['role']}: {msg['content'][:60]}...")

    # Retrieve learned facts
    facts = memory_manager.get_learned_facts(session_id)
    print(f"\n🧠 Learned Facts:\n  {facts}\n")

    return session_id


# ==============================================================================
# 2. SELF-HEALING VALIDATION LOOP
# ==============================================================================
class MarketAnalysis(BaseModel):
    """Structured response schema for market analysis."""

    ticker: str = Field(..., min_length=1)
    current_price: float = Field(..., gt=0)
    recommendation: str = Field(..., pattern="^(buy|hold|sell)$")
    confidence: float = Field(..., ge=0.0, le=1.0)
    key_risks: list[str] = Field(..., min_length=1)


def demo_validation_loop():
    """Demonstrate Pydantic validation with self-healing retry."""
    print("=" * 80)
    print("2. SELF-HEALING VALIDATION LOOP")
    print("=" * 80)

    # Build agent with finance skill
    context = orchestrator.build_for_agent(
        "agno-assist",
        message="Analyze NVIDIA stock",
    )

    agent = Agent(
        name="MarketAnalyst",
        model="openai:gpt-4",
        instructions=context.instructions,
        tools=context.tools,
        markdown=True,
    )

    # Get unstructured response
    response = agent.run(
        """Analyze NVIDIA stock. Format your response as JSON with:
        - ticker (string)
        - current_price (number > 0)
        - recommendation (must be 'buy', 'hold', or 'sell')
        - confidence (number between 0 and 1)
        - key_risks (array of strings, at least 1 risk)"""
    )

    print("📤 Raw LLM Response:")
    print(f"  {response.content[:200]}...\n")

    # Validate with retry mechanism
    try:
        validated = validate_response(
            agent,
            response.content,
            MarketAnalysis,
            max_retries=2,
        )

        print("✓ Validation Successful!")
        print(f"  Ticker: {validated.ticker}")
        print(f"  Price: ${validated.current_price:.2f}")
        print(f"  Recommendation: {validated.recommendation.upper()}")
        print(f"  Confidence: {validated.confidence:.0%}")
        print(f"  Key Risks: {', '.join(validated.key_risks[:2])}...\n")

    except Exception as e:
        print(f"❌ Validation Failed: {e}\n")


# ==============================================================================
# 3. VECTOR-POWERED SEMANTIC RAG
# ==============================================================================
def demo_vector_rag():
    """Demonstrate semantic search with vector embeddings."""
    print("=" * 80)
    print("3. VECTOR-POWERED SEMANTIC RAG")
    print("=" * 80)

    # Check if OpenAI API key is available
    if not os.environ.get("OPENAI_API_KEY"):
        print("⚠️  Skipping vector RAG demo (OPENAI_API_KEY not set)\n")
        return

    # Get vector store
    store = get_vector_store()

    # Embed skill references
    skill_id = "agno_docs"
    skill_refs = list((BASE_DIR / "skills" / skill_id / "refs").glob("*.md"))

    if skill_refs:
        print(f"📚 Embedding {len(skill_refs)} reference documents...")
        chunks_indexed = store.embed_references(skill_id, skill_refs, chunk_size=800)
        print(f"✓ Indexed {chunks_indexed} chunks\n")

        # Perform semantic search
        queries = [
            "How do I add tools to an agent?",
            "What's the difference between memory and storage?",
            "How to use structured outputs?",
        ]

        for query in queries:
            print(f"🔍 Query: {query}")
            results = store.search(query, skill_id=skill_id, limit=2)

            if results:
                for i, result in enumerate(results, 1):
                    similarity = result["similarity"]
                    content_preview = result["content"][:150].replace("\n", " ")
                    file_name = Path(result["file_path"]).name

                    print(f"  [{i}] {file_name} (similarity: {similarity:.2f})")
                    print(f"      {content_preview}...\n")
            else:
                print("  No results found\n")
    else:
        print("⚠️  No reference documents found for embedding\n")


# ==============================================================================
# 4. INTEGRATED WORKFLOW
# ==============================================================================
def demo_integrated_workflow():
    """Demonstrate all components working together."""
    print("=" * 80)
    print("4. INTEGRATED WORKFLOW")
    print("=" * 80)

    session_id = "demo_integrated"
    memory_manager.initialize_session(session_id)

    # 1. Load context with memory-aware instructions
    history = memory_manager.get_chat_history(session_id, limit=5)
    history_summary = (
        "\n".join(f"{msg['role']}: {msg['content']}" for msg in history[-3:])
        if history
        else "No prior conversation"
    )

    context = orchestrator.build_for_agent(
        "agno-assist",
        message="Help me build an agent with memory",
        extra_instructions=f"Recent conversation:\n{history_summary}",
    )

    # 2. Create agent
    agent = Agent(
        name="IntegratedAssistant",
        model="openai:gpt-4",
        instructions=context.instructions,
        tools=context.tools,
    )

    # 3. Get response
    user_message = "Show me a code example for an agent with memory"
    memory_manager.add_message(session_id, "user", user_message)

    response = agent.run(user_message)
    memory_manager.add_message(session_id, "assistant", response.content)

    print("✓ Complete workflow executed:")
    print("  → Memory retrieved from PostgreSQL")
    print("  → Context built with progressive disclosure")
    print("  → Response generated and stored")
    print(
        f"  → Session now has {len(memory_manager.get_chat_history(session_id))} messages\n"
    )


# ==============================================================================
# MAIN
# ==============================================================================
if __name__ == "__main__":
    print("\n🚀 ADVANCED AGENTIC PATTERNS DEMO\n")

    # Clean up test session if exists
    try:
        memory_manager.clear_session("demo_session_001")
        memory_manager.clear_session("demo_integrated")
    except:
        pass

    # Run demos
    demo_persistent_memory()
    demo_validation_loop()
    demo_vector_rag()
    demo_integrated_workflow()

    print("=" * 80)
    print("✨ All demonstrations complete!")
    print("=" * 80)
