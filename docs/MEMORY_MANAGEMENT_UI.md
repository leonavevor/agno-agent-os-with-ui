# Memory Management UI

## Overview

The Memory Management UI provides a comprehensive interface for managing agent memory sessions directly from the frontend. Users can view, monitor, and delete memory sessions to control their chat history and learned facts.

## Features

### 1. Memory Dashboard
- **Total Sessions**: Displays the total number of active memory sessions
- **Total Messages**: Shows the aggregate count of all messages across sessions
- **Status Indicator**: Shows whether memory feature is enabled

### 2. Session Management
- **Session List**: Scrollable list showing all active memory sessions with:
  - Unique session ID
  - Message count per session
  - Last activity timestamp
  - Quick delete button

### 3. Bulk Operations
- **Clear All**: Delete all memory sessions at once with confirmation dialog
- **Refresh**: Manually reload session data to see latest updates

### 4. Safety Features
- **Confirmation Dialogs**: All deletion operations require explicit confirmation
- **Real-time Updates**: Sessions refresh automatically after operations
- **Loading States**: Visual feedback during async operations

## Component Architecture

### Main Component
**File**: `agno-ui/src/components/chat/Sidebar/MemorySettings.tsx` (354 lines)

**Key Features**:
- Dialog-based UI for non-intrusive access
- Integration with localStorage for session tracking
- Real-time data fetching from backend API
- Error handling with toast notifications
- Responsive design with scrollable content

### UI Components Created
1. **Card** (`agno-ui/src/components/ui/card.tsx`): Container component for session cards and stats
2. **Badge** (`agno-ui/src/components/ui/badge.tsx`): Status indicators and message counts
3. **AlertDialog** (`agno-ui/src/components/ui/alert-dialog.tsx`): Confirmation dialogs for deletions
4. **ScrollArea** (`agno-ui/src/components/ui/scroll-area.tsx`): Scrollable session list
5. **Separator** (`agno-ui/src/components/ui/separator.tsx`): Visual dividers

### Icon System
Added new icons to support memory management:
- `database`: Main memory settings icon
- `loader`: Loading spinner for async operations
- `info`: Information tooltips and status indicators

## Integration Points

### Backend API
The component integrates with the following backend endpoints:

1. **Get Memory Sessions** (via localStorage):
   - Reads session IDs from localStorage key pattern `memory_session_*`
   - Maps to backend chat history endpoint

2. **Get Session History**:
   - Endpoint: `GET /api/v1/chat/history/{session_id}`
   - Returns message list and metadata for a session

3. **Delete Session**:
   - Endpoint: `DELETE /api/v1/memory/{session_id}`
   - Clears all memory for specified session

4. **Clear All Memory**:
   - Uses bulk deletion of all detected sessions
   - Clears localStorage entries after successful deletion

### State Management
- **Zustand Store**: Uses global store for agent configuration
- **localStorage**: Tracks session IDs client-side
- **Local Component State**: Manages UI state (loading, dialogs, session list)

## Feature Flag

The Memory Settings component is conditionally rendered based on the environment variable:

```typescript
{process.env.NEXT_PUBLIC_ENABLE_MEMORY === 'true' && <MemorySettings />}
```

**Configuration**:
- Set in `compose.yaml` under `agno-ui-custom` service
- Environment variable: `NEXT_PUBLIC_ENABLE_MEMORY`
- Default value: `true`

To disable the feature:
```yaml
environment:
  NEXT_PUBLIC_ENABLE_MEMORY: 'false'
```

## User Interface

### Access Point
The MemorySettings component is accessible from the sidebar, positioned between:
- **SkillCatalog** (above)
- **Sessions** list (below)

### Dialog Layout
```
┌─────────────────────────────────────────────────┐
│  Memory Settings                         [X]     │
├─────────────────────────────────────────────────┤
│  [Stats Dashboard]                              │
│  ┌───────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ Total     │ │ Total     │ │ Memory       │  │
│  │ Sessions  │ │ Messages  │ │ Enabled      │  │
│  │   3       │ │   45      │ │   Yes        │  │
│  └───────────┘ └───────────┘ └──────────────┘  │
│                                                  │
│  [Session List - Scrollable]                    │
│  ┌────────────────────────────────────────┐    │
│  │ Session: abc123              [Delete]  │    │
│  │ 15 messages • Last: 2 hours ago        │    │
│  ├────────────────────────────────────────┤    │
│  │ Session: def456              [Delete]  │    │
│  │ 20 messages • Last: 5 hours ago        │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  [Refresh]               [Clear All Memory]     │
└─────────────────────────────────────────────────┘
```

## Dependencies

### NPM Packages
```json
{
  "@radix-ui/react-alert-dialog": "^1.0.0",
  "@radix-ui/react-scroll-area": "^1.0.0",
  "@radix-ui/react-separator": "^1.0.0",
  "class-variance-authority": "^0.7.0"
}
```

### Internal Dependencies
- `@/components/ui/dialog`: Dialog wrapper
- `@/components/ui/button`: Action buttons
- `@/components/ui/icon`: Icon system
- `@/api/advanced`: Memory API client
- `@/hooks/useStore`: State management
- `@/lib/utils`: Utility functions

## Usage Example

