/**
 * useMetrics - Custom hook for fetching and managing metrics data
 */

import { useEffect, useState, useCallback } from 'react'

interface MetricsSummary {
    total_executions: number
    performance: {
        avg_duration_ms: number
        p95_duration_ms: number
    }
    validation: {
        valid_percentage: number
        hallucination_percentage: number
        avg_confidence_score: number
    }
}

interface UseMetricsOptions {
    apiUrl: string
    autoRefresh?: boolean
    refreshInterval?: number
}

export function useMetrics({ apiUrl, autoRefresh = true, refreshInterval = 5000 }: UseMetricsOptions) {
    const [summary, setSummary] = useState<MetricsSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMetrics = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/metrics/summary`)
            if (!response.ok) throw new Error('Failed to fetch metrics')
            const data = await response.json()
            setSummary(data)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [apiUrl])

    useEffect(() => {
        fetchMetrics()
        if (autoRefresh) {
            const interval = setInterval(fetchMetrics, refreshInterval)
            return () => clearInterval(interval)
        }
    }, [fetchMetrics, autoRefresh, refreshInterval])

    return {
        summary,
        loading,
        error,
        refresh: fetchMetrics,
    }
}

/**
 * useValidation - Hook for checking validation status of responses
 */
interface ValidationResult {
    status: 'valid' | 'hallucination' | 'invalid' | 'unverified' | 'partial'
    confidence: number
    indicators: string[]
}

export function useValidation(apiUrl: string) {
    const [validating, setValidating] = useState(false)

    const validateResponse = useCallback(
        async (responseText: string, context?: string): Promise<ValidationResult | null> => {
            setValidating(true)
            try {
                // This would call a validation endpoint if available
                // For now, return mock data or parse from existing metrics
                return {
                    status: 'unverified',
                    confidence: 0.7,
                    indicators: [],
                }
            } catch (err) {
                console.error('Validation error:', err)
                return null
            } finally {
                setValidating(false)
            }
        },
        [apiUrl]
    )

    return {
        validateResponse,
        validating,
    }
}

/**
 * usePerformanceTracking - Hook for tracking individual operation performance
 */
export function usePerformanceTracking() {
    const [startTime, setStartTime] = useState<number | null>(null)
    const [duration, setDuration] = useState<number | null>(null)

    const start = useCallback(() => {
        setStartTime(Date.now())
        setDuration(null)
    }, [])

    const end = useCallback(() => {
        if (startTime) {
            const elapsed = Date.now() - startTime
            setDuration(elapsed)
            return elapsed
        }
        return null
    }, [startTime])

    const reset = useCallback(() => {
        setStartTime(null)
        setDuration(null)
    }, [])

    return {
        start,
        end,
        reset,
        duration,
        isTracking: startTime !== null,
    }
}
