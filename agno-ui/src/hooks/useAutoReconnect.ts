'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store'
import { toast } from 'sonner'

interface ConnectionState {
    isConnected: boolean
    isReconnecting: boolean
    reconnectAttempts: number
    lastConnectedAt: number | null
}

const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 30000 // 30 seconds
const MAX_RECONNECT_ATTEMPTS = Infinity // Keep trying forever
const BACKOFF_MULTIPLIER = 1.5

/**
 * Hook for managing automatic reconnection to the backend
 * Implements exponential backoff and triggers data refresh on reconnect
 */
export function useAutoReconnect() {
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const systemHealth = useStore((state) => state.systemHealth)
    const setSystemHealth = useStore((state) => state.setSystemHealth)

    const connectionStateRef = useRef<ConnectionState>({
        isConnected: false,
        isReconnecting: false,
        reconnectAttempts: 0,
        lastConnectedAt: null
    })

    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastNotificationRef = useRef<string | null>(null)
    const wasConnectedRef = useRef(false)

    /**
     * Calculate retry delay with exponential backoff
     */
    const getRetryDelay = useCallback((attemptNumber: number): number => {
        const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, attemptNumber),
            MAX_RETRY_DELAY
        )
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 1000
    }, [])

    /**
     * Check backend health
     */
    const checkHealth = useCallback(async (): Promise<boolean> => {
        if (!selectedEndpoint) return false

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            const response = await fetch(`${selectedEndpoint}/system/health`, {
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()

            // Update health status
            setSystemHealth({
                status: data.status as 'healthy' | 'degraded' | 'down',
                backendConnected: true,
                databaseConnected: data.database.connected,
                lastChecked: Date.now(),
                error: data.database.error
            })

            return true
        } catch (error) {
            setSystemHealth({
                status: 'down',
                backendConnected: false,
                databaseConnected: false,
                lastChecked: Date.now(),
                error: error instanceof Error ? error.message : 'Connection failed'
            })
            return false
        }
    }, [selectedEndpoint, setSystemHealth])

    /**
     * Trigger data refresh callbacks (models, configs, etc.)
     */
    const triggerDataRefresh = useCallback(() => {
        // Dispatch custom event that other hooks can listen to
        window.dispatchEvent(new CustomEvent('backend-reconnected'))
    }, [])

    /**
     * Handle successful connection
     */
    const handleConnectionSuccess = useCallback(() => {
        const state = connectionStateRef.current
        const wasDisconnected = !state.isConnected || state.isReconnecting

        connectionStateRef.current = {
            isConnected: true,
            isReconnecting: false,
            reconnectAttempts: 0,
            lastConnectedAt: Date.now()
        }

        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        // Notify user of reconnection
        if (wasDisconnected && wasConnectedRef.current) {
            const notificationKey = 'reconnected'
            if (lastNotificationRef.current !== notificationKey) {
                toast.success('Reconnected to backend', {
                    description: 'All services are operational',
                    duration: 3000
                })
                lastNotificationRef.current = notificationKey

                // Trigger data refresh
                triggerDataRefresh()
            }
        }

        wasConnectedRef.current = true
    }, [triggerDataRefresh])

    /**
     * Handle connection failure and schedule reconnect
     */
    const handleConnectionFailure = useCallback(() => {
        const state = connectionStateRef.current

        if (state.isConnected) {
            // First-time disconnect
            const notificationKey = 'disconnected'
            if (lastNotificationRef.current !== notificationKey) {
                toast.error('Lost connection to backend', {
                    description: 'Attempting to reconnect...',
                    duration: 5000
                })
                lastNotificationRef.current = notificationKey
            }
        }

        connectionStateRef.current = {
            ...state,
            isConnected: false,
            isReconnecting: true,
            reconnectAttempts: state.reconnectAttempts + 1
        }

        // Schedule reconnection attempt
        if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = getRetryDelay(state.reconnectAttempts)

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }

            reconnectTimeoutRef.current = setTimeout(async () => {
                const isConnected = await checkHealth()

                if (isConnected) {
                    handleConnectionSuccess()
                } else {
                    handleConnectionFailure()
                }
            }, delay)
        }
    }, [checkHealth, getRetryDelay, handleConnectionSuccess])

    /**
     * Start continuous health monitoring
     */
    const startHealthMonitoring = useCallback(() => {
        // Initial health check
        checkHealth().then((isConnected) => {
            if (isConnected) {
                handleConnectionSuccess()
            } else {
                handleConnectionFailure()
            }
        })

        // Set up periodic health checks (every 5 seconds when connected)
        if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current)
        }

        healthCheckIntervalRef.current = setInterval(async () => {
            const state = connectionStateRef.current

            // Only check if we think we're connected or not actively reconnecting
            if (state.isConnected || !state.isReconnecting) {
                const isConnected = await checkHealth()

                if (isConnected && !state.isConnected) {
                    handleConnectionSuccess()
                } else if (!isConnected && state.isConnected) {
                    handleConnectionFailure()
                }
            }
        }, 5000)
    }, [checkHealth, handleConnectionSuccess, handleConnectionFailure])

    /**
     * Stop health monitoring
     */
    const stopHealthMonitoring = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current)
            healthCheckIntervalRef.current = null
        }
    }, [])

    /**
     * Manual reconnect trigger
     */
    const reconnect = useCallback(async () => {
        // Reset reconnection state
        connectionStateRef.current = {
            isConnected: false,
            isReconnecting: true,
            reconnectAttempts: 0,
            lastConnectedAt: connectionStateRef.current.lastConnectedAt
        }

        toast.info('Reconnecting to backend...', { duration: 2000 })

        const isConnected = await checkHealth()

        if (isConnected) {
            handleConnectionSuccess()
        } else {
            handleConnectionFailure()
        }
    }, [checkHealth, handleConnectionSuccess, handleConnectionFailure])

    // Initialize on mount and when endpoint changes
    useEffect(() => {
        if (!selectedEndpoint) return

        startHealthMonitoring()

        return () => {
            stopHealthMonitoring()
        }
    }, [selectedEndpoint, startHealthMonitoring, stopHealthMonitoring])

    // Handle page visibility changes (reconnect when page becomes visible)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Page became visible - check connection immediately
                checkHealth().then((isConnected) => {
                    if (isConnected && !connectionStateRef.current.isConnected) {
                        handleConnectionSuccess()
                    }
                })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [checkHealth, handleConnectionSuccess])

    return {
        isConnected: connectionStateRef.current.isConnected,
        isReconnecting: connectionStateRef.current.isReconnecting,
        reconnectAttempts: connectionStateRef.current.reconnectAttempts,
        reconnect,
        connectionState: systemHealth
    }
}
