# Tools Management Integration Guide

## Overview

The Tools Management system provides comprehensive end-to-end support for managing code/script snippet tools with explicit external access control. This integration includes backend API, persistent storage, frontend UI, and robust testing.

## Architecture

### Backend Components

1. **ToolManager** (`app/api/tools.py`)
   - Manages tool CRUD operations
   - Handles external tool access control
   - Validates tool configurations
   - Persists to YAML storage

2. **Storage** (`app/config/`)
   - `tools.yaml`: Tool configurations
   - `tool_settings.yaml`: External access settings
   - Docker volume mounted for persistence

3. **API Endpoints**
   - `GET /os/tools`: List all tools
   - `POST /os/tools`: Create new tool
   - `PUT /os/tools/{tool_id}`: Update tool
   - `DELETE /os/tools/{tool_id}`: Delete tool
   - `GET /os/tools/{tool_id}/execute`: Check if tool can execute
   - `GET /os/tools/external-access`: Get external access settings
   - `PUT /os/tools/external-access`: Update external access settings

### Frontend Components

1. **ToolsModal** (`agno-ui/src/components/ToolsModal.tsx`)
   - Complete UI for tool management
   - Code editor with syntax support
   - Language selection (Python, JavaScript, Bash, etc.)
   - External access indicators and warnings
   - Search and filter capabilities
   - Enable/disable toggles

2. **State Management** (`agno-ui/src/store.ts`)
   - `tools`: All tool configurations
   - `enabledTools`: Set of enabled tool IDs
   - `externalToolAccess`: External access settings
   - `isToolsLoading`: Loading state

3. **API Layer** (`agno-ui/src/api/os.ts`)
   - Type-safe API functions
   - Error handling with toast notifications
   - Bidirectional sync with backend

## Key Features

### 1. External Tool Access Control

External tools (those accessing network, files, or system resources) require explicit permission:

```yaml
external_tool_access:
  enabled: false  # Master switch
  whitelist: []   # Specific tool IDs allowed
  require_confirmation: true  # Ask before execution
```

**Security Features:**
- Master enable/disable switch
- Whitelist for granular control
- Visual warnings in UI
- Confirmation requirements

### 2. Multi-Language Support

Supported languages:
- Python
- JavaScript/TypeScript
- Bash/Shell
- More can be added easily

### 3. Tool Metadata

Each tool includes:
- `id`: Unique identifier
- `name`: Display name
- `description`: Purpose and usage
- `language`: Programming language
- `code`: Actual script/code
- `params`: Parameter definitions
- `tags`: Categorization
- `enabled`: Active/inactive state
- `is_external`: Requires external access
- `version`: Tool version

### 4. Bidirectional Sync

- Frontend changes persist to backend
- Backend changes reflect in frontend
- Docker volume ensures data persistence
- Hot-reload on configuration changes

## Usage Examples

### Creating a Tool via API

```python
from app.models import CreateToolPayload

tool = CreateToolPayload(
    name="CSV Parser",
    description="Parse and analyze CSV files",
    language="python",
    code="""
import csv
def parse_csv(file_path):
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        return list(reader)
    """,
    params={"file_path": "str"},
    tags=["data", "csv", "parser"],
    is_external=True,  # Accesses file system
    version="1.0.0"
)

# Create via ToolManager
result = tool_manager.create_tool(tool)
```

### Enabling External Access

```python
from app.api.tools import ExternalToolAccessSettings

settings = ExternalToolAccessSettings(
    enabled=True,
    whitelist=["csv_parser", "web_scraper"],
    require_confirmation=True
)

tool_manager.update_external_access_settings(settings)
```

### Frontend Integration

```typescript
// Load tools
const tools = await getToolsAPI(endpoint, true, authToken);
setTools(tools);

// Create tool
const newTool: CreateToolPayload = {
  name: "Calculator",
  description: "Basic math operations",
  language: "python",
  code: "def add(a, b):\n    return a + b",
  params: { a: "int", b: "int" },
  tags: ["math", "utility"],
  is_external: false,
  version: "1.0.0"
};

const created = await createToolAPI(endpoint, newTool, authToken);

// Update external access
const settings = {
  enabled: true,
  whitelist: [],
  require_confirmation: false
};

await updateExternalToolSettingsAPI(endpoint, settings, authToken);
```

## Configuration

### Example tools.yaml

