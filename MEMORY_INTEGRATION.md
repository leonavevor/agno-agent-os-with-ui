# Long-term Memory Integration - Complete Implementation

## Overview

This document describes the complete end-to-end long-term memory integration implemented for the agent infrastructure. The system provides persistent memory storage, session management, full-text search, and learned facts tracking using PostgreSQL with pgvector support.

## Architecture

### Backend Components

#### 1. Database Layer (`core/memory_manager.py`)
- **ChatMessage**: Stores individual messages with session tracking
- **SessionMemory**: Stores session metadata and learned facts
- **MemoryManager**: Handles all database operations

**Key Methods:**
- `add_message()` - Store chat messages
- `get_chat_history()` - Retrieve session messages
- `initialize_session()` - Create/update sessions
- `update_learned_facts()` - Store learned information
- `get_learned_facts()` - Retrieve learned information
- `clear_session()` - Delete session and messages
- `list_sessions()` - List all sessions with metadata
- `get_stats()` - Calculate memory statistics
- `clear_all_sessions()` - Bulk delete all data
- `search_messages()` - Full-text search across messages

#### 2. API Layer (`app/api/memory.py`)
RESTful endpoints for memory management:

**Session Management:**
- `POST /memory/sessions` - Initialize session
- `GET /memory/sessions` - List all sessions (with pagination)
- `DELETE /memory/sessions/{session_id}` - Delete specific session
- `DELETE /memory/sessions` - Clear all sessions

**Message Management:**
- `POST /memory/messages` - Add message to session
- `GET /memory/sessions/{session_id}/history` - Get chat history

**Learned Facts:**
- `POST /memory/sessions/{session_id}/facts` - Update learned facts
- `GET /memory/sessions/{session_id}/facts` - Get learned facts

**Statistics & Search:**
- `GET /memory/stats` - Get memory statistics
- `GET /memory/search` - Search messages with optional filters

### Frontend Components

#### 1. API Client (`agno-ui/src/api/`)

**Routes (`routes.ts`):**
- `ListMemorySessions` - GET /memory/sessions
- `GetMemoryStats` - GET /memory/stats
- `ClearAllMemorySessions` - DELETE /memory/sessions
- `SearchMemoryMessages` - GET /memory/search

**Functions (`advanced.ts`):**
```typescript
// Session management
listMemorySessions(endpoint, limit, userId, authToken)
clearAllMemorySessions(endpoint, authToken)

// Statistics
getMemoryStats(endpoint, authToken)

// Search
searchMemoryMessages(endpoint, query, sessionId, limit, authToken)

// Legacy functions (also available)
initializeSession(endpoint, sessionId, userId, authToken)
addMessage(endpoint, sessionId, role, content, metadata, authToken)
getChatHistory(endpoint, sessionId, authToken)
deleteMemorySession(endpoint, sessionId, authToken)
```

**TypeScript Interfaces:**
```typescript
interface MemorySession {
    session_id: string
    user_id: string | null
    message_count: number
    has_facts: boolean
    created_at: string
    updated_at: string
}

interface MemoryStats {
    total_sessions: number
    total_messages: number
    sessions_with_facts: number
    average_messages_per_session: number
}

interface MemorySearchResult {
    id: string
    session_id: string
    role: string
    content: string
    timestamp: string
}
```

#### 2. UI Component (`agno-ui/src/components/chat/Sidebar/MemorySettings.tsx`)

**Features:**
- **Statistics Dashboard**: 4-card grid showing total sessions, messages, sessions with facts, and average messages per session
- **Tabbed Interface**: 
  - **Sessions Tab**: List all memory sessions with details
  - **Search Tab**: Search across all messages with full-text search
- **Session Management**:
  - View all sessions with metadata (message count, user ID, timestamps, facts indicator)
  - Delete individual sessions
  - Clear all sessions (bulk operation)
- **Search Functionality**:
  - Real-time search across all messages
  - Results show role, content, timestamp, and session ID
  - Search by keywords with case-insensitive matching
