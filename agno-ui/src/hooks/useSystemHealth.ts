'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store'
import { toast } from 'sonner'

interface HealthResponse {
    status: 'healthy' | 'degraded'
    version: string
    database: {
        connected: boolean
        error: string | null
        latency_ms: number | null
        pool_size: number | string | null
    }
    features: {
        memory: boolean
        vector_rag: boolean
        validation: boolean
        skills: boolean
    }
    uptime: number
}

const POLL_INTERVAL = 5000 // 5 seconds
const RETRY_INTERVAL = 2000 // 2 seconds when error
const MAX_CONSECUTIVE_ERRORS = 3

export function useSystemHealth() {
    const { selectedEndpoint, systemHealth, setSystemHealth } = useStore()
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const consecutiveErrorsRef = useRef(0)
    const isPollingRef = useRef(false)
    const lastNotificationRef = useRef<string | null>(null)

    const checkHealth = useCallback(async () => {
        if (isPollingRef.current) return
        isPollingRef.current = true

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 4000)

            const response = await fetch(`${selectedEndpoint}/system/health`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data: HealthResponse = await response.json()

            // Reset consecutive errors on success
            consecutiveErrorsRef.current = 0

            // Update health status
            const newHealth = {
                status: data.status as 'healthy' | 'degraded' | 'down',
                backendConnected: true,
                databaseConnected: data.database.connected,
                lastChecked: Date.now(),
                error: data.database.error
            }

            setSystemHealth(newHealth)

            // Notify on status change (recovery)
            if (systemHealth.status === 'down' && newHealth.status !== 'down') {
                const notificationKey = 'system-recovered'
                if (lastNotificationRef.current !== notificationKey) {
                    toast.success('System is back online', {
                        description: 'Backend and database are connected'
                    })
                    lastNotificationRef.current = notificationKey
                }
            }

            // Notify on database issues
            if (!data.database.connected && systemHealth.databaseConnected) {
                const notificationKey = 'database-down'
                if (lastNotificationRef.current !== notificationKey) {
                    toast.warning('Database connection lost', {
                        description: data.database.error || 'Unable to connect to database'
                    })
                    lastNotificationRef.current = notificationKey
                }
            }
        } catch (error) {
            consecutiveErrorsRef.current++

            const isDown =
                consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS

            const newHealth = {
                status: (isDown ? 'down' : 'checking') as 'down' | 'checking',
                backendConnected: false,
                databaseConnected: false,
                lastChecked: Date.now(),
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to connect to backend'
            }

            setSystemHealth(newHealth)

            // Notify on system down (only once)
            if (isDown && systemHealth.status !== 'down') {
                const notificationKey = 'system-down'
                if (lastNotificationRef.current !== notificationKey) {
                    toast.error('System is offline', {
                        description: 'Unable to connect to backend service',
                        duration: 10000
                    })
                    lastNotificationRef.current = notificationKey
                }
            }
        } finally {
            isPollingRef.current = false
        }
    }, [selectedEndpoint, systemHealth, setSystemHealth])

    useEffect(() => {
        // Initial check
        checkHealth()

        // Set up polling
        const interval = systemHealth.status === 'down' ? RETRY_INTERVAL : POLL_INTERVAL

        pollIntervalRef.current = setInterval(checkHealth, interval)

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
            }
        }
    }, [checkHealth, systemHealth.status])

    // Manual refresh function
    const refresh = useCallback(() => {
        checkHealth()
    }, [checkHealth])

    return {
        health: systemHealth,
        refresh,
        isHealthy: systemHealth.status === 'healthy',
        isDegraded: systemHealth.status === 'degraded',
        isDown: systemHealth.status === 'down',
        isChecking: systemHealth.status === 'checking'
    }
}
