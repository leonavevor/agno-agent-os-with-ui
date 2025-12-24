# Auto-Reconnection Guide

## Overview

The application includes a sophisticated auto-reconnection system that automatically detects backend connection loss and attempts to reconnect without requiring manual intervention (page refresh).

## Features

- **Automatic Reconnection**: Detects connection loss and automatically attempts to reconnect
- **Exponential Backoff**: Smart retry strategy that starts fast and backs off gradually
- **Infinite Retries**: Never gives up trying to reconnect
- **Visual Feedback**: Clear status indicator showing connection state and retry attempts
- **Data Synchronization**: Automatically refreshes models and configurations after reconnection
- **Page Visibility Integration**: Immediately checks connection when tab becomes visible
- **Toast Notifications**: User-friendly messages for connection state changes

## Architecture

### Hook: `useAutoReconnect`

Location: `agno-ui/src/hooks/useAutoReconnect.ts`

The core reconnection logic is encapsulated in a custom React hook that manages:

1. **Connection State**: Tracks whether backend is connected
2. **Health Monitoring**: Checks backend health every 5 seconds when connected
3. **Reconnection Logic**: Implements exponential backoff with jitter
4. **Event Broadcasting**: Dispatches custom events when connection is restored

### Exponential Backoff Algorithm

```typescript
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 30000 // 30 seconds  
const BACKOFF_MULTIPLIER = 1.5

function getRetryDelay(attemptNumber: number): number {
  const baseDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, attemptNumber - 1),
    MAX_RETRY_DELAY
  )
  // Add jitter (0-1000ms) to prevent thundering herd
  const jitter = Math.random() * 1000
  return baseDelay + jitter
}
```

**Retry Sequence**:
- Attempt 1: ~1s
- Attempt 2: ~1.5s
- Attempt 3: ~2.25s
- Attempt 4: ~3.37s
- Attempt 5: ~5.06s
- Attempt 6: ~7.59s
- Attempt 7: ~11.39s
- Attempt 8: ~17.08s
- Attempt 9: ~25.62s
- Attempt 10+: ~30s (capped)

The jitter (random 0-1000ms) prevents multiple clients from reconnecting simultaneously (thundering herd problem).

## Components

### ConnectionManager

Location: `agno-ui/src/components/ConnectionManager.tsx`

A non-rendering component that initializes the auto-reconnection system globally. Placed in the root layout to ensure it runs throughout the application lifecycle.

```typescript
export function ConnectionManager() {
  useAutoReconnect() // Initialize globally
  return null // Non-rendering
}
```

### SystemHealthIndicator

Location: `agno-ui/src/components/SystemHealthIndicator.tsx`

Visual indicator showing connection status with:
- **Green Dot**: Connected (pulsing animation)
- **Yellow Dot**: Reconnecting (pulsing animation)
- **Red Dot**: Disconnected

**Status Text**:
- "Connected" - Backend is healthy
- "Reconnecting (N)" - Currently attempting to reconnect, shows attempt count
- "Disconnected" - Connection lost

**Tooltip** shows:
- Connection status badge
- Number of reconnection attempts
- Backend health status
- Database health status
- Last health check timestamp

**Interaction**:
- Click to manually trigger reconnection
- Button disabled during automatic reconnection to prevent spam

## Event-Driven Data Refresh

When connection is restored, the system dispatches a custom `backend-reconnected` event that triggers automatic data refresh across the application.

### Example: Model List Refresh

Location: `agno-ui/src/hooks/useModels.ts`

```typescript
useEffect(() => {
  const handleReconnect = () => {
    console.log('Backend reconnected - refreshing models...')
    refresh()
  }
  
  window.addEventListener('backend-reconnected', handleReconnect)
  return () => window.removeEventListener('backend-reconnected', handleReconnect)
}, [refresh])
```

**Data that auto-refreshes on reconnection**:
- Available models list
- Current selected model
- Provider configurations
- Hierarchical model configurations
- System health status

## Usage

### For End Users

The auto-reconnection system works automatically with no configuration needed:

1. **Normal Operation**: Green indicator shows "Connected"
2. **Connection Loss**: Indicator turns yellow and shows "Reconnecting (1)"
3. **Retry Attempts**: Attempt count increments with each retry
4. **Reconnection**: When backend comes back, indicator turns green and shows toast: "Reconnected to backend"
5. **Data Refresh**: All models and configurations automatically refresh

**No manual page refresh needed!**

### For Developers

#### Integrating Auto-Refresh for New Features

If you add new data that should refresh after reconnection:

