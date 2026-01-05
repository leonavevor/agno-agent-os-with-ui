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
    getToolsAPI,
    createToolAPI,
    updateToolAPI,
    deleteToolAPI,
    getExternalToolSettingsAPI,
    updateExternalToolSettingsAPI
} from '@/api/os'
import { toast } from 'sonner'
import Icon from '@/components/ui/icon'
import { ToolMetadata, CreateToolPayload } from '@/types/os'

interface ToolsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ToolsModal({ open, onOpenChange }: ToolsModalProps) {
    const tools = useStore((state) => state.tools)
    const setTools = useStore((state) => state.setTools)
    const enabledTools = useStore((state) => state.enabledTools)
    const setEnabledTools = useStore((state) => state.setEnabledTools)
    const isToolsLoading = useStore((state) => state.isToolsLoading)
    const setIsToolsLoading = useStore((state) => state.setIsToolsLoading)
    const externalToolAccess = useStore((state) => state.externalToolAccess)
    const setExternalToolAccess = useStore((state) => state.setExternalToolAccess)
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const authToken = useStore((state) => state.authToken)

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [newTool, setNewTool] = useState<CreateToolPayload>({
        name: '',
        description: '',
        language: 'python',
        code: '',
        params: {},
        tags: [],
        is_external: false,
        version: '1.0.0'
    })
    const [tagInput, setTagInput] = useState('')

    const allTags = useMemo(() => {
        const tagSet = new Set<string>()
        tools.forEach((tool) => {
            tool.tags.forEach((tag: string) => tagSet.add(tag))
        })
        return Array.from(tagSet).sort()
    }, [tools])

    const filteredTools = useMemo(() => {
        let filtered = tools

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (tool) =>
                    tool.name.toLowerCase().includes(query) ||
                    tool.description.toLowerCase().includes(query) ||
                    tool.language.toLowerCase().includes(query) ||
                    tool.tags.some((tag: string) => tag.toLowerCase().includes(query))
            )
        }

        if (selectedTags.length > 0) {
            filtered = filtered.filter((tool) =>
                selectedTags.some((tag) => tool.tags.includes(tag))
            )
        }