- **Auto-refresh**: Polls backend every 5 seconds to keep data fresh

**State Management:**
- `sessions` - Array of memory sessions
- `stats` - Memory statistics object
- `searchQuery` - Current search query string
- `searchResults` - Array of search results
- `activeTab` - Current tab (sessions | search)

## Database Schema

### chat_messages Table
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    message_metadata TEXT
);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
```

### session_memory Table
```sql
CREATE TABLE session_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),
    learned_facts TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_session_memory_session ON session_memory(session_id);
CREATE INDEX idx_session_memory_user ON session_memory(user_id);
```

## API Reference

### Initialize Session
```bash
POST /memory/sessions
Content-Type: application/json

{
  "session_id": "uuid-here",
  "user_id": "optional-user-id"
}

Response: {
  "session_id": "uuid-here",
  "status": "initialized"
}
```

### Add Message
```bash
POST /memory/messages
Content-Type: application/json

{
  "session_id": "uuid-here",
  "role": "user|assistant|system",
  "content": "Message content",
  "metadata": "optional-metadata"
}

Response: {
  "id": "message-uuid",
  "role": "user",
  "content": "Message content",
  "timestamp": "2025-12-24T19:24:06.736098",
  "metadata": null
}
```

### List Sessions
```bash
GET /memory/sessions?limit=100&user_id=optional

Response: {
  "sessions": [
    {
      "session_id": "uuid",
      "user_id": "user-id",
      "message_count": 10,
      "has_facts": true,
      "created_at": "2025-12-24T19:00:00",
      "updated_at": "2025-12-24T19:30:00",
      "learned_facts": "User facts..."
    }
  ],
  "total": 1
}
```

### Get Statistics
```bash
GET /memory/stats

Response: {
  "total_sessions": 5,
  "total_messages": 150,
  "sessions_with_facts": 3,
  "average_messages_per_session": 30.0
}
```

### Search Messages
```bash
GET /memory/search?query=keyword&session_id=optional&limit=50

Response: {
  "results": [
    {
      "id": "msg-uuid",
      "session_id": "session-uuid",
      "role": "user",
      "content": "Message with keyword",
      "timestamp": "2025-12-24T19:24:06.736098",
      "metadata": null
    }
  ],
  "total": 1,
  "query": "keyword"
}
```

### Get Chat History
```bash
GET /memory/sessions/{session_id}/history

Response: {
  "session_id": "uuid",
  "messages": [...],
  "total": 10
}
```

### Update Learned Facts
```bash
POST /memory/sessions/{session_id}/facts
Content-Type: application/json

{
  "session_id": "uuid",
  "facts": "User facts and learned information"
}

Response: {
  "session_id": "uuid",
  "facts": "User facts and learned information"
}
```

### Get Learned Facts
```bash
GET /memory/sessions/{session_id}/facts

Response: {
  "session_id": "uuid",
  "facts": "User facts and learned information"
}
```

### Delete Session
```bash
DELETE /memory/sessions/{session_id}

Response: {
  "session_id": "uuid",
  "status": "cleared"
}
```

### Clear All Sessions
```bash
DELETE /memory/sessions

Response: {
  "status": "cleared",
  "sessions_deleted": 5
}
```

## Testing

### End-to-End Test Script
Run the comprehensive test suite:

```bash
./test_memory_e2e.sh
```

This script tests:
1. ✓ Memory statistics (initial state)
2. ✓ Session initialization
3. ✓ Message storage
4. ✓ Session listing
5. ✓ Statistics calculation
6. ✓ Full-text search
7. ✓ Search with session filter
8. ✓ Chat history retrieval
9. ✓ Learned facts update
10. ✓ Learned facts retrieval
11. ✓ Sessions with facts counter
12. ✓ Session deletion
13. ✓ Final statistics verification

### Manual Testing via UI

1. **Open Memory Settings**:
   - Click "Memory Settings" in the sidebar
   - View statistics dashboard

2. **View Sessions**:
   - Navigate to "Sessions" tab
   - See all sessions with metadata
   - Click trash icon to delete individual session
   - Click "Clear All" to delete all sessions

3. **Search Messages**:
   - Navigate to "Search Messages" tab
   - Enter search query
   - Press Enter or click "Search"
   - View results with message details

## Configuration

### Environment Variables

Backend (`.env` or `compose.yaml`):
```env
# Database
DB_HOST=pgvector
DB_PORT=5432
DB_NAME=agno_memory
DB_USER=postgres
DB_PASS=postgres