```typescript
import { useEffect } from 'react'

export function useYourData() {
  const [data, setData] = useState(null)
  
  const fetchData = async () => {
    const response = await fetch('/api/your-endpoint')
    setData(await response.json())
  }
  
  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [])
  
  // Auto-refresh on reconnection
  useEffect(() => {
    const handleReconnect = () => {
      console.log('Backend reconnected - refreshing your data...')
      fetchData()
    }
    
    window.addEventListener('backend-reconnected', handleReconnect)
    return () => window.removeEventListener('backend-reconnected', handleReconnect)
  }, [])
  
  return data
}
```

#### Testing Auto-Reconnection

1. **Start the application**:
   ```bash
   docker compose up
   ```

2. **Open browser to http://localhost:3000**
   - Verify green "Connected" indicator

3. **Simulate connection loss** (restart backend):
   ```bash
   docker restart agent-infra-docker-agno-backend-api-1
   ```

4. **Observe behavior**:
   - Indicator should turn yellow: "Reconnecting (1)"
   - Attempt count increments: "Reconnecting (2)", "Reconnecting (3)", etc.
   - After ~10-20s, backend restarts
   - Indicator turns green: "Connected"
   - Toast notification: "Reconnected to backend"
   - Console logs: "Backend reconnected - refreshing models..."

5. **Verify data refresh**:
   - Open model selector dropdown
   - Models should be up-to-date without manual page refresh

#### Testing Page Visibility

1. **Start with backend running** (green indicator)
2. **Switch to another browser tab** (make app tab hidden)
3. **Restart backend** while on another tab
4. **Switch back to app tab**
   - Should immediately attempt reconnection
   - No waiting for next scheduled health check

## Configuration

All configuration constants are in `useAutoReconnect.ts`:

```typescript
// Health check interval when connected
const HEALTH_CHECK_INTERVAL = 5000 // 5 seconds

// Initial retry delay
const INITIAL_RETRY_DELAY = 1000 // 1 second

// Maximum retry delay
const MAX_RETRY_DELAY = 30000 // 30 seconds

// Backoff multiplier
const BACKOFF_MULTIPLIER = 1.5

// Maximum reconnection attempts
const MAX_RECONNECT_ATTEMPTS = Infinity // Never give up

// Health check timeout
const HEALTH_CHECK_TIMEOUT = 5000 // 5 seconds
```

To customize behavior, modify these constants and rebuild the UI.

## Troubleshooting

### Reconnection Not Working

**Symptom**: Indicator stays red/yellow, never reconnects

**Possible Causes**:
1. Backend is actually down (check: `docker ps`)
2. Network connectivity issues
3. CORS blocking health checks
4. Backend health endpoint returning errors

**Debug Steps**:
```bash
# Check backend is running
docker ps | grep backend

# Check backend logs
docker logs agent-infra-docker-agno-backend-api-1 --tail 50

# Manually test health endpoint
curl http://localhost:7777/system/health

# Check browser console for errors
# Open DevTools → Console
```

### Data Not Refreshing After Reconnection

**Symptom**: Connection restored but data is stale

**Possible Causes**:
1. Component not listening for 'backend-reconnected' event
2. Fetch function not being called
3. Error during data fetch

**Debug Steps**:
```typescript
// Add logging to your component
useEffect(() => {
  const handleReconnect = () => {
    console.log('🔄 Reconnect event received')
    fetchData().then(() => {
      console.log('✅ Data refreshed successfully')
    }).catch(error => {
      console.error('❌ Data refresh failed:', error)
    })
  }
  
  window.addEventListener('backend-reconnected', handleReconnect)
  return () => window.removeEventListener('backend-reconnected', handleReconnect)
}, [])
```

Check browser console for these log messages.

### Excessive Reconnection Attempts

**Symptom**: Attempt count grows very high (>100)

**Expected Behavior**: This is normal! The system never gives up trying to reconnect.

If backend is down for extended period:
- Attempts will continue indefinitely
- Delay caps at 30 seconds between attempts
- Minimal resource usage (one health check every 30s)

Once backend comes back, it will reconnect successfully no matter how many attempts.

### Toast Notifications Not Showing

**Symptom**: No "Reconnected to backend" message

**Possible Causes**:
1. Toaster component not in layout
2. Toast library not installed
3. CSS for toasts missing

**Debug Steps**:
```bash
# Verify Toaster in layout
grep -n "Toaster" agno-ui/src/app/layout.tsx

# Check sonner is installed
cd agno-ui && npm list sonner

# Check browser console for errors
```

## Best Practices

### 1. Don't Disable Auto-Reconnection

The system is designed to handle all connection scenarios automatically. Disabling it will result in poor user experience (requiring manual refresh).

