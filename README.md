# Agent OS Docker Template

Welcome to Agent OS Docker: a robust, production-ready application for serving Agentic Applications as an API. It includes:

- An **AgentOS instance**: An API-based interface for production-ready Agentic Applications with memory, validation, and vector RAG
- A **PostgreSQL database** with pgvector extension for storing Agent sessions, knowledge, memories, and embeddings
- A **Next.js frontend** with advanced UI components for chat, memory management, and reference search
- A set of **pre-built Agents, Teams and Workflows** to use as a starting point

For more information, checkout [Agno](https://agno.link/gh) and give it a ⭐️

## Quickstart

Follow these steps to get your Agent OS up and running:

> **Prerequisites**: 
> - [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
> - [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Clone the repository

```sh
git clone https://github.com/agno-agi/agent-infra-docker.git
cd agent-infra-docker
```

### 2. Configure environment

```sh
# Copy the example environment file
cp .env.example .env

# Edit with your API keys
nano .env
```

Minimum required configuration:
```env
OPENAI_API_KEY="sk-your-api-key-here"
```

> **Note**: You can use any model provider (Anthropic, Google, etc.). Just update the agents in `/agents` and add required libraries to `pyproject.toml`.

### 3. Start the application

Using Agno CLI (recommended):
```sh
ag infra up
```

Or using docker compose directly:
```sh
docker compose up -d
```

This command starts:
- **Backend API** on [http://localhost:7777](http://localhost:7777)
- **Frontend UI** on [http://localhost:3000](http://localhost:3000)
- **PostgreSQL + pgvector** (internal, port 5432)
- **API Documentation** at [http://localhost:7777/docs](http://localhost:7777/docs)

### 4. Validate deployment

Run the validation script to ensure all services are healthy:

```sh
./scripts/validate_docker.sh
```

You should see:
```
✅ Docker Compose is running
✅ All services healthy
✅ Backend API is ready
✅ Database is accessible
✅ pgvector extension is installed
✅ Memory tables exist
✅ Vector reference table exists
```

### 5. Test the API

```sh
# Check system health
curl http://localhost:7777/health

# View API documentation
open http://localhost:7777/docs

# Access the frontend
open http://localhost:3000
```

Once started, you can:

- **View API docs**: [http://localhost:7777/docs](http://localhost:7777/docs)
- **Chat interface**: [http://localhost:3000](http://localhost:3000)
- **Health status**: [http://localhost:7777/health](http://localhost:7777/health)

---

## Advanced Features 🚀

This deployment includes production-ready enhancements:

### Memory Management
- **Session-based chat history** stored in PostgreSQL
- **Learned facts** persistence across conversations
- **API endpoints**: `/api/memory/*` for CRUD operations
- **Frontend UI**: Memory panel in chat interface

### Vector RAG (Semantic Search)
- **pgvector-powered** embeddings search
- **Agentic retrieval**: Agents query references at runtime
- **Dual-mode search**: Keyword + vector similarity
- **API endpoints**: `/api/references/search`, `/api/references/embed`

### Self-Healing Validation
- **Pydantic-based** type enforcement
- **Automatic retry loops** with LLM correction
- **Error formatting** for actionable feedback
- **Enable/disable** via `ENABLE_VALIDATION` env var

### Feature Flags
Control features via environment variables:
```env
ENABLE_MEMORY=true          # Session memory and learned facts
ENABLE_VECTOR_RAG=true      # pgvector semantic search
ENABLE_VALIDATION=true      # Self-healing validation loops
ENABLE_SKILLS=true          # Skill-based architecture
```

See [DOCKER_INTEGRATION.md](DOCKER_INTEGRATION.md) for complete configuration guide.

---

## Docker Management

### View logs
```sh
# All services
docker compose logs -f

# Specific service
docker compose logs -f agno-backend-api
docker compose logs -f pgvector
```

### Restart services
```sh
docker compose restart
```

### Rebuild after changes
```sh
docker compose up -d --build
```

### Stop the application
```sh
ag infra down
# or
docker compose down
```

### Clean up (remove volumes)
```sh
docker compose down -v
```

---

## Production Deployment

For production environments, use the optimized configuration:

```sh
# Build production image
docker compose -f compose.prod.yaml build

# Start with multiple workers
docker compose -f compose.prod.yaml up -d

# Scale API servers
docker compose -f compose.prod.yaml up -d --scale agno-backend-api=3
```

Production features:
- ✅ Resource limits (CPU, memory)
- ✅ Multiple uvicorn workers
- ✅ Health checks and auto-restart
- ✅ Optional Redis caching
- ✅ Nginx reverse proxy template
- ✅ Rolling updates strategy

See [DOCKER_INTEGRATION.md](DOCKER_INTEGRATION.md) for detailed production setup.

---

## Connect to AgentOS UI

- Open the [Agno AgentOS UI](https://os.agno.com)
- Connect your OS with `http://localhost:7777` as the endpoint
- Name it `AgentOS` (or any name you prefer)
- Explore all features or go to the Chat page to interact with your Agents

---

## Prebuilt Agents, Teams, and Workflows

The `/agents` folder contains pre-built agents, teams, and workflows that you can use as a starting point.

- Agno Assist: An Agent that can help answer questions about Agno and provide support for developers working with Agno.
- Web Search Agent: A Agent that can search the web based on the user's query.

The `/teams` folder contains pre-built teams that you can use as a starting point.

- Multilingual Team: A team consisting of member agents that specialize in different languages and can translate and provide cultural insights.
- Reasoning Research Team: A team consisting of member agents that can research and provide insights.

The `/workflows` folder contains pre-built workflows that you can use as a starting point.

- Investment Workflow: A workflow that creates a comprehensive investment strategy report based on the user's request.
- Research Workflow: A workflow that creates a comprehensive research report based on the user's request and provides a summary of the research findings.

## Skill-Based Architecture

This project implements a **2025 Agentic Skills architecture** following Anthropic's modular, progressive disclosure patterns. Agent capabilities come from self-contained skills housed in the `/skills` directory.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   SkillRouter                                │
│  • Fuzzy matching on tags/match_terms                       │
│  • Dynamic skill selection based on intent                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 SkillOrchestrator                            │
│  • Aggregates shared prompts + tools                        │
│  • Loads selected skill instructions                         │
│  • Binds references for agentic RAG                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AgentContext                              │
│  instructions: str                                           │
│  tools: List[object]                                         │
│  references: List[Path]                                      │
│  skills: List[SkillMetadata]                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent                                   │
│  • Executes with context-specific capabilities              │
│  • Can search references at runtime (agentic RAG)           │
│  • Self-corrects via validation loops                       │
└─────────────────────────────────────────────────────────────┘
```

### Skill Structure

Each skill directory contains:

- `skill.yaml`: Metadata (id, name, description, optional tags, paths)
- `SKILL.md`: Detailed instructions loaded only when skill is activated
- `tools/`: Python modules with tool functions (progressive disclosure)
- `refs/`: Reference files (PDF, JSON, Markdown) for agentic RAG
- Example skills shipped out of the box:
  - `web_search`: DuckDuckGo-powered discovery for current events
  - `agno_docs`: In-depth support for the Agno framework
  - `finance_research`: Live equity analysis with YFinance-backed metrics

### Advanced Features

**Progressive Disclosure**: Skills are discovered by metadata but only fully loaded when contextually relevant, saving context window costs.

**Agentic RAG**: The `search_skill_references` tool allows agents to query knowledge bases at runtime rather than loading all data upfront. Vector-powered semantic search available via `shared/tools/vector_references.py`.

**Persistent Memory**: Session-based chat history and learned facts stored in PostgreSQL via `core/memory_manager.py`, enabling continuity across conversations.

**Self-Healing Validation**: Pydantic-based validation loops (`core/validation_loop.py`) allow agents to self-correct malformed responses automatically.

### Skill API Surface

The [skills router](app/api/skills.py) exposes discovery utilities through the FastAPI app:

- `GET /skills` returns catalog metadata (id, name, description, tags, match terms, version)
- `POST /skills/route` accepts `{ "message": "...", "limit": 2 }` to receive ranked matches
- `POST /skills/reload` clears orchestrator caches so new skills become visible without a restart

### Scaffolding New Skills

Use the helper CLI to spin up a skill skeleton:

```sh
python scripts/create_skill.py my_new_skill --name "My New Skill" --tags automation --match-terms automate --register
```

The generator relies on [core/skills/scaffold.py](core/skills/scaffold.py) for reusable logic and creates the manifest, SKILL.md, tool stub, and refs placeholder in the correct directory structure.

The `core.SkillOrchestrator` composes shared prompts from `/shared/prompt.md`, shared tools from `/shared/tools`, and the requested skills at runtime. Each agent declares its default skill set in [`core/skills_config.yaml`](core/skills_config.yaml), and you can let the router attach additional skills on demand:

```python
from core import skill_orchestrator

context = skill_orchestrator.route_and_build(
  "web-search-agent",
  message="Find the latest AI governance headlines",
  extra_instructions="Tailor the tone for enterprise users.",
)

agent = Agent(
  instructions=context.instructions,
  tools=context.tools,
)
```

To add a new skill:

1. Create a directory under `/skills/<skill_name>`
2. Add `skill.yaml` with a unique `id`
3. Write `SKILL.md` describing the workflow, guardrails, and outputs
4. Drop tool modules under `tools/` (each exporting `get_tools()` or `SKILL_TOOLS`)
5. Optionally add reference artifacts under `refs/`
6. Register the skill under `default` or `auto` buckets inside `core/skills_config.yaml`
7. (Optional) Add `match_terms` in your manifest so the router can pick the skill automatically based on user intent

### Auto-Routing Cheatsheet

- `match_terms` and `tags` from `skill.yaml` drive the keyword-based router in [`core/skills/router.py`](core/skills/router.py)
- Set `skills.auto.enabled` to `true` for an agent to allow dynamic attachment
- Limit routed skills with `skills.auto.limit` and adjust the threshold via `skills.auto.min_score`
- Filter candidates to a subset of tags using `skills.auto.tags`

The automated tests in `tests/test_skills.py` cover the registry, tool discovery, and orchestrator assembly flow.

### Progressive Disclosure Pattern

```
Initial Agent State (Lightweight)
         │
         │ User: "What's NVIDIA's stock price?"
         ▼
    SkillRouter
         │
         │ Matches: finance_research (score: 0.87)
         ▼
   SkillOrchestrator
         │
         │ Load: SKILL.md + tools/ + refs/
         ▼
    Agent Context
  ┌────────────────────┐
  │ Instructions       │  ← Shared prompt + Finance skill instructions
  │ Tools: 5 functions │  ← Shared tools + yfinance_data
  │ References: 3 docs │  ← tax_laws_2025.pdf, market_holidays.json
  └────────────────────┘
         │
         ▼
    Agent Execution
         │
         │ Tool call: yfinance_data("NVDA")
         │ Tool call: search_skill_references("tax implications")
         ▼
    Structured Response
```

This pattern prevents context pollution—only relevant capabilities are loaded per request.

### Agentic RAG Workflow

```
Agent receives query
         │
         ▼
Decides to search references
         │
         ▼
Calls: search_skill_references("query")
         │
         ├─→ Keyword search (default)
         │   • Fast, lightweight
         │   • Works offline
         │
         └─→ Vector search (optional)
             • Semantic matching
             • Requires OpenAI embeddings
             • Scoped to skill_id
         │
         ▼
Returns: Ranked snippets with citations
         │
         ▼
Agent synthesizes answer with sources
```

Enable vector RAG by using `shared/tools/vector_references.py` instead of `references.py`.

## Development Setup

To setup your local virtual environment:

### Install `uv`

We use `uv` for python environment and package management. Install it by following the the [`uv` documentation](https://docs.astral.sh/uv/#getting-started) or use the command below for unix-like systems:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Create Virtual Environment & Install Dependencies

Run the `dev_setup.sh` script. This will create a virtual environment and install project dependencies:

```sh
./scripts/dev_setup.sh
```

### Activate Virtual Environment

Activate the created virtual environment:

```sh
source .venv/bin/activate
```

(On Windows, the command might differ, e.g., `.venv\Scripts\activate`)

## Managing Python Dependencies

If you need to add or update python dependencies:

### Modify pyproject.toml

Add or update your desired Python package dependencies in the `[dependencies]` section of the `pyproject.toml` file.

### Generate requirements.txt

The `requirements.txt` file is used to build the application image. After modifying `pyproject.toml`, regenerate `requirements.txt` using:

```sh
./scripts/generate_requirements.sh
```

To upgrade all existing dependencies to their latest compatible versions, run:

```sh
./scripts/generate_requirements.sh upgrade
```

### Rebuild Docker Images

Rebuild your Docker images to include the updated dependencies:

```sh
docker compose up -d --build
```

## Running Tests

This project comes with a set of integration tests that you can use to ensure the application is working as expected.

First, start the application:

```sh
docker compose up -d
```

Then, run the tests:

```sh
pytest tests/
```

Then close the application again:

```sh
docker compose down
```

## Community & Support

Need help, have a question, or want to connect with the community?

- 📚 **[Read the Agno Docs](https://docs.agno.com)** for more in-depth information.
- 💬 **Chat with us on [Discord](https://agno.link/discord)** for live discussions.
- ❓ **Ask a question on [Discourse](https://agno.link/community)** for community support.
- 🐛 **[Report an Issue](https://github.com/agno-agi/agent-api/issues)** on GitHub if you find a bug or have a feature request.

## Running in Production

This repository includes a `Dockerfile` for building a production-ready container image of the application.

The general process to run in production is:

1. Update the `scripts/build_image.sh` file and set your IMAGE_NAME and IMAGE_TAG variables.
2. Build and push the image to your container registry:

```sh
./scripts/build_image.sh
```

3. Run in your cloud provider of choice.

### Detailed Steps

1. **Configure for Production**

- Ensure your production environment variables (e.g., `OPENAI_API_KEY`, database connection strings) are securely managed. Most cloud providers offer a way to set these as environment variables for your deployed service.
- Review the agent configurations in the `/agents` directory and ensure they are set up for your production needs (e.g., correct model versions, any production-specific settings).

2. **Build Your Production Docker Image**

- Update the `scripts/build_image.sh` script to set your desired `IMAGE_NAME` and `IMAGE_TAG` (e.g., `your-repo/agent-api:v1.0.0`).
- Run the script to build and push the image:

  ```sh
  ./scripts/build_image.sh
  ```

3. **Deploy to a Cloud Service**
   With your image in a registry, you can deploy it to various cloud services that support containerized applications. Some common options include:

- **Serverless Container Platforms**:

  - **Google Cloud Run**: A fully managed platform that automatically scales your stateless containers. Ideal for HTTP-driven applications.
  - **AWS App Runner**: Similar to Cloud Run, AWS App Runner makes it easy to deploy containerized web applications and APIs at scale.
  - **Azure Container Apps**: Build and deploy modern apps and microservices using serverless containers.

- **Container Orchestration Services**:

  - **Amazon Elastic Container Service (ECS)**: A highly scalable, high-performance container orchestration service that supports Docker containers. Often used with AWS Fargate for serverless compute or EC2 instances for more control.
  - **Google Kubernetes Engine (GKE)**: A managed Kubernetes service for deploying, managing, and scaling containerized applications using Google infrastructure.
  - **Azure Kubernetes Service (AKS)**: A managed Kubernetes service for deploying and managing containerized applications in Azure.

- **Platform as a Service (PaaS) with Docker Support**

  - **Railway.app**: Offers a simple way to deploy applications from a Dockerfile. It handles infrastructure, scaling, and networking.
  - **Render**: Another platform that simplifies deploying Docker containers, databases, and static sites.
  - **Heroku**: While traditionally known for buildpacks, Heroku also supports deploying Docker containers.

- **Specialized Platforms**:
  - **Modal**: A platform designed for running Python code (including web servers like FastAPI) in the cloud, often with a focus on batch jobs, scheduled functions, and model inference, but can also serve web endpoints.

The specific deployment steps will vary depending on the chosen provider. Generally, you'll point the service to your container image in the registry and configure aspects like port mapping (the application runs on port 8000 by default inside the container), environment variables, scaling parameters, and any necessary database connections.

4. **Database Configuration**

- The default `docker-compose.yml` sets up a PostgreSQL database for local development. In production, you will typically use a managed database service provided by your cloud provider (e.g., AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL) for better reliability, scalability, and manageability.
- Ensure your deployed application is configured with the correct database connection URL for your production database instance. This is usually set via an environment variables.
