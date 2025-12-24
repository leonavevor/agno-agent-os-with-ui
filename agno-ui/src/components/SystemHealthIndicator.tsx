'use client'

import { useState } from 'react'
import { useAutoReconnect } from '@/hooks/useAutoReconnect'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/ui/icon'
import { motion, AnimatePresence } from 'framer-motion'

export function SystemHealthIndicator() {
    const [isExpanded, setIsExpanded] = useState(true)
    const { isConnected, isReconnecting, reconnectAttempts, reconnect, connectionState } =
        useAutoReconnect()

    const getStatusColor = () => {
        if (isConnected) return 'bg-emerald-500/80'
        if (isReconnecting) return 'bg-amber-500/80'
        return 'bg-rose-500/80'
    }

    const getStatusText = () => {
        if (isConnected) return 'Connected'
        if (isReconnecting) return `Reconnecting${reconnectAttempts > 0 ? ` (${reconnectAttempts})` : '...'}`
        return 'Disconnected'
    }

    const getStatusIcon = () => {
        if (isConnected) return 'check-circle'
        if (isReconnecting) return 'loader'
        return 'x-circle'
    }

    const formatTime = (timestamp: number | null) => {
        if (!timestamp) return 'Never'
        const seconds = Math.floor((Date.now() - timestamp) / 1000)
        if (seconds < 60) return `${seconds}s ago`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        return `${hours}h ago`
    }

    return (
        <div className="w-full rounded-xl border border-primary/15 bg-accent/30 overflow-hidden">
            {/* Header - Always Visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between px-3 py-2 transition-colors duration-200 hover:bg-accent"
            >
                <div className="flex items-center gap-2">
                    {/* Status Dot */}
                    <div className="relative">
                        <div
                            className={`h-2 w-2 rounded-full ${getStatusColor()} ${isReconnecting ? 'animate-pulse' : ''
                                }`}
                        />
                        {isConnected && (
                            <div
                                className={`absolute inset-0 h-2 w-2 animate-ping rounded-full ${getStatusColor()} opacity-75`}
                            />
                        )}
                    </div>

                    {/* Status Text */}
                    <span className="text-xs font-medium text-muted-foreground">
                        {getStatusText()}
                    </span>

                    {/* Status Icon */}
                    <Icon
                        type={getStatusIcon()}
                        size="xs"
                        className={isReconnecting ? 'animate-spin' : ''}
                    />
                </div>

                {/* Toggle Icon */}
                <Icon
                    type="chevron-down"
                    size="xs"
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expandable Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-2 border-t border-primary/10 px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-primary">System Status</span>
                                <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${isConnected
                                            ? 'bg-emerald-500/10 text-emerald-400/90'
                                            : isReconnecting
                                                ? 'bg-amber-500/10 text-amber-400/90'
                                                : 'bg-rose-500/10 text-rose-400/90'
                                        }`}
                                >
                                    {getStatusText()}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Backend:</span>
                                    <span
                                        className={
                                            connectionState.backendConnected
                                                ? 'text-emerald-400/80'
                                                : 'text-rose-400/80'
                                        }
                                    >
                                        {connectionState.backendConnected
                                            ? '● Connected'
                                            : '● Disconnected'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Database:</span>
                                    <span
                                        className={
                                            connectionState.databaseConnected
                                                ? 'text-emerald-400/80'
                                                : 'text-rose-400/80'
                                        }
                                    >
                                        {connectionState.databaseConnected
                                            ? '● Connected'
                                            : '● Disconnected'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Last Check:</span>
                                    <span className="text-muted">
                                        {formatTime(connectionState.lastChecked)}
                                    </span>
                                </div>

                                {isReconnecting && reconnectAttempts > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Retry Attempts:</span>
                                        <span className="text-amber-400/80">{reconnectAttempts}</span>
                                    </div>
                                )}
                            </div>

                            {connectionState.error && !isConnected && (
                                <div className="border-t border-primary/10 pt-2">
                                    <span className="text-muted-foreground">Error:</span>
                                    <p className="mt-1 text-rose-400/80">{connectionState.error}</p>
                                </div>
                            )}

                            {!isConnected && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        reconnect()
                                    }}
                                    disabled={isReconnecting}
                                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-primary/90 disabled:opacity-50"
                                >
                                    <Icon type="refresh" size="xs" className={isReconnecting ? 'animate-spin' : ''} />
                                    {isReconnecting ? 'Reconnecting...' : 'Reconnect Now'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
