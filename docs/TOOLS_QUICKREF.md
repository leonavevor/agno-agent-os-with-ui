# Tools Management Quick Reference

## Quick Start

### 1. Access Tools Management
```typescript
// Frontend
import { useStore } from '@/store';
const tools = useStore((state) => state.tools);
```

### 2. Create a Tool
```typescript
const newTool = await createToolAPI(endpoint, {
  name: "My Tool",
  description: "Does something useful",
  language: "python",
  code: "def my_func():\n    return 'Hello'",
  tags: ["utility"],
  is_external: false
}, authToken);
```

### 3. Enable External Access
```typescript
await updateExternalToolSettingsAPI(endpoint, {
  enabled: true,
  whitelist: ["tool_id"],
  require_confirmation: true
}, authToken);
```

## Common Operations

### List Tools
```bash
# Backend
GET /os/tools?include_disabled=true
```

```typescript
// Frontend
const tools = await getToolsAPI(endpoint, true, authToken);
```

### Create Tool
```bash
# Backend
POST /os/tools
{
  "name": "Calculator",
  "description": "Math operations",
  "language": "python",
  "code": "def add(a, b):\n    return a + b",
  "params": {"a": "int", "b": "int"},
  "tags": ["math"],
  "is_external": false
}
```

### Update Tool
```bash
# Backend
PUT /os/tools/{tool_id}
{
  "enabled": true,
  "description": "Updated description"
}
```

```typescript
// Frontend
await updateToolAPI(endpoint, toolId, {
  enabled: true,
  description: "Updated"
}, authToken);
```

### Delete Tool
```bash
# Backend
DELETE /os/tools/{tool_id}
```

```typescript
// Frontend
await deleteToolAPI(endpoint, toolId, authToken);
```

### Check Execution Permission
```bash
# Backend
GET /os/tools/{tool_id}/execute
```

```typescript
// Backend
can_execute, reason = tool_manager.can_execute_tool(tool_id)
```

## Configuration Files

### tools.yaml Location
```
/app/config/tools.yaml
```

### tool_settings.yaml Location
```
/app/config/tool_settings.yaml
```

### Docker Volume
```yaml
volumes:
  tools_config:
    driver: local
```

## Tool Properties

| Property    | Type    | Required | Description                               |
| ----------- | ------- | -------- | ----------------------------------------- |
| id          | string  | Auto     | Unique identifier (generated from name)   |
| name        | string  | Yes      | Display name                              |
| description | string  | Yes      | Purpose and usage                         |
| language    | string  | Yes      | python, javascript, bash, etc.            |
| code        | string  | Yes      | Actual script code                        |
| params      | object  | No       | Parameter definitions                     |
| tags        | array   | No       | Categorization tags                       |
| enabled     | boolean | No       | Active state (default: true)              |
| is_external | boolean | No       | Requires external access (default: false) |
| version     | string  | No       | Version (default: "1.0.0")                |

## Supported Languages

- `python` - Python 3.x
- `javascript` - Node.js JavaScript
- `typescript` - TypeScript
- `bash` - Bash shell
- `shell` - Generic shell

## External Access Control

### Settings Structure
```yaml
external_tool_access:
  enabled: false          # Master switch
  whitelist: []          # Allowed tool IDs
  require_confirmation: true  # Prompt before execution
```

### Security Levels

1. **Disabled** (default)
   - No external tools can execute
   - Safest option

2. **Enabled with Empty Whitelist**
   - All external tools can execute
   - Moderate risk

3. **Enabled with Whitelist**
   - Only whitelisted tools execute
   - Balanced approach

4. **Enabled without Confirmation**
   - Silent execution
   - Highest convenience, highest risk

## UI Components

