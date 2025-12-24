'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useStore } from '@/store'
import { getMemorySessionHistory, deleteMemorySession } from '@/api/advanced'

interface MemorySession {
    session_id: string
    message_count: number
    last_activity: string
    facts_count: number
}

export default function MemorySettings() {
    const [isOpen, setIsOpen] = useState(false)
    const [sessions, setSessions] = useState<MemorySession[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)
    const { selectedEndpoint } = useStore()

    const loadSessions = async () => {
        setIsLoading(true)
        try {
            // Get all sessions from localStorage/store
            const storedSessions = JSON.parse(localStorage.getItem('memory-sessions') || '[]')

            // Fetch details for each session
            const sessionDetails = await Promise.all(
                storedSessions.map(async (sessionId: string) => {
                    try {
                        const history = await getMemorySessionHistory(selectedEndpoint, sessionId)
                        return {
                            session_id: sessionId,
                            message_count: history.messages?.length || 0,
                            last_activity: history.messages?.[history.messages.length - 1]?.timestamp || 'Unknown',
                            facts_count: 0 // Could fetch from learned facts endpoint
                        }
                    } catch (error) {
                        return null
                    }
                })
            )

            setSessions(sessionDetails.filter(Boolean) as MemorySession[])
        } catch (error) {
            console.error('Failed to load memory sessions:', error)
            toast.error('Failed to load memory sessions')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadSessions()
        }
    }, [isOpen])

    const handleDeleteSession = async (sessionId: string) => {
        try {
            await deleteMemorySession(selectedEndpoint, sessionId)

            // Remove from localStorage
            const storedSessions = JSON.parse(localStorage.getItem('memory-sessions') || '[]')
            const updated = storedSessions.filter((id: string) => id !== sessionId)
            localStorage.setItem('memory-sessions', JSON.stringify(updated))

            // Update UI
            setSessions(prev => prev.filter(s => s.session_id !== sessionId))

            toast.success('Memory session deleted')
        } catch (error) {
            console.error('Failed to delete session:', error)
            toast.error('Failed to delete memory session')
        } finally {
            setDeleteSessionId(null)
        }
    }

    const handleClearAllMemory = async () => {
        try {
            const storedSessions = JSON.parse(localStorage.getItem('memory-sessions') || '[]')

            // Delete all sessions
            await Promise.all(
                storedSessions.map((sessionId: string) =>
                    deleteMemorySession(selectedEndpoint, sessionId)
                )
            )

            // Clear localStorage
            localStorage.removeItem('memory-sessions')

            // Update UI
            setSessions([])

            toast.success('All memory cleared')
        } catch (error) {
            console.error('Failed to clear all memory:', error)
            toast.error('Failed to clear all memory')
        }
    }

    const formatDate = (timestamp: string) => {
        try {
            return new Date(timestamp).toLocaleString()
        } catch {
            return timestamp
        }
    }

    const totalMessages = sessions.reduce((sum, s) => sum + s.message_count, 0)
    const totalSessions = sessions.length

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-full justify-start gap-2 rounded-xl text-xs font-medium text-muted hover:bg-accent hover:text-foreground"
                    >
                        <Icon type="database" size="xs" />
                        <span>Memory Settings</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Icon type="database" size="sm" />
                            Memory Management
                        </DialogTitle>
                        <DialogDescription>
                            Manage persistent memory sessions and learned facts
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{totalSessions}</div>
                                    <p className="text-xs text-muted-foreground">Active memory sessions</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Messages</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{totalMessages}</div>
                                    <p className="text-xs text-muted-foreground">Total stored messages</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Badge variant="outline" className="text-xs">
                                        {process.env.NEXT_PUBLIC_ENABLE_MEMORY === 'true' ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                    <p className="mt-1 text-xs text-muted-foreground">Memory feature</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Separator />

                        {/* Sessions List */}
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Memory Sessions</h3>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadSessions}
                                        disabled={isLoading}
                                    >
                                        <Icon type="refresh" size="xs" className={isLoading ? 'animate-spin' : ''} />
                                        Refresh
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setDeleteSessionId('all')}
                                        disabled={sessions.length === 0}
                                    >
                                        <Icon type="trash" size="xs" />
                                        Clear All
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="h-[300px] rounded-md border">
                                {isLoading ? (
                                    <div className="flex items-center justify-center p-8">
                                        <Icon type="loader" size="sm" className="animate-spin" />
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-center">
                                        <Icon type="database" size="lg" className="mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">No memory sessions found</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Sessions are created automatically when you enable memory in chat
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 p-4">
                                        {sessions.map((session) => (
                                            <Card key={session.session_id} className="transition-colors hover:bg-accent/50">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-xs font-mono text-muted-foreground">
                                                                    {session.session_id.slice(0, 16)}...
                                                                </code>
                                                            </div>
                                                            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                                                <span>{session.message_count} messages</span>
                                                                <span>•</span>
                                                                <span>Last: {formatDate(session.last_activity)}</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeleteSessionId(session.session_id)}
                                                            className="text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Icon type="trash" size="xs" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Feature Info */}
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Icon type="info" size="xs" />
                                    About Memory
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs text-muted-foreground">
                                <p>
                                    Memory sessions store chat history and learned facts in PostgreSQL with pgvector support.
                                </p>
                                <p>
                                    Sessions are automatically created when you start a conversation with memory enabled.
                                    Deleting a session removes all associated messages and learned facts.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteSessionId !== null} onOpenChange={() => setDeleteSessionId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteSessionId === 'all' ? 'Clear All Memory?' : 'Delete Memory Session?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteSessionId === 'all'
                                ? `This will permanently delete all ${totalSessions} memory sessions and ${totalMessages} messages. This action cannot be undone.`
                                : 'This will permanently delete this memory session and all associated messages. This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() =>
                                deleteSessionId === 'all'
                                    ? handleClearAllMemory()
                                    : handleDeleteSession(deleteSessionId!)
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteSessionId === 'all' ? 'Clear All' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