        return filtered
    }, [tools, searchQuery, selectedTags])

    const handleReload = async () => {
        if (!selectedEndpoint) return
        setIsToolsLoading(true)
        try {
            const [fetchedTools, settings] = await Promise.all([
                getToolsAPI(selectedEndpoint, true, authToken),
                getExternalToolSettingsAPI(selectedEndpoint, authToken)
            ])
            setTools(fetchedTools)
            if (settings) setExternalToolAccess(settings)
            const enabled = new Set(fetchedTools.filter(t => t.enabled).map(t => t.id))
            setEnabledTools(enabled)
            toast.success(`Loaded ${fetchedTools.length} tools`)
        } catch (error) {
            toast.error('Failed to load tools')
        } finally {
            setIsToolsLoading(false)
        }
    }

    const handleToggleTool = async (toolId: string) => {
        const tool = tools.find(t => t.id === toolId)
        if (!tool) return

        const newEnabled = !enabledTools.has(toolId)

        const updated = await updateToolAPI(
            selectedEndpoint,
            toolId,
            { enabled: newEnabled },
            authToken
        )

        if (updated) {
            const newEnabledTools = new Set(enabledTools)
            if (newEnabled) {
                newEnabledTools.add(toolId)
            } else {
                newEnabledTools.delete(toolId)
            }
            setEnabledTools(newEnabledTools)
            setTools(tools.map(t => t.id === toolId ? { ...t, enabled: newEnabled } : t))
        }
    }

    const handleToggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        )
    }

    const handleEnableAll = async () => {
        const allIds = filteredTools.map((t) => t.id)
        for (const id of allIds) {
            await updateToolAPI(selectedEndpoint, id, { enabled: true }, authToken)
        }
        setEnabledTools(new Set(allIds))
        await handleReload()
        toast.success(`Enabled ${allIds.length} tools`)
    }

    const handleDisableAll = async () => {
        const filteredIds = new Set(filteredTools.map((t) => t.id))
        for (const id of filteredIds) {
            await updateToolAPI(selectedEndpoint, id, { enabled: false }, authToken)
        }
        const newEnabledTools = new Set(
            Array.from(enabledTools).filter((id) => !filteredIds.has(id))
        )
        setEnabledTools(newEnabledTools)
        await handleReload()
        toast.success(`Disabled ${filteredIds.size} tools`)
    }

    const handleCreateTool = async () => {
        if (!newTool.name.trim() || !newTool.description.trim() || !newTool.code.trim()) {
            toast.error('Name, description, and code are required')
            return
        }

        const result = await createToolAPI(selectedEndpoint, newTool, authToken)
        if (result) {
            setTools([...tools, result.tool])
            setNewTool({
                name: '',
                description: '',
                language: 'python',
                code: '',
                params: {},
                tags: [],
                is_external: false,
                version: '1.0.0'
            })
            setTagInput('')
            setIsCreating(false)
        }
    }

    const handleDeleteTool = async (toolId: string) => {
        if (!confirm('Are you sure you want to delete this tool?')) return

        const success = await deleteToolAPI(selectedEndpoint, toolId, authToken)
        if (success) {
            setTools(tools.filter(t => t.id !== toolId))
            const newEnabled = new Set(enabledTools)
            newEnabled.delete(toolId)
            setEnabledTools(newEnabled)
        }
    }

    const handleAddTag = () => {
        const tag = tagInput.trim()
        if (tag && !newTool.tags?.includes(tag)) {
            setNewTool({ ...newTool, tags: [...(newTool.tags || []), tag] })
            setTagInput('')
        }
    }

    const handleRemoveTag = (tag: string) => {
        setNewTool({ ...newTool, tags: newTool.tags?.filter((t) => t !== tag) || [] })
    }

    const handleUpdateExternalAccess = async (enabled: boolean) => {
        if (!externalToolAccess) return
        const updated = await updateExternalToolSettingsAPI(
            selectedEndpoint,
            { ...externalToolAccess, enabled },
            authToken
        )
        if (updated) {
            setExternalToolAccess(updated)
        }
    }

    const enabledCount = filteredTools.filter((t) => enabledTools.has(t.id)).length
    const externalTools = tools.filter(t => t.is_external)

    useEffect(() => {
        if (open && selectedEndpoint) {
            handleReload()
        }
    }, [open, selectedEndpoint])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col rounded-xl border-primary/15 font-dmmono">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="text-lg font-semibold uppercase">Tools Management</span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSettings(!showSettings)}
                                className="h-8 text-xs"
                            >
                                <Icon type="edit" size="xs" />
                                <span className="ml-1">Settings</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReload}
                                disabled={isToolsLoading}
                                className="h-8 text-xs"
                            >
                                <Icon
                                    type="refresh"
                                    size="xs"
                                    className={isToolsLoading ? 'animate-spin' : ''}
                                />
                                <span className="ml-1">Reload</span>
                            </Button>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Manage code/script tools. {enabledCount} of {filteredTools.length} tools enabled
                        {externalTools.length > 0 && (
                            <> • {externalTools.length} require external access</>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {showSettings && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold uppercase text-amber-600 dark:text-amber-400">
                                    External Tool Access
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Control execution of tools that access external resources or networks
                                </p>
                            </div>
                            <Switch
                                checked={externalToolAccess?.enabled || false}
                                onCheckedChange={handleUpdateExternalAccess}
                                aria-label="Toggle external tool access"
                            />
                        </div>
                        {externalToolAccess?.enabled && (
                            <div className="text-xs bg-amber-500/10 p-2 rounded-lg">
                                ⚠️ External tools can access network, files, and execute system commands
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                    {isCreating ? (
                        <div className="rounded-xl border border-primary/20 bg-accent/30 p-4 space-y-3 overflow-y-auto max-h-[60vh]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase text-primary">
                                    Create New Tool
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
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="tool-name" className="text-xs">
                                            Tool Name *
                                        </Label>
                                        <Input
                                            id="tool-name"
                                            value={newTool.name}
                                            onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                                            placeholder="My Tool"
                                            className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="tool-language" className="text-xs">
                                            Language *
                                        </Label>
                                        <select
                                            id="tool-language"
                                            value={newTool.language}
                                            onChange={(e) => setNewTool({ ...newTool, language: e.target.value })}
                                            className="h-9 w-full rounded-xl border border-primary/15 bg-accent px-3 text-xs"
                                        >
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="typescript">TypeScript</option>
                                            <option value="bash">Bash</option>
                                            <option value="shell">Shell</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="tool-description" className="text-xs">
                                        Description *
                                    </Label>
                                    <TextArea
                                        id="tool-description"
                                        value={newTool.description}
                                        onChange={(e) =>
                                            setNewTool({ ...newTool, description: e.target.value })
                                        }
                                        placeholder="What does this tool do..."
                                        className="rounded-xl border-primary/15 bg-accent text-xs min-h-[60px]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="tool-code" className="text-xs">
                                        Code *
                                    </Label>
                                    <TextArea
                                        id="tool-code"
                                        value={newTool.code}
                                        onChange={(e) => setNewTool({ ...newTool, code: e.target.value })}
                                        placeholder="def my_tool():\n    # Your code here\n    pass"
                                        className="rounded-xl border-primary/15 bg-accent text-xs min-h-[150px] font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="tool-tags" className="text-xs">
                                        Tags
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            id="tool-tags"
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
                                    {(newTool.tags?.length || 0) > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newTool.tags?.map((tag) => (
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

                                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <Switch
                                        checked={newTool.is_external || false}
                                        onCheckedChange={(checked) =>
                                            setNewTool({ ...newTool, is_external: checked })
                                        }
                                        aria-label="External tool"
                                    />
                                    <Label className="text-xs cursor-pointer">
                                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                                            External Tool
                                        </span>
                                        <span className="block text-muted-foreground mt-0.5">
                                            Requires network access or external resources
                                        </span>
                                    </Label>
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
                                        onClick={handleCreateTool}
                                        disabled={
                                            !newTool.name.trim() ||
                                            !newTool.description.trim() ||
                                            !newTool.code.trim()
                                        }
                                        className="h-9 text-xs"
                                    >
                                        <Icon type="plus-icon" size="xs" />
                                        <span className="ml-1">Create Tool</span>
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
                            <span className="ml-2">New Tool</span>
                        </Button>
                    )}

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
                                        placeholder="Search tools by name, description, or language..."
                                        className="h-9 w-full rounded-xl border border-primary/15 bg-accent pl-9 pr-3 text-xs text-muted placeholder:text-muted/60 focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleEnableAll}
                                    disabled={enabledCount === filteredTools.length}
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

                            <div className="flex-1 overflow-y-auto pr-2">
                                {isToolsLoading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="h-32 animate-pulse rounded-xl border border-primary/10 bg-accent/30"
                                            />
                                        ))}
                                    </div>
                                ) : filteredTools.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Icon type="hammer" size="lg" className="text-muted-foreground/50 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            {tools.length === 0
                                                ? 'No tools configured. Create one to get started.'
                                                : 'No tools match your search or filters.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredTools.map((tool) => (
                                            <ToolCard
                                                key={tool.id}
                                                tool={tool}
                                                enabled={enabledTools.has(tool.id)}
                                                onToggle={() => handleToggleTool(tool.id)}
                                                onDelete={() => handleDeleteTool(tool.id)}
                                                externalAccessEnabled={externalToolAccess?.enabled || false}
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

interface ToolCardProps {
    tool: ToolMetadata
    enabled: boolean
    onToggle: () => void
    onDelete: () => void
    externalAccessEnabled: boolean
}

function ToolCard({ tool, enabled, onToggle, onDelete, externalAccessEnabled }: ToolCardProps) {
    const canExecute = !tool.is_external || externalAccessEnabled

    return (
        <div
            className={`rounded-xl border p-3 transition-colors ${enabled && canExecute
                    ? 'border-primary/30 bg-accent/50'
                    : 'border-primary/10 bg-accent/20 opacity-60'
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold uppercase text-primary truncate">
                            {tool.name}
                        </h3>
                        {tool.version && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                                v{tool.version}
                            </span>
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            {tool.language}
                        </span>
                        {tool.is_external && (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded">
                                External
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                        {tool.description || 'No description provided.'}
                    </p>
                    {tool.is_external && !externalAccessEnabled && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">
                            ⚠️ External access disabled - tool cannot execute
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {tool.tags.map((tag) => (
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
                        aria-label={`Toggle ${tool.name}`}
                    />
                </div>
            </div>
        </div>
    )
}
