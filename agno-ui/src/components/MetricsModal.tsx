/**
 * MetricsModal - Pop-up modal for viewing performance and validation metrics
 */

'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MetricsDashboard } from './MetricsDashboard'

interface MetricsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    apiUrl: string
}

export function MetricsModal({ open, onOpenChange, apiUrl }: MetricsModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Performance & Validation Metrics</DialogTitle>
                    <DialogDescription>
                        Monitor agent performance and track truth vs hallucination in real-time
                    </DialogDescription>
                </DialogHeader>
                <MetricsDashboard apiUrl={apiUrl} />
            </DialogContent>
        </Dialog>
    )
}
