'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Icon from '@/components/ui/icon'
import { useStore } from '@/store'

interface ProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export interface Project {
    id: string
    name: string
    description: string
    created_at: string
}

export function ProjectModal({ open, onOpenChange }: ProjectModalProps) {
    const projects = useStore((state) => state.projects)
    const setProjects = useStore((state) => state.setProjects)
    const selectedProject = useStore((state) => state.selectedProject)
    const setSelectedProject = useStore((state) => state.setSelectedProject)

    const [isCreating, setIsCreating] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')
    const [newProjectDescription, setNewProjectDescription] = useState('')

    const handleCreateProject = () => {
        if (!newProjectName.trim()) {
            toast.error('Project name is required')
            return
        }

        const projectId = newProjectName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')

        if (projects.some((p) => p.id === projectId)) {
            toast.error('A project with this name already exists')
            return
        }

        const newProject: Project = {
            id: projectId,
            name: newProjectName.trim(),
            description: newProjectDescription.trim(),
            created_at: new Date().toISOString()
        }

        setProjects([...projects, newProject])
        setSelectedProject(newProject.id)
        toast.success(`Created project: ${newProject.name}`)

        // Reset form
        setNewProjectName('')
        setNewProjectDescription('')
        setIsCreating(false)
    }

    const handleSelectProject = (projectId: string) => {
        setSelectedProject(projectId)
        toast.success(`Switched to project: ${projects.find((p) => p.id === projectId)?.name}`)
        onOpenChange(false)
    }

    const handleDeleteProject = (projectId: string) => {
        const project = projects.find((p) => p.id === projectId)
        if (!project) return

        if (confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
            setProjects(projects.filter((p) => p.id !== projectId))
            if (selectedProject === projectId) {
                setSelectedProject(null)
            }
            toast.success(`Deleted project: ${project.name}`)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-xl border-primary/15 font-dmmono">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold uppercase">
                        Project Management
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Create and manage projects for organizing your work
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                    {/* Create new project */}
                    {isCreating ? (
                        <div className="rounded-xl border border-primary/20 bg-accent/30 p-4 space-y-3">
                            <h3 className="text-sm font-semibold uppercase text-primary">
                                Create New Project
                            </h3>
                            <div className="space-y-2">
                                <Label htmlFor="project-name" className="text-xs">
                                    Project Name *
                                </Label>
                                <Input
                                    id="project-name"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="My Project"
                                    className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-description" className="text-xs">
                                    Description
                                </Label>
                                <Input
                                    id="project-description"
                                    value={newProjectDescription}
                                    onChange={(e) => setNewProjectDescription(e.target.value)}
                                    placeholder="Optional project description"
                                    className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsCreating(false)
                                        setNewProjectName('')
                                        setNewProjectDescription('')
                                    }}
                                    className="h-9 rounded-xl text-xs uppercase"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreateProject}
                                    disabled={!newProjectName.trim()}
                                    className="h-9 rounded-xl text-xs"
                                >
                                    <Icon type="plus-icon" size="xs" />
                                    <span className="ml-1">Create Project</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => setIsCreating(true)}
                            className="h-9 rounded-xl text-xs font-medium uppercase"
                        >
                            <Icon type="plus-icon" size="xs" />
                            <span className="ml-2">New Project</span>
                        </Button>
                    )}

                    {/* Projects list */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        {projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Icon type="folder" size="lg" className="text-muted-foreground/50 mb-3" />
                                <p className="text-sm text-muted-foreground">No projects yet</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Create a project to organize your agents and teams
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className={`rounded-xl border p-3 transition-colors ${selectedProject === project.id
                                                ? 'border-primary bg-accent/50'
                                                : 'border-primary/10 bg-accent/20 hover:border-primary/30'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                onClick={() => handleSelectProject(project.id)}
                                                className="flex-1 text-left"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon
                                                        type="folder"
                                                        size="xs"
                                                        className={
                                                            selectedProject === project.id
                                                                ? 'text-primary'
                                                                : 'text-muted-foreground'
                                                        }
                                                    />
                                                    <h3 className="text-sm font-semibold uppercase text-primary">
                                                        {project.name}
                                                    </h3>
                                                    {selectedProject === project.id && (
                                                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-background">
                                                            ACTIVE
                                                        </span>
                                                    )}
                                                </div>
                                                {project.description && (
                                                    <p className="text-xs text-muted-foreground ml-5">
                                                        {project.description}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground/70 ml-5 mt-1">
                                                    Created {new Date(project.created_at).toLocaleDateString()}
                                                </p>
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteProject(project.id)}
                                                className="h-8 w-8 hover:bg-rose-500/10 hover:text-rose-400/90"
                                                title="Delete project"
                                            >
                                                <Icon type="x" size="xs" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
