# MCP Server Management - Quick Reference

## What Was Implemented

### Backend (Python/FastAPI)
✅ Full CRUD API for MCP servers (`/mcp-servers` endpoints)
✅ YAML-based persistent storage with Docker volume mounting
✅ Manager class for server lifecycle management
✅ Support for stdio, SSE, and HTTP transport types
✅ Environment variable interpolation
✅ Input validation and error handling

### Frontend (React/TypeScript/Next.js)
✅ MCPServersModal component for UI management
✅ Create, edit, enable/disable, delete operations
✅ Search and filter by tags
✅ TypeScript types for type safety
✅ API integration with error handling
✅ Zustand state management
✅ Real-time sync with backend

### Infrastructure (Docker)
✅ Volume mount for persistent config storage
✅ Environment variable support
✅ Example configurations for common MCP servers

### Testing
✅ 15 comprehensive unit tests
✅ Tests for all CRUD operations
✅ Edge case handling
✅ Configuration persistence verification

## Quick Start

### 1. Access MCP Servers UI
Open the application and navigate to the MCP Servers modal (add a button to trigger it in your UI).

### 2. Create a Server
```json
{
  "name": "GitHub",
  "description": "Access GitHub repos",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {"GITHUB_TOKEN": "your_token"},
  "transport": "stdio",
  "tags": ["github", "vcs"]
}
```

### 3. Via API
```bash
# List servers
curl http://localhost:7777/mcp-servers

# Create server
curl -X POST http://localhost:7777/mcp-servers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","description":"Test server","command":"npx"}'

# Update server
curl -X PATCH http://localhost:7777/mcp-servers/test \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# Delete server
curl -X DELETE http://localhost:7777/mcp-servers/test
```

## File Structure

```
agent-infra-docker/
├── app/
│   ├── api/
│   │   └── mcp_servers.py           # API endpoints and manager
│   ├── config/
│   │   └── mcp_servers.yaml         # Default MCP server configs
│   └── main.py                      # Router registration
├── agno-ui/
│   └── src/
│       ├── api/
│       │   ├── os.ts                # API functions
│       │   └── routes.ts            # API routes
│       ├── components/
│       │   └── MCPServersModal.tsx  # UI component
│       ├── store.ts                 # State management
│       └── types/
│           └── os.ts                # TypeScript types
├── tests/
│   └── test_mcp_servers.py          # Unit tests
├── docs/
│   ├── MCP_SERVER_MANAGEMENT.md     # Full documentation
│   └── MCP_QUICKREF.md              # This file
└── compose.yaml                     # Docker config with volume

```

## Key Features

### Bidirectional Sync
- Frontend changes → Backend API → YAML storage
- Backend changes → Frontend state update
- Persistent storage across container restarts

### Transport Support
- **stdio**: Standard input/output (most common)
- **sse**: Server-Sent Events (HTTP streaming)
- **http**: Traditional HTTP request/response

### Environment Variables
```yaml
env:
  API_KEY: ${API_KEY}              # From environment
  DEBUG: "true"                    # Hardcoded value
  FALLBACK: ${VAR:-default}        # With fallback
```

### Server States
- **enabled**: Server is active and can be used
- **disabled**: Server configuration saved but not active

## Integration Points

### Use in Agents
```python
from agno.tools.mcp import MCPTools

# Load from configuration
mcp_tools = MCPTools(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-github"]
)

agent = Agent(
    name="GitHub Agent",
    tools=[mcp_tools],
    ...
)
```

### Frontend Integration
```tsx
import { MCPServersModal } from '@/components/MCPServersModal'

// In your component
<MCPServersModal open={showModal} onOpenChange={setShowModal} />
```

## Testing

```bash
# Run all tests
pytest tests/test_mcp_servers.py -v

# Run with coverage
pytest tests/test_mcp_servers.py --cov=app/api/mcp_servers --cov-report=html
```

## Common MCP Servers

### GitHub
```yaml
command: npx
args: ["-y", "@modelcontextprotocol/server-github"]
env: {GITHUB_TOKEN: "${GITHUB_TOKEN}"}
```

### Filesystem
```yaml
command: npx
args: ["-y", "@modelcontextprotocol/server-filesystem", "/app"]
```

### Brave Search
```yaml
command: npx
args: ["-y", "@modelcontextprotocol/server-brave-search"]
env: {BRAVE_API_KEY: "${BRAVE_API_KEY}"}
```

### Google Maps
```yaml
command: npx
args: ["-y", "@modelcontextprotocol/server-google-maps"]
env: {GOOGLE_MAPS_API_KEY: "${GOOGLE_MAPS_API_KEY}"}
```

## Troubleshooting

### Servers not persisting
- Check Docker volume is mounted: `docker-compose config | grep mcp_servers_config`
- Verify file exists: `docker-compose exec agno-backend-api ls -la /app/config/`

### Cannot enable server
- Check command is available in container
- Verify environment variables are set
- Check logs: `docker-compose logs agno-backend-api`

### UI not updating
- Check browser console for errors
- Verify API endpoint: `curl http://localhost:7777/mcp-servers`
- Reload page to refresh state

## Next Steps

1. Add UI button/menu item to open MCPServersModal
2. Set required environment variables in `.env`
3. Create custom MCP servers for your use cases
4. Integrate servers with agent configurations

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Full Documentation](./MCP_SERVER_MANAGEMENT.md)
- [Agno MCP Docs](https://docs.agno.com/tools/mcp)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)