```yaml
tools:
  - id: calculator
    name: Calculator
    description: Basic arithmetic operations
    language: python
    code: |
      def calculate(operation, a, b):
          if operation == 'add':
              return a + b
          elif operation == 'subtract':
              return a - b
          elif operation == 'multiply':
              return a * b
          elif operation == 'divide':
              return a / b if b != 0 else 'Error: Division by zero'
    params:
      operation: str
      a: float
      b: float
    tags:
      - math
      - utility
    enabled: true
    is_external: false
    version: "1.0.0"
    
  - id: web_scraper
    name: Web Scraper
    description: Fetch and parse web content
    language: python
    code: |
      import requests
      from bs4 import BeautifulSoup
      
      def scrape(url):
          response = requests.get(url)
          soup = BeautifulSoup(response.content, 'html.parser')
          return soup.get_text()
    params:
      url: str
    tags:
      - web
      - scraping
      - external
    enabled: true
    is_external: true  # Requires network access
    version: "1.0.0"
```

### Example tool_settings.yaml

```yaml
external_tool_access:
  enabled: false
  whitelist:
    - web_scraper
    - file_uploader
  require_confirmation: true
```

## Docker Integration

The tools configuration is persisted via Docker volume:

```yaml
# compose.yaml
volumes:
  tools_config:
    driver: local

services:
  app:
    volumes:
      - tools_config:/app/config
```

This ensures:
- Configuration survives container restarts
- Data persists across deployments
- Easy backup and restore

## Testing

Comprehensive test suite with 19 tests covering:

- ✅ Tool CRUD operations
- ✅ External access control
- ✅ Whitelist functionality
- ✅ Configuration persistence
- ✅ Error handling
- ✅ Special character handling
- ✅ Parameter validation

Run tests:
```bash
pytest tests/test_tools.py -v
```

Expected output:
```
19 passed, 76% coverage
```

## Security Considerations

1. **External Access Control**
   - Never enable external access without explicit user consent
   - Use whitelist for granular control
   - Require confirmation for sensitive operations

2. **Code Validation**
   - Validate code syntax before saving
   - Sanitize inputs to prevent injection
   - Limit execution scope and permissions

3. **Audit Trail**
   - Log all tool executions
   - Track configuration changes
   - Monitor external access usage

## Best Practices

1. **Tool Organization**
   - Use descriptive names and descriptions
   - Tag tools for easy discovery
   - Version tools for compatibility tracking

2. **External Tools**
   - Always mark tools requiring external resources
   - Document external dependencies
   - Test in isolated environments first

3. **Code Quality**
   - Write idiomatic code for each language
   - Include error handling
   - Add parameter documentation

4. **Performance**
   - Cache frequently used tools
   - Lazy-load tool code
   - Monitor execution times

## Troubleshooting

### Tools not appearing in UI
1. Check backend is running
2. Verify `tools.yaml` exists
3. Check Docker volume mount
4. Inspect browser console for errors

### External tools not executing
1. Verify external access is enabled
2. Check whitelist includes tool ID
3. Ensure tool is enabled
4. Check for permission errors

### Configuration not persisting
1. Verify Docker volume is mounted
2. Check file permissions
3. Ensure YAML syntax is valid
4. Check for write errors in logs

## API Reference

### ToolMetadata

```typescript
interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  language: string;
  code: string;
  params: Record<string, any>;
  tags: string[];
  enabled: boolean;
  is_external: boolean;
  version: string;
}
```

### CreateToolPayload

```typescript
interface CreateToolPayload {
  name: string;
  description: string;
  language: string;
  code: string;
  params?: Record<string, any>;
  tags?: string[];
  is_external?: boolean;
  version?: string;
}
```

### ExternalToolAccessSettings

```typescript
interface ExternalToolAccessSettings {
  enabled: boolean;
  whitelist: string[];
  require_confirmation: boolean;
}
```

## Roadmap

Future enhancements:
- [ ] Syntax highlighting in code editor
- [ ] Tool templates/scaffolding
- [ ] Execution history and logs
- [ ] Tool marketplace/sharing
- [ ] Automated testing for tools
- [ ] Resource usage monitoring
- [ ] Collaborative tool editing

## Support

For issues or questions:
1. Check this documentation
2. Review test cases for examples
3. Inspect backend logs
4. Check Docker container status
5. Open an issue on GitHub
