/**
 * ValidationBadge - Display validation status for individual messages
 */

'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle2, AlertTriangle, XCircle, AlertCircle, HelpCircle } from 'lucide-react'

interface ValidationBadgeProps {
    status: 'valid' | 'hallucination' | 'invalid' | 'unverified' | 'partial'
    confidence?: number
    indicators?: string[]
    compact?: boolean
}

export function ValidationBadge({ status, confidence, indicators, compact = false }: ValidationBadgeProps) {
    const statusConfig = {
        valid: {
            icon: CheckCircle2,
            label: 'Valid',
            color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            iconColor: 'text-green-600',
        },
        hallucination: {
            icon: AlertTriangle,
            label: 'Hallucination',
            color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            iconColor: 'text-red-600',
        },
        invalid: {
            icon: XCircle,
            label: 'Invalid',
            color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            iconColor: 'text-orange-600',
        },
        partial: {
            icon: AlertCircle,
            label: 'Partial',
            color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            iconColor: 'text-yellow-600',
        },
        unverified: {
            icon: HelpCircle,
            label: 'Unverified',
            color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
            iconColor: 'text-gray-600',
        },
    }

    const config = statusConfig[status]
    const Icon = config.icon

    const tooltipContent = (
        <div className="space-y-2 max-w-xs">
            <div className="font-semibold">Validation Status: {config.label}</div>
            {confidence !== undefined && (
                <div className="text-sm">
                    Confidence: <span className="font-mono">{(confidence * 100).toFixed(1)}%</span>
                </div>
            )}
            {indicators && indicators.length > 0 && (
                <div className="text-sm space-y-1">
                    <div className="font-medium">Indicators:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                        {indicators.slice(0, 5).map((indicator, idx) => (
                            <li key={idx} className="text-xs">
                                {indicator}
                            </li>
                        ))}
                        {indicators.length > 5 && <li className="text-xs italic">+{indicators.length - 5} more...</li>}
                    </ul>
                </div>
            )}
        </div>
    )

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${config.color} cursor-help`}>
                            <Icon className={`h-3 w-3 ${config.iconColor}`} />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>{tooltipContent}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant="outline" className={`${config.color} cursor-help gap-1`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                        {confidence !== undefined && <span className="ml-1 font-mono text-xs">({(confidence * 100).toFixed(0)}%)</span>}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

/**
 * PerformanceBadge - Display performance metrics for individual messages
 */
interface PerformanceBadgeProps {
    durationMs: number
    compact?: boolean
}

export function PerformanceBadge({ durationMs, compact = false }: PerformanceBadgeProps) {
    const getPerformanceColor = (ms: number) => {
        if (ms < 500) return 'text-green-600 dark:text-green-400'
        if (ms < 2000) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-red-600 dark:text-red-400'
    }

    const getPerformanceLabel = (ms: number) => {
        if (ms < 500) return 'Fast'
        if (ms < 2000) return 'Normal'
        return 'Slow'
    }

    const displayValue = durationMs < 1000 ? `${durationMs.toFixed(0)}ms` : `${(durationMs / 1000).toFixed(1)}s`

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={`text-xs font-mono ${getPerformanceColor(durationMs)} cursor-help`}>
                            {displayValue}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="space-y-1">
                            <div className="font-semibold">Performance: {getPerformanceLabel(durationMs)}</div>
                            <div className="text-sm">Response time: {displayValue}</div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Badge variant="outline" className="gap-1">
            <span className={getPerformanceColor(durationMs)}>{displayValue}</span>
        </Badge>
    )
}
