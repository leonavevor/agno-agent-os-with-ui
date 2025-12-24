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
import { reloadSkillsAPI, createSkillAPI, CreateSkillPayload } from '@/api/os'
import { toast } from 'sonner'
import Icon from '@/components/ui/icon'
import { SkillMetadata } from '@/types/os'

interface SkillsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SkillsModal({ open, onOpenChange }: SkillsModalProps) {
    const skills = useStore((state) => state.skills)
    const enabledSkills = useStore((state) => state.enabledSkills)
    const setEnabledSkills = useStore((state) => state.setEnabledSkills)
    const isSkillsLoading = useStore((state) => state.isSkillsLoading)
    const setSkills = useStore((state) => state.setSkills)
    const setIsSkillsLoading = useStore((state) => state.setIsSkillsLoading)
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const authToken = useStore((state) => state.authToken)

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [newSkill, setNewSkill] = useState<CreateSkillPayload>({
        name: '',
        description: '',
        tags: [],
        match_terms: [],
        instructions: '',
        version: '1.0.0'
    })
    const [tagInput, setTagInput] = useState('')
    const [matchTermInput, setMatchTermInput] = useState('')

    // Get all unique tags from skills
    const allTags = useMemo(() => {
        const tagSet = new Set<string>()
        skills.forEach((skill) => {
            skill.tags.forEach((tag) => tagSet.add(tag))
        })
        return Array.from(tagSet).sort()
    }, [skills])

    // Filter skills based on search and tags
    const filteredSkills = useMemo(() => {
        let filtered = skills

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (skill) =>
                    skill.name.toLowerCase().includes(query) ||
                    skill.description.toLowerCase().includes(query) ||
                    skill.tags.some((tag) => tag.toLowerCase().includes(query)) ||
                    skill.match_terms.some((term) => term.toLowerCase().includes(query))
            )
        }

        // Filter by selected tags
        if (selectedTags.length > 0) {
            filtered = filtered.filter((skill) =>
                selectedTags.some((tag) => skill.tags.includes(tag))
            )
        }

