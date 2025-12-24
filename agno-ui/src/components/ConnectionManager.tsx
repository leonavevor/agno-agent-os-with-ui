'use client'

import { useAutoReconnect } from '@/hooks/useAutoReconnect'

/**
 * Connection Manager Component
 * Handles automatic reconnection to backend globally
 * Should be included in the app layout
 */
export function ConnectionManager() {
    // Initialize auto-reconnect - this will run throughout the app lifecycle
    useAutoReconnect()

    // This component doesn't render anything
    return null
}
