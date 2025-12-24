# MCP Server Management

## Overview

This feature provides end-to-end management of Model Context Protocol (MCP) servers in the AgentOS system. MCP servers allow agents to interact with external tools and services in a standardized way.

## Architecture

### Backend Components

1. **API Endpoints** (`app/api/mcp_servers.py`)
   - `GET /mcp-servers` - List all MCP server configurations
   - `GET /mcp-servers/{server_id}` - Get a specific server
   - `POST /mcp-servers` - Create a new server configuration
   - `PATCH /mcp-servers/{server_id}` - Update a server
   - `DELETE /mcp-servers/{server_id}` - Delete a server

2. **Configuration Storage** (`app/config/mcp_servers.yaml`)
   - Persistent YAML-based storage
   - Mounted as Docker volume for persistence
   - Supports environment variable interpolation

3. **Manager Class** (`MCPServerManager`)
   - Handles CRUD operations
   - Manages configuration file
   - Validates server configurations

### Frontend Components

1. **UI Component** (`agno-ui/src/components/MCPServersModal.tsx`)
   - Modal dialog for managing servers
   - Create, edit, enable/disable, and delete servers
   - Search and filter by tags
   - Real-time sync with backend

2. **API Layer** (`agno-ui/src/api/os.ts`)
   - TypeScript functions for all MCP server operations
   - Error handling and toast notifications
   - Type-safe API calls

3. **State Management** (`agno-ui/src/store.ts`)
   - Zustand store for MCP server state
   - Tracks enabled/disabled servers
   - Loading states

## Usage

### Creating an MCP Server

#### Via UI
1. Open the MCP Servers modal
2. Click "New MCP Server"
3. Fill in the required fields:
   - **Name**: Display name for the server
   - **Description**: What the server provides
   - **Command**: Executable command (e.g., `npx`, `python`)
   - **Arguments**: Command line arguments
   - **Environment Variables**: Key-value pairs for env vars
   - **Transport**: `stdio`, `sse`, or `http`
   - **Tags**: For categorization and filtering
4. Click "Create Server"

#### Via API
```bash
curl -X POST http://localhost:7777/mcp-servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub",
    "description": "Access GitHub repositories",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {"GITHUB_TOKEN": "your_token"},
    "transport": "stdio",
    "tags": ["github", "vcs"]
  }'
```

### Enabling/Disabling Servers

Servers can be toggled on/off without deleting them. This is useful for:
- Temporarily disabling unused servers
- Managing resource usage
- Testing different configurations

### Configuration File Structure

```yaml
mcp_servers:
  - id: server-id  # Auto-generated from name
    name: Server Name
    description: What the server does
    command: npx
    args:
      - -y
      - @package/server
    env:
      API_KEY: ${API_KEY}  # Supports env var interpolation
    transport: stdio  # stdio, sse, or http
    url: null  # Required for sse/http transports
    enabled: true
    tags:
      - tag1
      - tag2
    version: 1.0.0
```

## Transport Types

### stdio (Standard Input/Output)
- Most common transport type
- Processes communicate via stdin/stdout
- Used by most NPM-based MCP servers

### SSE (Server-Sent Events)
- HTTP-based streaming
- Requires a URL endpoint
- Good for remote servers

### HTTP
- Traditional request/response
- Requires a URL endpoint
- Simplest for remote integrations

## Environment Variables

Environment variables in the configuration file support:
- Direct values: `KEY: value`
- Environment variable interpolation: `KEY: ${ENV_VAR}`
- Fallback values: `KEY: ${ENV_VAR:-default_value}`

## Docker Integration

### Volume Mounting

The MCP server configurations are persisted using Docker volumes:

```yaml
volumes:
  - mcp_servers_config:/app/config
```

This ensures configurations survive container restarts.

### Environment Variables

Set required environment variables in your `.env` file or Docker Compose:

```env
GITHUB_TOKEN=your_github_token
BRAVE_API_KEY=your_brave_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## Testing

Run the test suite:

```bash
# Run all MCP server tests
pytest tests/test_mcp_servers.py -v

# Run a specific test
pytest tests/test_mcp_servers.py::test_create_mcp_server -v
```

## Example Servers

### GitHub
```yaml
- id: github
  name: GitHub
  command: npx
  args: ["-y", "@modelcontextprotocol/server-github"]
  env:
    GITHUB_TOKEN: ${GITHUB_TOKEN}
  transport: stdio
```

### Filesystem
```yaml
- id: filesystem
  name: Filesystem
  command: npx
  args: 
    - -y
    - '@modelcontextprotocol/server-filesystem'
    - /app
  transport: stdio
```

### Brave Search
```yaml
- id: brave-search
  name: Brave Search
  command: npx
  args: ["-y", "@modelcontextprotocol/server-brave-search"]
  env:
    BRAVE_API_KEY: ${BRAVE_API_KEY}
  transport: stdio
```

### Google Maps
```yaml
- id: google-maps
  name: Google Maps
  command: npx
  args: ["-y", "@modelcontextprotocol/server-google-maps"]
  env:
    GOOGLE_MAPS_API_KEY: ${GOOGLE_MAPS_API_KEY}
  transport: stdio
```

## Troubleshooting

### Server Not Starting
1. Check command is correct and executable is available
2. Verify environment variables are set
3. Check Docker logs: `docker-compose logs agno-backend-api`

### Configuration Not Persisting
1. Ensure volume is properly mounted
2. Check file permissions in the container
3. Verify the config directory exists

### UI Not Updating
1. Check browser console for errors
2. Verify API endpoint is reachable
3. Reload the page to refresh state

## Security Considerations

1. **Environment Variables**: Store sensitive data (API keys, tokens) in environment variables, not directly in the config file
2. **File Permissions**: Ensure config files have appropriate permissions
3. **API Authentication**: Use authentication tokens when exposing the API
4. **Input Validation**: All inputs are validated on both frontend and backend

## Future Enhancements

- [ ] Auto-discovery of available MCP servers
- [ ] Server health monitoring
- [ ] Connection pooling for remote servers
- [ ] Server usage metrics and analytics
- [ ] Import/export server configurations
- [ ] Server templates/presets
- [ ] Integration with agent configuration

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Agno MCP Documentation](https://docs.agno.com/tools/mcp)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)
