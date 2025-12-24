/**
 * MetricsDashboard - Comprehensive performance and validation metrics display
 *
 * Features:
 * - Real-time performance metrics
 * - Validation status tracking
 * - Hallucination detection results
 * - Truth vs hallucination visualization
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingUp,
    XCircle,
    Zap,
    Target,
    AlertCircle,
} from 'lucide-react'

interface PerformanceMetrics {
    avg_duration_ms: number
    min_duration_ms: number
    max_duration_ms: number
    p50_duration_ms: number
    p95_duration_ms: number
}

interface ValidationMetrics {
    status_counts: Record<string, number>
    avg_confidence_score: number
    valid_percentage: number
    hallucination_percentage: number
    invalid_percentage: number
}

interface ExecutionDetail {
    execution_id: string
    timestamp: string
    duration_ms: number | null
    validation_status: string
    confidence_score: number
    agent_name: string | null
    hallucination_indicators: string[]
    error: string | null
}

interface MetricsSummary {
    total_executions: number
    performance: PerformanceMetrics
    validation: ValidationMetrics
    recent_executions: any[]
}

interface ValidationInsights {
    total_validated: number
    valid_count: number
    hallucination_count: number
    invalid_count: number
    unverified_count: number
    avg_confidence: number
    common_hallucination_patterns: string[]
    validation_trend: Array<{
        timestamp: string
        status: string
        confidence: number
    }>
}

export function MetricsDashboard({ apiUrl }: { apiUrl: string }) {
    const [summary, setSummary] = useState<MetricsSummary | null>(null)
    const [insights, setInsights] = useState<ValidationInsights | null>(null)
    const [executions, setExecutions] = useState<ExecutionDetail[]>([])
    const [loading, setLoading] = useState(true)
    const [autoRefresh, setAutoRefresh] = useState(true)

    const fetchMetrics = async () => {
        try {
            const [summaryRes, insightsRes, executionsRes] = await Promise.all([
                fetch(`${apiUrl}/metrics/summary`),
                fetch(`${apiUrl}/metrics/validation-insights`),
                fetch(`${apiUrl}/metrics/executions?limit=20`),
            ])

            if (summaryRes.ok) setSummary(await summaryRes.json())
            if (insightsRes.ok) setInsights(await insightsRes.json())
            if (executionsRes.ok) setExecutions(await executionsRes.json())
        } catch (error) {
            console.error('Failed to fetch metrics:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMetrics()
        const interval = autoRefresh ? setInterval(fetchMetrics, 5000) : null
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [apiUrl, autoRefresh])

    if (loading) {
        return <MetricsLoadingSkeleton />
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Performance & Validation Metrics</h2>
                    <p className="text-muted-foreground">
                        Real-time insights into agent performance and response accuracy
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={autoRefresh ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setAutoRefresh(!autoRefresh)}>
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                    </Badge>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Executions"
                    value={summary?.total_executions || 0}
                    icon={<Activity className="h-4 w-4" />}
                    description="All agent runs"
                />
                <MetricCard
                    title="Avg Response Time"
                    value={`${(summary?.performance.avg_duration_ms || 0).toFixed(0)}ms`}
                    icon={<Clock className="h-4 w-4" />}
                    description={`P95: ${(summary?.performance.p95_duration_ms || 0).toFixed(0)}ms`}
                />
                <MetricCard
                    title="Truth Rate"
                    value={`${(summary?.validation.valid_percentage || 0).toFixed(1)}%`}
                    icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                    description="Validated responses"
                    trend="up"
                />
                <MetricCard
                    title="Hallucination Rate"
                    value={`${(summary?.validation.hallucination_percentage || 0).toFixed(1)}%`}
                    icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                    description="Detected hallucinations"
                    trend="down"
                />
            </div>

            {/* Performance & Validation Overview */}
            <div className="grid gap-6 md:grid-cols-2">
                <PerformanceOverview performance={summary?.performance} />
                <ValidationOverview validation={summary?.validation} insights={insights} />
            </div>

            {/* Hallucination Patterns */}
            {insights && insights.common_hallucination_patterns.length > 0 && (
                <HallucinationPatterns patterns={insights.common_hallucination_patterns} />
            )}

            {/* Recent Executions */}
            <RecentExecutions executions={executions} />
        </div>
    )
}

function MetricCard({
    title,
    value,
    icon,
    description,
    trend,
}: {
    title: string
    value: string | number
    icon: React.ReactNode
    description: string
    trend?: 'up' | 'down'
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
                    {description}
                </p>
            </CardContent>
        </Card>
    )
}

