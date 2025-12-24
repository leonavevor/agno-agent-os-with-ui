# Frontend-Backend Integration Guide

This document describes the complete frontend-backend integration architecture for the advanced agentic features.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│                                                                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ MemoryPanel    │  │ ReferenceSearch  │  │ SkillCatalog    │ │
│  │ Component      │  │ Component        │  │ Component       │ │
│  └────────┬───────┘  └────────┬─────────┘  └────────┬────────┘ │
│           │                   │                      │          │
│           └───────────────────┼──────────────────────┘          │
│                               ▼                                  │
│                    ┌─────────────────────┐                      │
│                    │  API Client Layer   │                      │
│                    │  (TypeScript)       │                      │
│                    └──────────┬──────────┘                      │
└───────────────────────────────┼─────────────────────────────────┘
                                │ HTTP/JSON
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│                                                                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ /memory/*      │  │ /references/*    │  │ /skills/*       │ │
│  │ Memory API     │  │ RAG API          │  │ Skill API       │ │
│  └────────┬───────┘  └────────┬─────────┘  └────────┬────────┘ │
│           │                   │                      │          │
│           ▼                   ▼                      ▼          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Core Layer (Python)                           │ │
│  │  • MemoryManager      • VectorReferenceStore              │ │
│  │  • SkillOrchestrator  • ValidationLoop                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                               │                                  │
│                               ▼                                  │
│                    ┌─────────────────────┐                      │
│                    │    PostgreSQL       │                      │
│                    │  + pgvector         │                      │
│                    └─────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Memory Management API (`/memory`)

#### Initialize Session
```typescript
POST /memory/sessions
{
  "session_id": "user_123_session",
  "user_id": "user_123" // optional
}
→ { "session_id": "...", "status": "initialized" }
```

#### Add Message
```typescript
POST /memory/messages
{
  "session_id": "user_123_session",
  "role": "user" | "assistant" | "system",
  "content": "Message text",
  "metadata": "optional JSON string"
}
→ { "id": "...", "role": "...", "content": "...", "timestamp": "..." }
```

#### Get Chat History
```typescript
GET /memory/sessions/{session_id}/history?limit=50
→ {
  "session_id": "...",
  "messages": [...],
  "total": 123
}
```

#### Update/Get Learned Facts
```typescript
POST /memory/sessions/{session_id}/facts
{ "session_id": "...", "facts": "{\"pref\":\"technical\"}" }

GET /memory/sessions/{session_id}/facts
→ { "session_id": "...", "facts": "..." }
```

#### Clear Session
```typescript
DELETE /memory/sessions/{session_id}
→ { "session_id": "...", "status": "cleared" }
```

---

### Reference Search API (`/references`)

#### Search References
```typescript
POST /references/search
{
  "query": "How do I add tools?",
  "skill_id": "agno_docs", // optional
  "limit": 5,
  "use_vector": false // true for semantic search
}
→ {
  "query": "...",
  "results": [
    {
      "skill_id": "...",
      "file_path": "...",
      "content": "...",
      "chunk_index": 0,
      "similarity": 0.87 // only for vector search
    }
  ],
  "total": 3,
  "search_type": "keyword" | "vector"
}
```

#### Embed Skill References
```typescript
POST /references/embed
{
  "skill_id": "agno_docs",
  "chunk_size": 1000
}
→ {
  "skill_id": "...",
  "chunks_indexed": 42,
  "status": "completed"
}
```

#### Check Embedding Status
```typescript
GET /references/skills/{skill_id}/status
→ {
  "skill_id": "...",
  "is_embedded": true,
  "chunk_count": 42
}
```

---

### Skills API (`/skills`) - Enhanced

#### List Skills
```typescript
GET /skills
→ [
  {
    "id": "agno_docs",
    "name": "Agno Documentation",
    "description": "...",
    "tags": ["docs", "tutorial"],
    "match_terms": ["agno", "framework"],
    "version": "1.0"
  }
]
```

#### Route Skills
```typescript
POST /skills/route
{
  "message": "Show me NVIDIA earnings",
  "limit": 3,
  "tags": ["finance"], // optional
  "min_score": 0.5
}
→ {
  "skills": [...]
}
```

#### Reload Skills
```typescript
POST /skills/reload
→ {
  "status": "reloaded",
  "skills": [...]
}
```

---

## Frontend Integration Examples

### Using Memory in Chat Component

```typescript
import { initializeMemorySession, addMemoryMessage, getChatHistory } from '@/api/advanced'

// On chat mount
useEffect(() => {
  const sessionId = generateSessionId()
  initializeMemorySession(endpoint, sessionId, userId)
}, [])

// On user message
const handleUserMessage = async (content: string) => {
  await addMemoryMessage(endpoint, sessionId, 'user', content)
  // ... send to agent
}

// On agent response
const handleAgentResponse = async (content: string) => {
  await addMemoryMessage(endpoint, sessionId, 'assistant', content)
}

// Load history
const loadHistory = async () => {
  const history = await getChatHistory(endpoint, sessionId, 20)
  setMessages(history.messages)
}
```

### Using Reference Search

```typescript
import { searchReferences, embedSkillReferences } from '@/api/advanced'

// Keyword search
const results = await searchReferences(
  endpoint,
  "How to add tools",
  "agno_docs",
  5,
  false // keyword mode
)

// Vector search (requires embedding first)
await embedSkillReferences(endpoint, "agno_docs")
const semanticResults = await searchReferences(
  endpoint,
  "Adding custom functionality",
  "agno_docs",
  5,
  true // vector mode
)
```

### Using Skills with Memory Context

```typescript
import { getChatHistory } from '@/api/advanced'
import { routeSkills } from '@/api/os'

// Route skills based on message
const routedSkills = await routeSkills(endpoint, userMessage)

// Build context with history
const history = await getChatHistory(endpoint, sessionId, 5)
const contextPrompt = `
Recent conversation:
${history.messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Current request: ${userMessage}
`

// Send to agent with context
const response = await runAgent(agentId, contextPrompt)
```

---

## Component Integration

### MemoryPanel Component

Location: `agno-ui/src/components/chat/MemoryPanel.tsx`

**Features**:
- Displays last N messages from session history
- Shows learned facts in formatted JSON
- Auto-refreshes on session change
- Manual refresh button

**Props**:
```typescript
interface MemoryPanelProps {
  endpoint: string
  sessionId: string
  authToken?: string
}
```

**Usage**:
```tsx
<MemoryPanel 
  endpoint={agentEndpoint}
  sessionId={currentSessionId}
  authToken={userAuthToken}
/>
```

---

### ReferenceSearch Component

Location: `agno-ui/src/components/chat/ReferenceSearch.tsx`

**Features**:
- Keyword and vector search toggle
- Skill filtering
- Real-time search results
- Embedding status and management
- Similarity scores for vector results

**Props**:
```typescript
interface ReferenceSearchProps {
  endpoint: string
  skills: SkillMetadata[]
  authToken?: string
}
```

**Usage**:
```tsx
<ReferenceSearch
  endpoint={agentEndpoint}
  skills={availableSkills}
  authToken={userAuthToken}
/>
```

---

## State Management

### Global Store Integration

Add to `agno-ui/src/store.ts`:

```typescript
interface AgentOSStore {
  // ... existing state
  
  // Memory state
  sessionId: string | null
  setSessionId: (id: string) => void
  
  // Reference state
  embeddedSkills: Set<string>
  addEmbeddedSkill: (skillId: string) => void
}

export const useAgentOSStore = create<AgentOSStore>((set) => ({
  // ... existing state
  
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
  
  embeddedSkills: new Set(),
  addEmbeddedSkill: (skillId) => 
    set((state) => ({
      embeddedSkills: new Set([...state.embeddedSkills, skillId])
    }))
}))
```

---

## Error Handling

### Backend Error Responses

```python
# 400 - Bad Request
{ "detail": "Validation error: session_id is required" }

# 404 - Not Found
{ "detail": "Skill 'nonexistent' not found" }

# 500 - Internal Server Error
{ "detail": "Database connection failed" }
```

### Frontend Error Handling

```typescript
try {
  await addMemoryMessage(endpoint, sessionId, 'user', content)
} catch (error) {
  if (error instanceof Response) {
    if (error.status === 404) {
      // Handle not found
      toast.error('Session not found')
    } else {
      // Generic error
      toast.error('Failed to save message')
    }
  }
}
```

---

## Performance Considerations

### Memory API
- **Latency**: ~20-50ms for message operations
- **Optimization**: Use batch operations when possible
- **Caching**: Frontend should cache recent history

### Reference Search
- **Keyword**: <10ms, no API costs
- **Vector**: ~50-500ms, $0.00002/query (OpenAI embeddings)
- **Optimization**: Debounce search input (400ms)

### Skills API
- **Routing**: ~5-20ms (fuzzy matching)
- **Loading**: ~50-100ms per skill
- **Optimization**: Cache skill metadata in frontend

---

## Testing Integration

### Backend API Tests

Run with Docker:
```bash
docker compose up -d
pytest tests/test_api_advanced.py -v
```

### Frontend Component Tests

```bash
cd agno-ui
pnpm test components/chat/MemoryPanel.test.tsx
pnpm test components/chat/ReferenceSearch.test.tsx
```

### End-to-End Tests

```typescript
// Example with Playwright
test('memory persists across sessions', async ({ page }) => {
  await page.goto('/chat')
  await page.fill('[data-testid="message-input"]', 'Test message')
  await page.click('[data-testid="send-button"]')
  
  // Reload page
  await page.reload()
  
  // Verify message still visible in history
  await expect(page.locator('[data-testid="chat-history"]'))
    .toContainText('Test message')
})
```

---

## Deployment Considerations

### Environment Variables

```bash
# Required for memory
DATABASE_URL=postgresql://user:pass@localhost:5432/agentdb

# Required for vector search
OPENAI_API_KEY=sk-...

# Optional
REDIS_URL=redis://localhost:6379  # For caching
```

### Database Migrations

```bash
# Apply migrations for memory tables
docker exec -it agentdb psql -U user -d agentdb -c "
  CREATE EXTENSION IF NOT EXISTS vector;
"

# Run schema creation
python -c "from core.memory_manager import MemoryManager; MemoryManager()"
python -c "from shared.tools.vector_references import VectorReferenceStore; VectorReferenceStore()"
```

### CORS Configuration

Update `app/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Summary

This integration provides:

✅ **Memory Management**: Persistent chat history and learned facts  
✅ **Agentic RAG**: Keyword and vector-powered reference search  
✅ **Skills Discovery**: Dynamic routing and catalog management  
✅ **Type Safety**: Full TypeScript coverage for API calls  
✅ **UI Components**: Ready-to-use React components  
✅ **Error Handling**: Comprehensive error states and toasts  
✅ **Performance**: Optimized with caching and debouncing  
✅ **Testing**: Backend API and frontend component tests  

All components follow the 2025 agentic architecture principles with progressive disclosure, modular design, and production-ready patterns.