### 2. Add Reconnection Listeners for New Data

Whenever you add a new data source, add a reconnection listener to keep it synchronized:

```typescript
useEffect(() => {
  window.addEventListener('backend-reconnected', refreshYourData)
  return () => window.removeEventListener('backend-reconnected', refreshYourData)
}, [refreshYourData])
```

### 3. Test Connection Loss Scenarios

Always test your features with connection loss:
1. Load your feature
2. Restart backend
3. Verify feature works after reconnection
4. Verify data is fresh after reconnection

### 4. Use Health Checks

The auto-reconnection system relies on `/system/health` endpoint. Ensure:
- Endpoint responds quickly (<5s)
- Returns 200 status when healthy
- Includes database status
- Includes feature flags

### 5. Monitor Reconnection Patterns

In production, monitor:
- Average reconnection attempts before success
- Time to reconnect after backend restart
- Frequency of connection losses
- Failed reconnection reasons

Add logging or analytics to track these metrics.

## Related Documentation

- [HIERARCHICAL_CONFIG_GUIDE.md](./HIERARCHICAL_CONFIG_GUIDE.md) - Model configuration hierarchy
- [PROVIDER_CONFIG_GUIDE.md](./PROVIDER_CONFIG_GUIDE.md) - Provider-specific settings
- [README.md](./README.md) - Project overview and setup

## Technical Details

### Health Check Endpoint

The auto-reconnection system uses the `/system/health` endpoint:

**Request**:
```bash
GET http://localhost:7777/system/health
```

**Response** (when healthy):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "error": null,
    "latency_ms": 2.5,
    "pool_size": 5
  },
  "features": {
    "memory": true,
    "vector_rag": true,
    "validation": true,
    "skills": true
  },
  "uptime": 3600.5
}
```

**Response** (when unhealthy):
- HTTP 500 or connection refused
- Or `status: "unhealthy"` with error details

### Custom Event API

The reconnection system uses the browser's native CustomEvent API:

**Event Name**: `backend-reconnected`

**Dispatched**: When connection is successfully restored after being lost

**Payload**: None (event itself signals reconnection)

**Example Listener**:
```typescript
window.addEventListener('backend-reconnected', () => {
  // Your refresh logic here
})
```

**Cleanup**:
```typescript
window.removeEventListener('backend-reconnected', listener)
```

### State Machine

The connection manager operates as a state machine:

```
┌─────────────┐
│  CONNECTED  │◄───────┐
└──────┬──────┘        │
       │               │
       │ Health check  │ Reconnect
       │ fails         │ succeeds
       │               │
       ▼               │
┌──────────────┐       │
│ DISCONNECTED │───────┤
└──────┬───────┘       │
       │               │
       │ Start         │
       │ reconnect     │
       │               │
       ▼               │
┌───────────────┐      │
│ RECONNECTING  │──────┘
└───────────────┘
```

**State Transitions**:
1. `CONNECTED` → `DISCONNECTED`: Health check fails
2. `DISCONNECTED` → `RECONNECTING`: Start reconnection attempt
3. `RECONNECTING` → `CONNECTED`: Reconnection succeeds
4. `RECONNECTING` → `DISCONNECTED`: Reconnection fails (schedule next retry)

### Connection Status Colors

- **Green** (`bg-green-500`): Connected
- **Yellow** (`bg-yellow-500`): Reconnecting  
- **Red** (`bg-red-500`): Disconnected

Colors match standard traffic light semantics for intuitive understanding.

## Future Enhancements

Potential improvements for future versions:

1. **Configurable Retry Strategy**
   - Allow users to set max retry attempts
   - Configurable backoff parameters
   - Different strategies (linear, exponential, fibonacci)

2. **Connection Quality Metrics**
   - Measure connection latency
   - Track packet loss
   - Display connection quality indicator

3. **Offline Mode**
   - Cache data for offline access
   - Queue mutations when offline
   - Sync when connection restored

4. **WebSocket Support**
   - Upgrade to WebSocket for real-time updates
   - Bidirectional communication
   - Server-initiated data push

5. **Reconnection Analytics**
   - Dashboard showing reconnection patterns
   - Alerts for frequent disconnections
   - Historical connection uptime

6. **Smart Prefetching**
   - Prefetch data likely to be stale after reconnection
   - Prioritize critical data
   - Background refresh for secondary data

## Conclusion

The auto-reconnection system provides a robust, user-friendly solution for handling backend connection loss. With exponential backoff, automatic data refresh, and clear visual feedback, users can continue working without manual intervention.

For questions or issues, check the [Troubleshooting](#troubleshooting) section or consult the development team.
