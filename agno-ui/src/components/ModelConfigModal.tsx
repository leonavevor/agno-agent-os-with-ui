'use client'

import { Settings2, Save, RefreshCw, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { EntityModelConfig, ModelConfiguration, ModelSettings, DefaultModelConfig } from '@/types/os'

/**
 * Hierarchical Model Configuration Modal
 * Manages model configurations for projects, teams, and agents with inheritance
 */
export function ModelConfigModal() {
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const modelProviders = useStore((state) => state.modelProviders)
    const defaultModelConfig = useStore((state) => state.defaultModelConfig)
    const setDefaultModelConfig = useStore((state) => state.setDefaultModelConfig)
    const entityModelConfigs = useStore((state) => state.entityModelConfigs)
    const setEntityModelConfigs = useStore((state) => state.setEntityModelConfigs)
    const agents = useStore((state) => state.agents)
    const teams = useStore((state) => state.teams)

    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'default' | 'project' | 'team' | 'agent'>('default')
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['default']))

    // Form state
    const [defaultForm, setDefaultForm] = useState<ModelConfiguration | null>(null)
    const [entityForms, setEntityForms] = useState<Record<string, EntityModelConfig>>({})

    // Fetch all configurations
    const fetchConfigs = async () => {
        if (!selectedEndpoint) return

        setIsLoading(true)
        try {
            // Fetch default config
            const defaultRes = await fetch(`${selectedEndpoint}/models/config/default`)
            if (defaultRes.ok) {
                const data: DefaultModelConfig = await defaultRes.json()
                setDefaultModelConfig(data)
                setDefaultForm(data.configuration)
            }

            // Fetch entity configs
            const entitiesRes = await fetch(`${selectedEndpoint}/models/config/entities`)
            if (entitiesRes.ok) {
                const data: EntityModelConfig[] = await entitiesRes.json()
                setEntityModelConfigs(data)

                const forms: Record<string, EntityModelConfig> = {}
                data.forEach((config) => {
                    forms[`${config.entity_type}:${config.entity_id}`] = config
                })
                setEntityForms(forms)
            }
        } catch (error) {
            console.error('Error fetching configurations:', error)
            toast.error('Failed to load configurations')
        } finally {
            setIsLoading(false)
        }
    }

    // Save default configuration
    const saveDefaultConfig = async () => {
        if (!selectedEndpoint || !defaultForm) return

        setIsLoading(true)
        try {
            const response = await fetch(`${selectedEndpoint}/models/config/default`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    configuration: defaultForm,
                    description: 'Global default model configuration'
                })
            })

            if (!response.ok) throw new Error('Failed to update default configuration')

            const data: DefaultModelConfig = await response.json()
            setDefaultModelConfig(data)
            toast.success('Default configuration updated')
        } catch (error) {
            console.error('Error saving default config:', error)
            toast.error('Failed to save default configuration')
        } finally {
            setIsLoading(false)
        }
    }

    // Save entity configuration
    const saveEntityConfig = async (entityType: string, entityId: string) => {
        if (!selectedEndpoint) return

        const entityKey = `${entityType}:${entityId}`
        const config = entityForms[entityKey]
        if (!config) return

        setIsLoading(true)
        try {
            const response = await fetch(
                `${selectedEndpoint}/models/config/${entityType}/${entityId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                }
            )

            if (!response.ok) throw new Error('Failed to update configuration')

            const data: EntityModelConfig = await response.json()
            setEntityForms(prev => ({
                ...prev,
                [entityKey]: data
            }))

            // Update the list
            setEntityModelConfigs(prev =>
                prev.map(c =>
                    c.entity_type === entityType && c.entity_id === entityId ? data : c
                )
            )

            toast.success(`Configuration updated for ${entityType}: ${entityId}`)
        } catch (error) {
            console.error('Error saving entity config:', error)
            toast.error(`Failed to save ${entityType} configuration`)
        } finally {
            setIsLoading(false)
        }
    }

    // Delete entity configuration
    const deleteEntityConfig = async (entityType: string, entityId: string) => {
        if (!selectedEndpoint) return

        setIsLoading(true)
        try {
            const response = await fetch(
                `${selectedEndpoint}/models/config/${entityType}/${entityId}`,
                { method: 'DELETE' }
            )

            if (!response.ok) throw new Error('Failed to delete configuration')

            const entityKey = `${entityType}:${entityId}`
            setEntityForms(prev => {
                const newForms = { ...prev }
                delete newForms[entityKey]
                return newForms
            })

            setEntityModelConfigs(prev =>
                prev.filter(c => !(c.entity_type === entityType && c.entity_id === entityId))
            )

            toast.success(`Configuration deleted for ${entityType}: ${entityId}`)
        } catch (error) {
            console.error('Error deleting entity config:', error)
            toast.error('Failed to delete configuration')
        } finally {
            setIsLoading(false)
        }
    }

    // Create new entity configuration
    const createEntityConfig = (entityType: 'project' | 'team' | 'agent', entityId: string) => {
        const entityKey = `${entityType}:${entityId}`

        if (entityForms[entityKey]) {
            toast.error('Configuration already exists for this entity')
            return
        }

        const newConfig: EntityModelConfig = {
            entity_type: entityType,
            entity_id: entityId,
            configuration: defaultForm || {
                model_id: 'gpt-5-mini',
                provider: 'openai',
                settings: {
                    temperature: 0.7,
                    max_tokens: 4096,
                    stream: true
                },
                enabled: true
            },
            inherit_from: null
        }

        setEntityForms(prev => ({
            ...prev,
            [entityKey]: newConfig
        }))
    }

    useEffect(() => {
        if (open) {
            fetchConfigs()
        }
    }, [open, selectedEndpoint])

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev)
            if (newSet.has(section)) {
                newSet.delete(section)
            } else {
                newSet.add(section)
            }
            return newSet
        })
    }

    const renderModelSettings = (
        settings: ModelSettings,
        onChange: (newSettings: ModelSettings) => void
    ) => (
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-xs font-medium text-muted">Temperature</label>
                <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.temperature ?? 0.7}
                    onChange={(e) =>
                        onChange({ ...settings, temperature: parseFloat(e.target.value) })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div>
                <label className="text-xs font-medium text-muted">Max Tokens</label>
                <Input
                    type="number"
                    min="1"
                    value={settings.max_tokens ?? 4096}
                    onChange={(e) =>
                        onChange({ ...settings, max_tokens: parseInt(e.target.value) })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div>
                <label className="text-xs font-medium text-muted">Top P</label>
                <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.top_p ?? 1.0}
                    onChange={(e) =>
                        onChange({ ...settings, top_p: parseFloat(e.target.value) })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div>
                <label className="text-xs font-medium text-muted">Timeout (s)</label>
                <Input
                    type="number"
                    min="1"
                    value={settings.timeout ?? 60}
                    onChange={(e) =>
                        onChange({ ...settings, timeout: parseInt(e.target.value) })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div>
                <label className="text-xs font-medium text-muted">Frequency Penalty</label>
                <Input
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={settings.frequency_penalty ?? 0}
                    onChange={(e) =>
                        onChange({
                            ...settings,
                            frequency_penalty: parseFloat(e.target.value)
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div>
                <label className="text-xs font-medium text-muted">Presence Penalty</label>
                <Input
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={settings.presence_penalty ?? 0}
                    onChange={(e) =>
                        onChange({
                            ...settings,
                            presence_penalty: parseFloat(e.target.value)
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div className="col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium text-muted">
                    <input
                        type="checkbox"
                        checked={settings.stream ?? true}
                        onChange={(e) => onChange({ ...settings, stream: e.target.checked })}
                        className="h-4 w-4 rounded"
                    />
                    Enable Streaming
                </label>
            </div>
        </div>
    )

    const renderDefaultConfig = () => {
        if (!defaultForm) return null

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-muted">Provider</label>
                        <Select
                            value={defaultForm.provider}
                            onValueChange={(provider) =>
                                setDefaultForm({ ...defaultForm, provider })
                            }
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {modelProviders.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted">Model</label>
                        <Select
                            value={defaultForm.model_id}
                            onValueChange={(model_id) =>
                                setDefaultForm({ ...defaultForm, model_id })
                            }
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {modelProviders
                                    .find((p) => p.id === defaultForm.provider)
                                    ?.models.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {renderModelSettings(defaultForm.settings, (newSettings) =>
                    setDefaultForm({ ...defaultForm, settings: newSettings })
                )}

                <Button onClick={saveDefaultConfig} disabled={isLoading} className="w-full">
                    {isLoading ? (
                        <>
                            <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-3.5 w-3.5" />
                            Save Default Configuration
                        </>
                    )}
                </Button>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2"
                    title="Model Configuration"
                >
                    <Settings2 className="h-4 w-4" />
                    <span className="text-xs">Config</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Hierarchical Model Configuration</DialogTitle>
                    <DialogDescription>
                        Configure models for projects, teams, and agents. Configurations inherit from parent levels.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Default Configuration */}
                    <div className="rounded-lg border border-primary/15 bg-primaryAccent">
                        <button
                            onClick={() => toggleSection('default')}
                            className="flex w-full items-center justify-between p-4 text-left"
                        >
                            <div className="flex items-center gap-2">
                                {expandedSections.has('default') ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                                <h3 className="font-semibold">Global Default</h3>
                            </div>
                        </button>
                        {expandedSections.has('default') && (
                            <div className="border-t border-primary/15 p-4">
                                {renderDefaultConfig()}
                            </div>
                        )}
                    </div>

                    {/* Entity Configurations Info */}
                    <div className="rounded-lg bg-accent p-3 text-xs text-muted">
                        <p className="font-semibold">💡 Hierarchy:</p>
                        <ul className="ml-4 mt-2 list-disc space-y-1">
                            <li><strong>Agent</strong> configurations override Team settings</li>
                            <li><strong>Team</strong> configurations override Project settings</li>
                            <li><strong>Project</strong> configurations override Global default</li>
                            <li>Entities without explicit configuration inherit from their parent level</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
