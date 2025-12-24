'use client'

import { Settings, Eye, EyeOff, Save, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ProviderConfig, ProviderConfigUpdate } from '@/types/os'

interface ProviderFormData {
    api_key: string
    base_url: string
    enabled: boolean
    showKey: boolean
}

/**
 * Provider Settings Modal
 * Allows configuration of API keys and base URLs for each LLM provider
 */
export function ProviderSettingsModal() {
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const providerConfigs = useStore((state) => state.providerConfigs)
    const setProviderConfigs = useStore((state) => state.setProviderConfigs)

    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState<string | null>(null)

    // Form data for each provider
    const [formData, setFormData] = useState<Record<string, ProviderFormData>>({})

    // Provider display names
    const providerNames: Record<string, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        google: 'Google',
        azure: 'Azure OpenAI',
        deepseek: 'DeepSeek',
        ollama: 'Ollama (Local)'
    }

    // Default base URLs
    const defaultBaseUrls: Record<string, string> = {
        openai: 'https://api.openai.com/v1',
        anthropic: 'https://api.anthropic.com',
        google: 'https://generativelanguage.googleapis.com',
        azure: '',
        deepseek: 'https://api.deepseek.com',
        ollama: 'http://localhost:11434'
    }

    // Fetch provider configurations
    const fetchProviderConfigs = async () => {
        if (!selectedEndpoint) return

        setIsLoading(true)
        try {
            const response = await fetch(`${selectedEndpoint}/models/providers/config`)

            if (!response.ok) {
                throw new Error('Failed to fetch provider configurations')
            }

            const configs: ProviderConfig[] = await response.json()
            setProviderConfigs(configs)

            // Initialize form data
            const newFormData: Record<string, ProviderFormData> = {}
            configs.forEach((config) => {
                newFormData[config.provider_id] = {
                    api_key: config.api_key || '',
                    base_url: config.base_url || defaultBaseUrls[config.provider_id] || '',
                    enabled: config.enabled,
                    showKey: false
                }
            })
            setFormData(newFormData)
        } catch (error) {
            console.error('Error fetching provider configs:', error)
            toast.error('Failed to load provider configurations')
        } finally {
            setIsLoading(false)
        }
    }

    // Update provider configuration
    const updateProviderConfig = async (providerId: string) => {
        if (!selectedEndpoint) return

        const data = formData[providerId]
        if (!data) return

        setIsSaving(providerId)
        try {
            const update: ProviderConfigUpdate = {
                api_key: data.api_key || null,
                base_url: data.base_url || null,
                enabled: data.enabled
            }

            const response = await fetch(
                `${selectedEndpoint}/models/providers/${providerId}/config`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(update)
                }
            )

            if (!response.ok) {
                throw new Error('Failed to update provider configuration')
            }

            const updatedConfig: ProviderConfig = await response.json()

            // Update configs in store
            setProviderConfigs(
                providerConfigs.map((c) =>
                    c.provider_id === providerId ? updatedConfig : c
                )
            )

            toast.success(`${providerNames[providerId]} configuration updated`)
        } catch (error) {
            console.error('Error updating provider config:', error)
            toast.error(`Failed to update ${providerNames[providerId]} configuration`)
        } finally {
            setIsSaving(null)
        }
    }

    // Load configs when modal opens
    useEffect(() => {
        if (open) {
            fetchProviderConfigs()
        }
    }, [open, selectedEndpoint])

    const handleFormChange = (
        providerId: string,
        field: keyof ProviderFormData,
        value: string | boolean
    ) => {
        setFormData((prev) => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                [field]: value
            }
        }))
    }

    const toggleShowKey = (providerId: string) => {
        setFormData((prev) => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                showKey: !prev[providerId]?.showKey
            }
        }))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0"
                    title="Provider Settings"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Provider Settings</DialogTitle>
                    <DialogDescription>
                        Configure API keys and base URLs for each LLM provider
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted" />
                        <span className="ml-2 text-sm text-muted">Loading configurations...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {providerConfigs.map((config) => {
                            const data = formData[config.provider_id]
                            if (!data) return null

                            const saving = isSaving === config.provider_id

                            return (
                                <div
                                    key={config.provider_id}
                                    className="space-y-3 rounded-lg border border-primary/15 bg-primaryAccent p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            {providerNames[config.provider_id] || config.provider_id}
                                        </h3>
                                        <label className="flex items-center gap-2 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={data.enabled}
                                                onChange={(e) =>
                                                    handleFormChange(
                                                        config.provider_id,
                                                        'enabled',
                                                        e.target.checked
                                                    )
                                                }
                                                className="h-4 w-4 rounded"
                                            />
                                            <span className="text-muted">Enabled</span>
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted">
                                            API Key
                                            {config.provider_id === 'ollama' && (
                                                <span className="ml-1 text-muted/60">(Optional - Local)</span>
                                            )}
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                type={data.showKey ? 'text' : 'password'}
                                                value={data.api_key}
                                                onChange={(e) =>
                                                    handleFormChange(config.provider_id, 'api_key', e.target.value)
                                                }
                                                placeholder={
                                                    config.provider_id === 'ollama'
                                                        ? 'Not required'
                                                        : 'Enter API key'
                                                }
                                                className="h-9 text-xs"
                                                disabled={config.provider_id === 'ollama'}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 shrink-0 p-0"
                                                onClick={() => toggleShowKey(config.provider_id)}
                                                disabled={config.provider_id === 'ollama'}
                                            >
                                                {data.showKey ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted">
                                            Base URL
                                        </label>
                                        <Input
                                            type="text"
                                            value={data.base_url}
                                            onChange={(e) =>
                                                handleFormChange(config.provider_id, 'base_url', e.target.value)
                                            }
                                            placeholder={defaultBaseUrls[config.provider_id] || 'Enter base URL'}
                                            className="h-9 text-xs"
                                        />
                                    </div>

                                    <Button
                                        onClick={() => updateProviderConfig(config.provider_id)}
                                        disabled={saving}
                                        size="sm"
                                        className="w-full"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-3.5 w-3.5" />
                                                Save {providerNames[config.provider_id]}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="mt-4 rounded-lg bg-accent p-3 text-xs text-muted">
                    <p className="font-semibold">💡 Tips:</p>
                    <ul className="ml-4 mt-2 list-disc space-y-1">
                        <li>API keys are stored in memory and reset on server restart</li>
                        <li>Use environment variables for permanent configuration</li>
                        <li>Ollama runs locally and doesn't require an API key</li>
                        <li>Changes take effect immediately for new conversations</li>
                    </ul>
                </div>
            </DialogContent>
        </Dialog>
    )
}