### ToolsModal Props
```typescript
interface ToolsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### Store State
```typescript
{
  tools: ToolMetadata[];
  setTools: (tools: ToolMetadata[]) => void;
  isToolsLoading: boolean;
  setIsToolsLoading: (loading: boolean) => void;
  enabledTools: Set<string>;
  setEnabledTools: (tools: Set<string>) => void;
  externalToolAccess: ExternalToolAccessSettings | null;
  setExternalToolAccess: (settings: ExternalToolAccessSettings | null) => void;
}
```

## Testing

### Run All Tests
```bash
pytest tests/test_tools.py -v
```

### Run Specific Test
```bash
pytest tests/test_tools.py::test_create_tool -v
```

### Coverage Report
```bash
pytest tests/test_tools.py --cov=app.api.tools --cov-report=html
```

## Common Issues

| Issue               | Solution                                   |
| ------------------- | ------------------------------------------ |
| Tool not appearing  | Check `enabled` flag and reload            |
| External tool fails | Enable external access and check whitelist |
| Code not persisting | Verify Docker volume mount                 |
| Syntax errors       | Validate code before saving                |

## Code Examples

### Python Tool
```python
def process_data(data, operation):
    """Process data with specified operation"""
    if operation == 'sum':
        return sum(data)
    elif operation == 'average':
        return sum(data) / len(data) if data else 0
    else:
        raise ValueError(f"Unknown operation: {operation}")
```

### JavaScript Tool
```javascript
function formatJSON(data, indent = 2) {
  return JSON.stringify(data, null, indent);
}
```

### Bash Tool
```bash
#!/bin/bash
# List files in directory
list_files() {
  ls -lah "$1"
}
```

## API Endpoints Summary

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| GET    | `/os/tools`                 | List all tools         |
| POST   | `/os/tools`                 | Create new tool        |
| GET    | `/os/tools/{id}`            | Get specific tool      |
| PUT    | `/os/tools/{id}`            | Update tool            |
| DELETE | `/os/tools/{id}`            | Delete tool            |
| GET    | `/os/tools/{id}/execute`    | Check if executable    |
| GET    | `/os/tools/external-access` | Get access settings    |
| PUT    | `/os/tools/external-access` | Update access settings |

## Best Practices

✅ **DO:**
- Mark external tools explicitly
- Use descriptive names and tags
- Version your tools
- Test in isolation first
- Document parameters
- Handle errors gracefully

❌ **DON'T:**
- Enable external access unnecessarily
- Use generic names
- Skip error handling
- Hardcode credentials
- Execute untrusted code
- Ignore security warnings

## Environment Variables

None required - all configuration is file-based.

## File Permissions

Ensure these files are writable by the application:
- `/app/config/tools.yaml`
- `/app/config/tool_settings.yaml`

## Backup and Restore

### Backup
```bash
docker cp container_name:/app/config/tools.yaml ./backup/
docker cp container_name:/app/config/tool_settings.yaml ./backup/
```

### Restore
```bash
docker cp ./backup/tools.yaml container_name:/app/config/
docker cp ./backup/tool_settings.yaml container_name:/app/config/
```

## Monitoring

### Check Tool Count
```bash
curl http://localhost:8000/os/tools | jq '. | length'
```

### Check External Access Status
```bash
curl http://localhost:8000/os/tools/external-access | jq '.enabled'
```

### List Enabled Tools
```bash
curl http://localhost:8000/os/tools?include_disabled=false | jq '.[].name'
```

## Integration Checklist

- [x] Backend API implemented
- [x] YAML storage configured
- [x] Docker volumes mounted
- [x] Frontend UI created
- [x] State management integrated
- [x] API layer implemented
- [x] Tests written (19 tests, 76% coverage)
- [x] Documentation complete
- [x] External access control functional
- [x] Bidirectional sync working

## Support Resources

- Full documentation: `docs/TOOLS_MANAGEMENT.md`
- Test examples: `tests/test_tools.py`
- Frontend component: `agno-ui/src/components/ToolsModal.tsx`
- Backend API: `app/api/tools.py`
- Configuration examples: `app/config/tools.yaml`
