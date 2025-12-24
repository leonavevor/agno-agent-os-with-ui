/**
 * Memory Management Panel
 * Displays chat history and learned facts for the current session
 */

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { getChatHistory, getLearnedFacts } from '@/api/advanced'
import type { ChatMessage, LearnedFacts } from '@/api/advanced'
import { Brain, History, RefreshCw } from 'lucide-react'

interface MemoryPanelProps {
    endpoint: string
    sessionId: string
    authToken?: string
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
    endpoint,
    sessionId,
    authToken
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [facts, setFacts] = useState<LearnedFacts | null>(null)
    const [loading, setLoading] = useState(false)
    const [messageCount, setMessageCount] = useState(0)

    const loadMemoryData = async () => {
        setLoading(true)
        try {
            const [historyData, factsData] = await Promise.all([
                getChatHistory(endpoint, sessionId, 20, authToken),
                getLearnedFacts(endpoint, sessionId, authToken)
            ])

            setMessages(historyData.messages)
            setMessageCount(historyData.total)
            setFacts(factsData)
        } catch (error) {
            console.error('Failed to load memory data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (sessionId) {
            loadMemoryData()
        }
    }, [sessionId])

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleString()
    }

    return (
        <div className="space-y-4">
            {/* Chat History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            <CardTitle>Chat History</CardTitle>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMemoryData}
                            disabled={loading}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                            />
                        </Button>
                    </div>
                    <CardDescription>
                        Last {messages.length} of {messageCount} messages
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        {messages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No messages in history yet
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    msg.role === 'user'
                                                        ? 'default'
                                                        : msg.role === 'assistant'
                                                            ? 'secondary'
                                                            : 'outline'
                                                }
                                            >
                                                {msg.role}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(msg.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm">{msg.content.slice(0, 200)}</p>
                                        {msg.content.length > 200 && (
                                            <span className="text-xs text-muted-foreground">
                                                ...
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Learned Facts */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        <CardTitle>Learned Facts</CardTitle>
                    </div>
                    <CardDescription>
                        Persistent knowledge about user preferences and context
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!facts?.facts ? (
                        <p className="text-sm text-muted-foreground">
                            No learned facts yet
                        </p>
                    ) : (
                        <div className="rounded-md border p-4">
                            <pre className="text-sm whitespace-pre-wrap">
                                {JSON.stringify(JSON.parse(facts.facts), null, 2)}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