### User Workflow
1. User clicks "Memory Settings" button in sidebar (database icon)
2. Dialog opens showing current memory statistics
3. User sees list of all active sessions
4. To delete a single session:
   - Click trash icon next to session
   - Confirm deletion in dialog
   - Session removed and UI updates
5. To clear all memory:
   - Click "Clear All Memory" button
   - Confirm bulk deletion
   - All sessions removed

### Developer Integration
To integrate memory management in other components:

```typescript
import { 
  clearMemorySession, 
  getChatHistory 
} from '@/api/advanced'

// Get session history
const history = await getChatHistory(sessionId)

// Delete a session
await clearMemorySession(sessionId)
localStorage.removeItem(`memory_session_${sessionId}`)
```

## Testing

### Manual Testing Checklist
- [ ] Memory Settings button appears in sidebar (when enabled)
- [ ] Dashboard displays correct session count
- [ ] Session list shows all active sessions
- [ ] Individual session deletion works
- [ ] Bulk "Clear All" deletion works
- [ ] Confirmation dialogs appear before deletions
- [ ] Loading states display during operations
- [ ] Success/error toasts appear after operations
- [ ] Data refreshes after operations
- [ ] Feature flag properly hides/shows component

### API Testing
```bash
# Create a memory session
curl -X POST http://localhost:7777/api/v1/memory \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-session", "message": "Hello"}'

# View memory
curl http://localhost:7777/api/v1/chat/history/test-session

# Delete memory
curl -X DELETE http://localhost:7777/api/v1/memory/test-session
```

## Future Enhancements

### Planned Features
1. **Search & Filter**: Search sessions by content or date
2. **Export**: Download session history as JSON/CSV
3. **Session Details**: View full conversation in modal
4. **Batch Operations**: Select multiple sessions for deletion
5. **Statistics**: Visualize memory usage over time
6. **Session Naming**: Allow users to name/tag sessions
7. **Archive**: Archive old sessions instead of deletion

### Performance Optimizations
1. **Pagination**: Load sessions in batches for large datasets
2. **Virtual Scrolling**: Optimize rendering for 100+ sessions
3. **Debounced Refresh**: Rate-limit refresh operations
4. **Background Sync**: Auto-refresh without user interaction

## Troubleshooting

### Common Issues

**Issue**: Memory Settings button doesn't appear
- **Solution**: Check `NEXT_PUBLIC_ENABLE_MEMORY=true` in environment

**Issue**: Sessions not loading
- **Solution**: Verify localStorage has `memory_session_*` keys
- **Solution**: Check backend API is accessible at `/api/v1/chat/history/`

**Issue**: Deletion doesn't work
- **Solution**: Ensure backend `/api/v1/memory/` endpoint is accessible
- **Solution**: Check browser console for API errors

**Issue**: UI shows outdated session count
- **Solution**: Click "Refresh" button to reload data
- **Solution**: Check localStorage sync between tabs

## Maintenance

### Code Locations
- **Component**: `agno-ui/src/components/chat/Sidebar/MemorySettings.tsx`
- **UI Components**: `agno-ui/src/components/ui/{card,badge,alert-dialog,scroll-area,separator}.tsx`
- **API Layer**: `agno-ui/src/api/advanced.ts`
- **Icon Registry**: `agno-ui/src/components/ui/icon/constants.tsx`
- **Sidebar Integration**: `agno-ui/src/components/chat/Sidebar/Sidebar.tsx`

### Update Checklist
When modifying the memory management system:
1. Update API endpoints in `advanced.ts` if backend changes
2. Adjust localStorage keys if storage schema changes
3. Update feature flag checks if renaming environment variables
4. Rebuild UI components if Radix UI updates major versions
5. Test backward compatibility with existing sessions

## Architecture Decisions

### Why Dialog-based UI?
- Non-intrusive: Doesn't take up permanent sidebar space
- Focus: Provides dedicated space for memory management
- Flexibility: Easy to enhance with additional features
- Consistency: Matches other settings dialogs in the app

### Why localStorage for Session Tracking?
- Performance: Fast access without API calls
- Offline: Works without backend connection
- Simplicity: No additional database schema needed
- User Control: Session data stored client-side

### Why Confirmation Dialogs?
- Safety: Prevents accidental data loss
- Trust: Users feel confident managing their data
- Standards: Follows UX best practices for destructive actions

## Security Considerations

1. **Session Isolation**: Each user should only access their own sessions
2. **Authentication**: API endpoints should require authentication
3. **Rate Limiting**: Prevent abuse of deletion endpoints
4. **Input Validation**: Sanitize session IDs before API calls
5. **CORS**: Ensure proper CORS configuration for API access

## Accessibility

The Memory Settings component follows WCAG 2.1 AA guidelines:
- **Keyboard Navigation**: All actions accessible via keyboard
- **Screen Readers**: Proper ARIA labels on all interactive elements
- **Focus Management**: Dialog traps focus when open
- **Color Contrast**: Text meets minimum contrast ratios
- **Loading States**: Announced to assistive technologies

## Credits

Built using:
- **shadcn/ui**: Base UI component library
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Icon library
- **Tailwind CSS**: Styling framework
- **Zustand**: State management
- **Next.js**: React framework
