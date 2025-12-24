'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextArea } from '@/components/ui/textarea'
import { useStore } from '@/store'
import {
    getMCPServersAPI,
    createMCPServerAPI,
    updateMCPServerAPI,
    deleteMCPServerAPI
} from '@/api/os'
import { toast } from 'sonner'
import Icon from '@/components/ui/icon'
import { MCPServerMetadata, CreateMCPServerPayload } from '@/types/os'

interface MCPServersModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function MCPServersModal({ open, onOpenChange }: MCPServersModalProps) {
    const mcpServers = useStore((state) => state.mcpServers)
    const setMCPServers = useStore((state) => state.setMCPServers)
    const enabledMCPServers = useStore((state) => state.enabledMCPServers)
    const setEnabledMCPServers = useStore((state) => state.setEnabledMCPServers)
    const isMCPServersLoading = useStore((state) => state.isMCPServersLoading)
    const setIsMCPServersLoading = useStore((state) => state.setIsMCPServersLoading)
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const authToken = useStore((state) => state.authToken)

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [newServer, setNewServer] = useState<CreateMCPServerPayload>({
        name: '',
        description: '',
        command: '',
        args: [],
        env: {},
        transport: 'stdio',
        url: null,
        tags: [],
        version: '1.0.0'
    })
    const [tagInput, setTagInput] = useState('')
    const [argInput, setArgInput] = useState('')
    const [envKeyInput, setEnvKeyInput] = useState('')
    const [envValueInput, setEnvValueInput] = useState('')

    // Get all unique tags from servers
    const allTags = useMemo(() => {
        const tagSet = new Set<string>()
        mcpServers.forEach((server) => {
            server.tags.forEach((tag: string) => tagSet.add(tag))
        })
        return Array.from(tagSet).sort()
    }, [mcpServers])

    // Filter servers based on search and tags
    const filteredServers = useMemo(() => {
        let filtered = mcpServers

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (server) =>
                    server.name.toLowerCase().includes(query) ||
                    server.description.toLowerCase().includes(query) ||
                    server.command.toLowerCase().includes(query) ||
                    server.tags.some((tag: string) => tag.toLowerCase().includes(query))
            )
        }

        // Filter by selected tags
        if (selectedTags.length > 0) {
            filtered = filtered.filter((server) =>
                selectedTags.some((tag) => server.tags.includes(tag))
            )
        }