function PerformanceOverview({ performance }: { performance?: PerformanceMetrics }) {
    if (!performance) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Performance Metrics
                </CardTitle>
                <CardDescription>Response time distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <MetricRow label="Average" value={`${performance.avg_duration_ms.toFixed(0)}ms`} />
                <MetricRow label="Fastest" value={`${performance.min_duration_ms.toFixed(0)}ms`} />
                <MetricRow label="Slowest" value={`${performance.max_duration_ms.toFixed(0)}ms`} />
                <MetricRow label="P50 (Median)" value={`${performance.p50_duration_ms.toFixed(0)}ms`} />
                <MetricRow label="P95" value={`${performance.p95_duration_ms.toFixed(0)}ms`} highlight />
            </CardContent>
        </Card>
    )
}

function ValidationOverview({
    validation,
    insights,
}: {
    validation?: ValidationMetrics
    insights?: ValidationInsights | null
}) {
    if (!validation) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Validation Results
                </CardTitle>
                <CardDescription>Truth vs hallucination analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ValidationStatusRow
                    label="Valid (Truth)"
                    count={insights?.valid_count || 0}
                    percentage={validation.valid_percentage}
                    variant="success"
                />
                <ValidationStatusRow
                    label="Hallucination"
                    count={insights?.hallucination_count || 0}
                    percentage={validation.hallucination_percentage}
                    variant="danger"
                />
                <ValidationStatusRow
                    label="Invalid"
                    count={insights?.invalid_count || 0}
                    percentage={validation.invalid_percentage}
                    variant="warning"
                />
                <div className="pt-2 border-t">
                    <MetricRow
                        label="Avg Confidence"
                        value={`${(validation.avg_confidence_score * 100).toFixed(1)}%`}
                        highlight
                    />
                </div>
            </CardContent>
        </Card>
    )
}

function HallucinationPatterns({ patterns }: { patterns: string[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Common Hallucination Patterns
                </CardTitle>
                <CardDescription>Detected indicators of potential hallucinations</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {patterns.map((pattern, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{pattern}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function RecentExecutions({ executions }: { executions: ExecutionDetail[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>Latest agent runs with validation status</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {executions.map((exec) => (
                            <ExecutionCard key={exec.execution_id} execution={exec} />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

function ExecutionCard({ execution }: { execution: ExecutionDetail }) {
    const statusConfig = {
        valid: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', label: 'Valid' },
        hallucination: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20', label: 'Hallucination' },
        invalid: { icon: XCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', label: 'Invalid' },
        unverified: { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/20', label: 'Unverified' },
        partial: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', label: 'Partial' },
    }

    const config = statusConfig[execution.validation_status as keyof typeof statusConfig] || statusConfig.unverified
    const StatusIcon = config.icon

    return (
        <div className={`p-4 rounded-lg border ${config.bg}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                        <Badge variant="outline">{config.label}</Badge>
                        {execution.agent_name && <Badge variant="secondary">{execution.agent_name}</Badge>}
                        {execution.duration_ms && (
                            <span className="text-xs text-muted-foreground">{execution.duration_ms.toFixed(0)}ms</span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                            Confidence: <strong className={execution.confidence_score >= 0.8 ? 'text-green-600' : execution.confidence_score >= 0.5 ? 'text-yellow-600' : 'text-red-600'}>
                                {(execution.confidence_score * 100).toFixed(0)}%
                            </strong>
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(execution.timestamp).toLocaleString()}
                        </span>
                    </div>

                    {execution.hallucination_indicators.length > 0 && (
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Indicators:</span>
                            {execution.hallucination_indicators.map((indicator, idx) => (
                                <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <span className="text-orange-500">•</span>
                                    <span>{indicator}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {execution.error && (
                        <div className="text-xs text-red-600 dark:text-red-400">
                            Error: {execution.error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function MetricRow({
    label,
    value,
    highlight = false,
}: {
    label: string
    value: string
    highlight?: boolean
}) {
    return (
        <div className={`flex justify-between items-center ${highlight ? 'font-semibold' : ''}`}>
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={`text-sm ${highlight ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</span>
        </div>
    )
}

function ValidationStatusRow({
    label,
    count,
    percentage,
    variant,
}: {
    label: string
    count: number
    percentage: number
    variant: 'success' | 'danger' | 'warning'
}) {
    const colors = {
        success: 'text-green-600 dark:text-green-400',
        danger: 'text-red-600 dark:text-red-400',
        warning: 'text-orange-600 dark:text-orange-400',
    }

    return (
        <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{count}</span>
                <span className={`text-sm font-semibold ${colors[variant]}`}>
                    {percentage.toFixed(1)}%
                </span>
            </div>
        </div>
    )
}

function MetricsLoadingSkeleton() {
    return (
        <div className="space-y-6 p-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-6 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-6 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
