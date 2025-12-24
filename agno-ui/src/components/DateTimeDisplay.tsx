'use client'

import { useEffect, useState } from 'react'

export function DateTimeDisplay() {
    const [dateTime, setDateTime] = useState({
        date: '',
        time: ''
    })

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date()

            // Format date: Dec 24
            const date = now.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })

            // Format time: 10:45 AM
            const time = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })

            setDateTime({ date, time })
        }

        // Update immediately
        updateDateTime()

        // Update every second
        const interval = setInterval(updateDateTime, 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">
                {dateTime.date}
            </span>
            <span className="text-xs font-semibold text-primary">
                {dateTime.time}
            </span>
        </div>
    )
}