# Optional: OpenAI for embeddings
OPENAI_API_KEY=sk-...
```

Frontend (`agno-ui/.env.local`):
```env
# Enable memory features
NEXT_PUBLIC_ENABLE_MEMORY=true

# Backend endpoint
NEXT_PUBLIC_AGENTOS_URL=http://localhost:7777
```

## Performance Considerations

1. **Pagination**: List sessions endpoint supports `limit` parameter
2. **Indexing**: Database indexes on `session_id` and `user_id`
3. **Auto-refresh**: Frontend polls every 5 seconds (configurable)
4. **Search Limits**: Search endpoint defaults to 50 results
5. **Connection Pooling**: SQLAlchemy engine with `pool_pre_ping=True`

## Future Enhancements

### Potential Improvements:
- [ ] Vector similarity search using pgvector for semantic queries
- [ ] Export session data to JSON/CSV
- [ ] Session tagging and categorization
- [ ] Advanced filtering (date ranges, message count ranges)
- [ ] Session merge/split operations
- [ ] Batch message import
- [ ] Memory usage analytics dashboard
- [ ] Session sharing and collaboration
- [ ] Automated fact extraction using LLMs

## Troubleshooting

### Common Issues

**Issue**: "Cannot import name 'get_os' from 'agno.os'"
**Solution**: Use `request.app.state.agent_os` instead of `get_os()`

**Issue**: "MemoryManager.add_message() got an unexpected keyword argument 'metadata'"
**Solution**: Use `message_metadata` parameter name instead of `metadata`

**Issue**: "Module not found: Can't resolve '@/components/ui/input'"
**Solution**: Ensure `input.tsx` component exists in `agno-ui/src/components/ui/`

**Issue**: Frontend showing 500 error
**Solution**: Check Docker logs: `docker logs agent-infra-docker-agno-ui-custom-1 --tail 50`

**Issue**: Backend not responding
**Solution**: Restart backend: `docker compose restart agno-backend-api`

### Health Checks

```bash
# Check backend health
curl http://localhost:7777/health

# Check memory stats
curl http://localhost:7777/memory/stats | jq

# Check frontend
curl -I http://localhost:3000
```

## File Structure

```
agent-infra-docker/
├── app/
│   ├── api/
│   │   └── memory.py              # Memory API endpoints
│   └── main.py                    # FastAPI app with agent_os in state
├── core/
│   └── memory_manager.py          # Database operations
├── agno-ui/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes.ts          # API route definitions
│   │   │   └── advanced.ts        # Memory API client functions
│   │   └── components/
│   │       └── chat/
│   │           └── Sidebar/
│   │               └── MemorySettings.tsx  # UI component
└── test_memory_e2e.sh             # End-to-end test script
```

## Summary

The long-term memory integration provides a complete, production-ready system for managing persistent agent memory. Key features include:

- ✅ **Persistent Storage**: PostgreSQL with proper indexing
- ✅ **Session Management**: Create, list, delete sessions
- ✅ **Message Storage**: Store and retrieve chat history
- ✅ **Learned Facts**: Track and update session-level knowledge
- ✅ **Full-text Search**: Search across all messages
- ✅ **Statistics**: Monitor memory usage and growth
- ✅ **Bulk Operations**: Clear all sessions at once
- ✅ **Modern UI**: Tabbed interface with search and management
- ✅ **Auto-refresh**: Real-time data updates
- ✅ **Comprehensive Testing**: End-to-end test suite

All components are fully functional and tested end-to-end.