        return filtered
    }, [mcpServers, searchQuery, selectedTags])

    const handleReload = async () => {
        if (!selectedEndpoint) return
        setIsMCPServersLoading(true)
        try {
            const servers = await getMCPServersAPI(selectedEndpoint, authToken)
            setMCPServers(servers)
            // Auto-enable all enabled servers
            const enabled = new Set(servers.filter(s => s.enabled).map(s => s.id))
            setEnabledMCPServers(enabled)
            toast.success(`Loaded ${servers.length} MCP servers`)
        } catch (error) {
            toast.error('Failed to load MCP servers')
        } finally {
            setIsMCPServersLoading(false)
        }
    }

    const handleToggleServer = async (serverId: string) => {
        const server = mcpServers.find(s => s.id === serverId)
        if (!server) return

        const newEnabled = !enabledMCPServers.has(serverId)

        // Update backend
        const updated = await updateMCPServerAPI(
            selectedEndpoint,
            serverId,
            { enabled: newEnabled },
            authToken
        )

        if (updated) {
            // Update local state
            const newEnabledServers = new Set(enabledMCPServers)
            if (newEnabled) {
                newEnabledServers.add(serverId)
            } else {
                newEnabledServers.delete(serverId)
            }
            setEnabledMCPServers(newEnabledServers)

            // Update server in list
            setMCPServers(mcpServers.map(s =>
                s.id === serverId ? { ...s, enabled: newEnabled } : s
            ))
        }
    }

    const handleToggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        )
    }

    const handleEnableAll = async () => {
        const allIds = filteredServers.map((s) => s.id)
        for (const id of allIds) {
            await updateMCPServerAPI(selectedEndpoint, id, { enabled: true }, authToken)
        }
        setEnabledMCPServers(new Set(allIds))
        await handleReload()
        toast.success(`Enabled ${allIds.length} servers`)
    }

    const handleDisableAll = async () => {
        const filteredIds = new Set(filteredServers.map((s) => s.id))
        for (const id of filteredIds) {
            await updateMCPServerAPI(selectedEndpoint, id, { enabled: false }, authToken)
        }
        const newEnabledServers = new Set(
            Array.from(enabledMCPServers).filter((id) => !filteredIds.has(id))
        )
        setEnabledMCPServers(newEnabledServers)
        await handleReload()
        toast.success(`Disabled ${filteredIds.size} servers`)
    }

    const handleCreateServer = async () => {
        if (!newServer.name.trim() || !newServer.description.trim() || !newServer.command.trim()) {
            toast.error('Name, description, and command are required')
            return
        }

        const result = await createMCPServerAPI(selectedEndpoint, newServer, authToken)
        if (result) {
            // Add the new server to the list
            setMCPServers([...mcpServers, result.server])

            // Reset form
            setNewServer({
                name: '',
                description: '',
                command: '',
                args: [],
                env: {},
                transport: 'stdio',
                url: null,
                tags: [],
                version: '1.0.0'
            })
            setTagInput('')
            setArgInput('')
            setEnvKeyInput('')
            setEnvValueInput('')
            setIsCreating(false)
        }
    }

    const handleDeleteServer = async (serverId: string) => {
        if (!confirm('Are you sure you want to delete this MCP server?')) return

        const success = await deleteMCPServerAPI(selectedEndpoint, serverId, authToken)
        if (success) {
            setMCPServers(mcpServers.filter(s => s.id !== serverId))
            const newEnabled = new Set(enabledMCPServers)
            newEnabled.delete(serverId)
            setEnabledMCPServers(newEnabled)
        }
    }

    const handleAddTag = () => {
        const tag = tagInput.trim()
        if (tag && !newServer.tags?.includes(tag)) {
            setNewServer({ ...newServer, tags: [...(newServer.tags || []), tag] })
            setTagInput('')
        }
    }

    const handleRemoveTag = (tag: string) => {
        setNewServer({ ...newServer, tags: newServer.tags?.filter((t) => t !== tag) || [] })
    }

    const handleAddArg = () => {
        const arg = argInput.trim()
        if (arg) {
            setNewServer({ ...newServer, args: [...(newServer.args || []), arg] })
            setArgInput('')
        }
    }

    const handleRemoveArg = (index: number) => {
        setNewServer({
            ...newServer,
            args: newServer.args?.filter((_, i) => i !== index) || []
        })
    }

    const handleAddEnv = () => {
        const key = envKeyInput.trim()
        const value = envValueInput.trim()
        if (key && value) {
            setNewServer({
                ...newServer,
                env: { ...(newServer.env || {}), [key]: value }
            })
            setEnvKeyInput('')
            setEnvValueInput('')
        }
    }

    const handleRemoveEnv = (key: string) => {
        const newEnv = { ...(newServer.env || {}) }
        delete newEnv[key]
        setNewServer({ ...newServer, env: newEnv })
    }

    const enabledCount = filteredServers.filter((s) => enabledMCPServers.has(s.id)).length

    // Load servers when modal opens
    useEffect(() => {
        if (open && selectedEndpoint) {
            handleReload()
        }
    }, [open, selectedEndpoint])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-xl border-primary/15 font-dmmono">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="text-lg font-semibold uppercase">MCP Servers</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReload}
                            disabled={isMCPServersLoading}
                            className="h-8 text-xs"
                        >
                            <Icon
                                type="refresh"
                                size="xs"
                                className={isMCPServersLoading ? 'animate-spin' : ''}
                            />
                            <span className="ml-1">Reload</span>
                        </Button>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Manage Model Context Protocol servers. {enabledCount} of {filteredServers.length}{' '}
                        {selectedTags.length > 0 || searchQuery ? 'filtered ' : ''}servers enabled
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                    {/* Create new server form */}
                    {isCreating ? (
                        <div className="rounded-xl border border-primary/20 bg-accent/30 p-4 space-y-3 overflow-y-auto max-h-[60vh]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase text-primary">
                                    Create New MCP Server
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsCreating(false)}
                                    className="h-6 w-6"
                                >
                                    <Icon type="x" size="xs" />
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="server-name" className="text-xs">
                                        Server Name *
                                    </Label>
                                    <Input
                                        id="server-name"
                                        value={newServer.name}
                                        onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                                        placeholder="GitHub MCP Server"
                                        className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="server-description" className="text-xs">
                                        Description *
                                    </Label>
                                    <TextArea
                                        id="server-description"
                                        value={newServer.description}
                                        onChange={(e) =>
                                            setNewServer({ ...newServer, description: e.target.value })
                                        }
                                        placeholder="Describe what this MCP server provides..."
                                        className="rounded-xl border-primary/15 bg-accent text-xs min-h-[60px]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="server-command" className="text-xs">
                                        Command *
                                    </Label>
                                    <Input
                                        id="server-command"
                                        value={newServer.command}
                                        onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                                        placeholder="npx"
                                        className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="server-args" className="text-xs">
                                        Arguments
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            id="server-args"
                                            value={argInput}
                                            onChange={(e) => setArgInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArg())}
                                            placeholder="Add argument..."
                                            className="h-9 rounded-xl border-primary/15 bg-accent text-xs flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddArg}
                                            className="h-9 rounded-xl text-xs"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {(newServer.args?.length || 0) > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newServer.args?.map((arg, idx) => (
                                                <span
                                                    key={idx}
                                                    className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary flex items-center gap-1"
                                                >
                                                    {arg}
                                                    <button
                                                        onClick={() => handleRemoveArg(idx)}
                                                        className="hover:text-rose-400/90"
                                                    >
                                                        <Icon type="x" size="xxs" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Environment Variables</Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={envKeyInput}
                                            onChange={(e) => setEnvKeyInput(e.target.value)}
                                            placeholder="KEY"
                                            className="h-9 rounded-xl border-primary/15 bg-accent text-xs flex-1"
                                        />
                                        <Input
                                            value={envValueInput}
                                            onChange={(e) => setEnvValueInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEnv())}
                                            placeholder="value"
                                            className="h-9 rounded-xl border-primary/15 bg-accent text-xs flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddEnv}
                                            className="h-9 rounded-xl text-xs"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {Object.keys(newServer.env || {}).length > 0 && (
                                        <div className="space-y-1 mt-2">
                                            {Object.entries(newServer.env || {}).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="flex items-center justify-between rounded-md bg-secondary px-2 py-1.5 text-[10px]"
                                                >
                                                    <span className="font-medium text-muted-foreground">
                                                        {key}={value}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveEnv(key)}
                                                        className="hover:text-rose-400/90"
                                                    >
                                                        <Icon type="x" size="xxs" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="server-transport" className="text-xs">
                                        Transport
                                    </Label>
                                    <select
                                        id="server-transport"
                                        value={newServer.transport}
                                        onChange={(e) => setNewServer({ ...newServer, transport: e.target.value })}
                                        className="h-9 w-full rounded-xl border border-primary/15 bg-accent px-3 text-xs"
                                    >
                                        <option value="stdio">stdio</option>
                                        <option value="sse">SSE</option>
                                        <option value="http">HTTP</option>
                                    </select>
                                </div>

                                {(newServer.transport === 'sse' || newServer.transport === 'http') && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="server-url" className="text-xs">
                                            URL
                                        </Label>
                                        <Input
                                            id="server-url"
                                            value={newServer.url || ''}
                                            onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                                            placeholder="https://mcp-server.example.com"
                                            className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="server-tags" className="text-xs">
                                        Tags
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            id="server-tags"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            placeholder="Add tag..."
                                            className="h-9 rounded-xl border-primary/15 bg-accent text-xs flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddTag}
                                            className="h-9 rounded-xl text-xs"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {(newServer.tags?.length || 0) > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newServer.tags?.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-primary flex items-center gap-1"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="hover:text-rose-400/90"
                                                    >
                                                        <Icon type="x" size="xxs" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="server-version" className="text-xs">
                                        Version
                                    </Label>
                                    <Input
                                        id="server-version"
                                        value={newServer.version}
                                        onChange={(e) => setNewServer({ ...newServer, version: e.target.value })}
                                        placeholder="1.0.0"
                                        className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                    />
                                </div>

                                <div className="flex gap-2 justify-end pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsCreating(false)}
                                        className="h-9 text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleCreateServer}
                                        disabled={
                                            !newServer.name.trim() ||
                                            !newServer.description.trim() ||
                                            !newServer.command.trim()
                                        }
                                        className="h-9 text-xs"
                                    >
                                        <Icon type="plus-icon" size="xs" />
                                        <span className="ml-1">Create Server</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => setIsCreating(true)}
                            className="h-9 rounded-xl text-xs font-medium uppercase"
                        >
                            <Icon type="plus-icon" size="xs" />
                            <span className="ml-2">New MCP Server</span>
                        </Button>
                    )}

                    {/* Search and filters */}
                    {!isCreating && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Icon
                                        type="search"
                                        size="xs"
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search MCP servers by name, description, or command..."
                                        className="h-9 w-full rounded-xl border border-primary/15 bg-accent pl-9 pr-3 text-xs text-muted placeholder:text-muted/60 focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleEnableAll}
                                    disabled={enabledCount === filteredServers.length}
                                    className="h-9 rounded-xl text-xs uppercase"
                                >
                                    Enable All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDisableAll}
                                    disabled={enabledCount === 0}
                                    className="h-9 rounded-xl text-xs uppercase"
                                >
                                    Disable All
                                </Button>
                            </div>

                            {/* Tag filters */}
                            {allTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {allTags.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => handleToggleTag(tag)}
                                            className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${selectedTags.includes(tag)
                                                    ? 'bg-primary text-background'
                                                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                    {selectedTags.length > 0 && (
                                        <button
                                            onClick={() => setSelectedTags([])}
                                            className="rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide bg-rose-500/10 text-rose-400/90 hover:bg-rose-500/20"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Servers list */}
                            <div className="flex-1 overflow-y-auto pr-2">
                                {isMCPServersLoading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="h-32 animate-pulse rounded-xl border border-primary/10 bg-accent/30"
                                            />
                                        ))}
                                    </div>
                                ) : filteredServers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Icon type="database" size="lg" className="text-muted-foreground/50 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            {mcpServers.length === 0
                                                ? 'No MCP servers configured. Create one to get started.'
                                                : 'No servers match your search or filters.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredServers.map((server) => (
                                            <MCPServerCard
                                                key={server.id}
                                                server={server}
                                                enabled={enabledMCPServers.has(server.id)}
                                                onToggle={() => handleToggleServer(server.id)}
                                                onDelete={() => handleDeleteServer(server.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

interface MCPServerCardProps {
    server: MCPServerMetadata
    enabled: boolean
    onToggle: () => void
    onDelete: () => void
}

function MCPServerCard({ server, enabled, onToggle, onDelete }: MCPServerCardProps) {
    return (
        <div
            className={`rounded-xl border p-3 transition-colors ${enabled
                    ? 'border-primary/30 bg-accent/50'
                    : 'border-primary/10 bg-accent/20 opacity-60'
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold uppercase text-primary truncate">
                            {server.name}
                        </h3>
                        {server.version && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                                v{server.version}
                            </span>
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            {server.transport}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                        {server.description || 'No description provided.'}
                    </p>
                    <div className="text-[10px] font-mono text-muted-foreground/70 mb-2">
                        {server.command} {server.args?.join(' ')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {server.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="h-8 w-8 text-rose-400/90 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                        <Icon type="trash" size="xs" />
                    </Button>
                    <Switch
                        checked={enabled}
                        onCheckedChange={onToggle}
                        aria-label={`Toggle ${server.name}`}
                    />
                </div>
            </div>
        </div>
    )
}