        return filtered
    }, [skills, searchQuery, selectedTags])

    const handleReload = async () => {
        if (!selectedEndpoint) return
        setIsSkillsLoading(true)
        try {
            const reloaded = await reloadSkillsAPI(selectedEndpoint, authToken)
            setSkills(reloaded)
            toast.success(`Reloaded ${reloaded.length} skills`)
        } catch (error) {
            toast.error('Failed to reload skills')
        } finally {
            setIsSkillsLoading(false)
        }
    }

    const handleToggleSkill = (skillId: string) => {
        const newEnabledSkills = new Set(enabledSkills)
        if (newEnabledSkills.has(skillId)) {
            newEnabledSkills.delete(skillId)
        } else {
            newEnabledSkills.add(skillId)
        }
        setEnabledSkills(newEnabledSkills)
    }

    const handleToggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        )
    }

    const handleEnableAll = () => {
        const allSkillIds = new Set(filteredSkills.map((s) => s.id))
        setEnabledSkills(allSkillIds)
        toast.success(`Enabled ${allSkillIds.size} skills`)
    }

    const handleDisableAll = () => {
        const filteredIds = new Set(filteredSkills.map((s) => s.id))
        const newEnabledSkills = new Set(
            Array.from(enabledSkills).filter((id) => !filteredIds.has(id))
        )
        setEnabledSkills(newEnabledSkills)
        toast.success(`Disabled ${filteredIds.size} skills`)
    }

    const handleCreateSkill = async () => {
        if (!newSkill.name.trim() || !newSkill.description.trim()) {
            toast.error('Name and description are required')
            return
        }

        const result = await createSkillAPI(selectedEndpoint, newSkill, authToken)
        if (result) {
            // Add the new skill to the list
            setSkills([...skills, result.skill])

            // Reset form
            setNewSkill({
                name: '',
                description: '',
                tags: [],
                match_terms: [],
                instructions: '',
                version: '1.0.0'
            })
            setTagInput('')
            setMatchTermInput('')
            setIsCreating(false)
        }
    }

    const handleAddTag = () => {
        const tag = tagInput.trim()
        if (tag && !newSkill.tags.includes(tag)) {
            setNewSkill({ ...newSkill, tags: [...newSkill.tags, tag] })
            setTagInput('')
        }
    }

    const handleRemoveTag = (tag: string) => {
        setNewSkill({ ...newSkill, tags: newSkill.tags.filter((t) => t !== tag) })
    }

    const handleAddMatchTerm = () => {
        const term = matchTermInput.trim().toLowerCase()
        if (term && !newSkill.match_terms.includes(term)) {
            setNewSkill({ ...newSkill, match_terms: [...newSkill.match_terms, term] })
            setMatchTermInput('')
        }
    }

    const handleRemoveMatchTerm = (term: string) => {
        setNewSkill({
            ...newSkill,
            match_terms: newSkill.match_terms.filter((t) => t !== term)
        })
    }

    const enabledCount = filteredSkills.filter((s) => enabledSkills.has(s.id)).length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-xl border-primary/15 font-dmmono">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="text-lg font-semibold uppercase">Skills Catalog</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReload}
                            disabled={isSkillsLoading}
                            className="h-8 text-xs"
                        >
                            <Icon
                                type="refresh"
                                size="xs"
                                className={isSkillsLoading ? 'animate-spin' : ''}
                            />
                            <span className="ml-1">Reload</span>
                        </Button>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Enable or disable available skills. {enabledCount} of {filteredSkills.length}{' '}
                        {selectedTags.length > 0 || searchQuery ? 'filtered ' : ''}skills enabled
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                    {/* Create new skill form */}
                    {isCreating ? (
                        <div className="rounded-xl border border-primary/20 bg-accent/30 p-4 space-y-3 overflow-y-auto max-h-[60vh]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase text-primary">
                                    Create New Skill
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
                                    <Label htmlFor="skill-name" className="text-xs">
                                        Skill Name *
                                    </Label>
                                    <Input
                                        id="skill-name"
                                        value={newSkill.name}
                                        onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                                        placeholder="My Custom Skill"
                                        className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="skill-description" className="text-xs">
                                        Description *
                                    </Label>
                                    <TextArea
                                        id="skill-description"
                                        value={newSkill.description}
                                        onChange={(e) =>
                                            setNewSkill({ ...newSkill, description: e.target.value })
                                        }
                                        placeholder="Describe what this skill does..."
                                        className="rounded-xl border-primary/15 bg-accent text-xs min-h-[60px]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="skill-version" className="text-xs">
                                        Version
                                    </Label>
                                    <Input
                                        id="skill-version"
                                        value={newSkill.version}
                                        onChange={(e) => setNewSkill({ ...newSkill, version: e.target.value })}
                                        placeholder="1.0.0"
                                        className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="skill-tags" className="text-xs">
                                        Tags
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            id="skill-tags"
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
                                    {newSkill.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newSkill.tags.map((tag) => (
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
                                    <Label htmlFor="skill-match-terms" className="text-xs">
                                        Match Terms (for skill routing)
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            id="skill-match-terms"
                                            value={matchTermInput}
                                            onChange={(e) => setMatchTermInput(e.target.value)}
                                            onKeyDown={(e) =>
                                                e.key === 'Enter' && (e.preventDefault(), handleAddMatchTerm())
                                            }
                                            placeholder="Add keyword..."
                                            className="h-9 text-xs flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddMatchTerm}
                                            className="h-9 text-xs"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {newSkill.match_terms.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newSkill.match_terms.map((term) => (
                                                <span
                                                    key={term}
                                                    className="rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground flex items-center gap-1"
                                                >
                                                    {term}
                                                    <button
                                                        onClick={() => handleRemoveMatchTerm(term)}
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
                                    <Label htmlFor="skill-instructions" className="text-xs">
                                        Instructions (optional)
                                    </Label>
                                    <TextArea
                                        id="skill-instructions"
                                        value={newSkill.instructions}
                                        onChange={(e) =>
                                            setNewSkill({ ...newSkill, instructions: e.target.value })
                                        }
                                        placeholder="Detailed instructions for the skill..."
                                        className="rounded-xl border-primary/15 bg-accent text-xs min-h-[100px]"
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
                                        onClick={handleCreateSkill}
                                        disabled={!newSkill.name.trim() || !newSkill.description.trim()}
                                        className="h-9 text-xs"
                                    >
                                        <Icon type="plus-icon" size="xs" />
                                        <span className="ml-1">Create Skill</span>
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
                            <span className="ml-2">New Skill</span>
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
                                        placeholder="Search skills by name, description, or tags..."
                                        className="h-9 w-full rounded-xl border border-primary/15 bg-accent pl-9 pr-3 text-xs text-muted placeholder:text-muted/60 focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleEnableAll}
                                    disabled={enabledCount === filteredSkills.length}
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

                            {/* Skills list */}
                            <div className="flex-1 overflow-y-auto pr-2">
                                {isSkillsLoading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="h-24 animate-pulse rounded-xl border border-primary/10 bg-accent/30"
                                            />
                                        ))}
                                    </div>
                                ) : filteredSkills.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Icon type="search" size="lg" className="text-muted-foreground/50 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            {skills.length === 0
                                                ? 'No skills available for this endpoint.'
                                                : 'No skills match your search or filters.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredSkills.map((skill) => (
                                            <SkillCard
                                                key={skill.id}
                                                skill={skill}
                                                enabled={enabledSkills.has(skill.id)}
                                                onToggle={() => handleToggleSkill(skill.id)}
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

interface SkillCardProps {
    skill: SkillMetadata
    enabled: boolean
    onToggle: () => void
}

function SkillCard({ skill, enabled, onToggle }: SkillCardProps) {
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
                            {skill.name}
                        </h3>
                        {skill.version && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                                v{skill.version}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                        {skill.description || 'No description provided.'}
                    </p>
                    {skill.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {skill.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={onToggle}
                    aria-label={`Toggle ${skill.name}`}
                />
            </div>
        </div>
    )
}
