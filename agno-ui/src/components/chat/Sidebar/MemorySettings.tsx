'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
    listMemorySessions,
    getMemoryStats,
    deleteMemorySession,
    clearAllMemorySessions,
    searchMemoryMessages,
    type MemorySession,
    type MemoryStats,
    type MemorySearchResult,
} from '@/api/advanced'

export default function MemorySettings() {
    const [isOpen, setIsOpen] = useState(false)
    const [sessions, setSessions] = useState<MemorySession[]>([])
    const [stats, setStats] = useState<MemoryStats | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [activeTab, setActiveTab] = useState<'sessions' | 'search'>('sessions')
    const { selectedEndpoint } = useStore()

    const loadSessions = async () => {
        setIsLoading(true)
        try {
            const data = await listMemorySessions(selectedEndpoint, 100)
            setSessions(data.sessions)
        } catch (error) {
            console.error('Failed to load memory sessions:', error)
            toast.error('Failed to load memory sessions')
        } finally {
            setIsLoading(false)
        }
    }

    const loadStats = async () => {
        try {
            const data = await getMemoryStats(selectedEndpoint)
            setStats(data)
        } catch (error) {
            console.error('Failed to load memory stats:', error)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadSessions()
            loadStats()
            // Auto-refresh every 5 seconds
            const interval = setInterval(() => {
                loadSessions()
                loadStats()
            }, 5000)
            return () => clearInterval(interval)
        }
    }, [isOpen])

    const handleDeleteSession = async (sessionId: string) => {
        try {
            await deleteMemorySession(selectedEndpoint, sessionId)
            setSessions(prev => prev.filter(s => s.session_id !== sessionId))
            loadStats() // Refresh stats
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
            const result = await clearAllMemorySessions(selectedEndpoint)
            setSessions([])
            loadStats() // Refresh stats
            toast.success(`Deleted ${result.sessions_deleted} sessions`)
        } catch (error) {
            console.error('Failed to clear all memory:', error)
            toast.error('Failed to clear all memory')
        } finally {
            setDeleteSessionId(null)
        }
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([])
            return
        }

        setIsSearching(true)
        try {
            const data = await searchMemoryMessages(selectedEndpoint, searchQuery, undefined, 50)
            setSearchResults(data.results)
            if (data.results.length === 0) {
                toast.info('No messages found matching your query')
            }
        } catch (error) {
            console.error('Failed to search messages:', error)
            toast.error('Failed to search messages')
        } finally {
            setIsSearching(false)
        }
    }

    const formatDate = (timestamp: string) => {
        try {
            return new Date(timestamp).toLocaleString()
        } catch {
            return timestamp
        }
    }

    const totalMessages = stats?.total_messages || 0
    const totalSessions = stats?.total_sessions || 0
    const sessionsWithFacts = stats?.sessions_with_facts || 0
    const avgMessages = stats?.average_messages_per_session?.toFixed(1) || '0'

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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Icon type="database" size="sm" />
                            Long-term Memory Management
                        </DialogTitle>
                        <DialogDescription>
                            Manage persistent memory sessions, search conversations, and view statistics
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-4 gap-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Sessions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{totalSessions}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Messages</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{totalMessages}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">With Facts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{sessionsWithFacts}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Avg Messages</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{avgMessages}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <Separator />

                        {/* Tab Navigation */}
                        <div className="flex gap-2 border-b">
                            <button
                                onClick={() => setActiveTab('sessions')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'sessions'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Icon type="database" size="xs" />
                                Sessions ({totalSessions})
                            </button>
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'search'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Icon type="search" size="xs" />
                                Search Messages
                            </button>
                        </div>

                        {/* Sessions Tab */}
                        {activeTab === 'sessions' && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">All Memory Sessions</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                loadSessions()
                                                loadStats()
                                            }}
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

                                <ScrollArea className="flex-1 rounded-md border">
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
                                                                        {session.session_id}
                                                                    </code>
                                                                    {session.has_facts && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            Has Facts
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                                                    <span>{session.message_count} messages</span>
                                                                    {session.user_id && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>User: {session.user_id}</span>
                                                                        </>
                                                                    )}
                                                                    <span>•</span>
                                                                    <span>Updated: {formatDate(session.updated_at)}</span>
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
                        )}

                        {/* Search Tab */}
                        {activeTab === 'search' && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="mb-3 flex gap-2">
                                    <Input
                                        placeholder="Search messages across all sessions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSearch()
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleSearch}
                                        disabled={isSearching || !searchQuery.trim()}
                                    >
                                        {isSearching ? (
                                            <Icon type="loader" size="xs" className="animate-spin" />
                                        ) : (
                                            <Icon type="search" size="xs" />
                                        )}
                                        Search
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1 rounded-md border">
                                    {searchResults.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 text-center">
                                            <Icon type="search" size="lg" className="mb-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">
                                                {searchQuery ? 'No messages found' : 'Enter a search query'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {searchQuery
                                                    ? 'Try different keywords or check spelling'
                                                    : 'Search across all memory sessions and messages'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 p-4">
                                            {searchResults.map((result) => (
                                                <Card key={result.id} className="transition-colors hover:bg-accent/50">
                                                    <CardContent className="p-4">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {result.role}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {formatDate(result.timestamp)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm">{result.content}</p>
                                                            <code className="text-xs font-mono text-muted-foreground">
                                                                Session: {result.session_id}
                                                            </code>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        )}

                        {/* Feature Info */}
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Icon type="info" size="xs" />
                                    About Long-term Memory
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1 text-xs text-muted-foreground">
                                <p>
                                    Memory sessions store chat history and learned facts in PostgreSQL with pgvector support.
                                </p>
                                <p>
                                    Use the search feature to find specific conversations across all sessions.
                                    Deleting a session removes all associated messages and facts.
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
