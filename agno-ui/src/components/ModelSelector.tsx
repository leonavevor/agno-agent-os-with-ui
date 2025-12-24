'use client'

import { Check, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { ProviderSettingsModal } from '@/components/ProviderSettingsModal'
import { ModelConfigModal } from '@/components/ModelConfigModal'
import { useModels } from '@/hooks/useModels'
import { cn } from '@/lib/utils'
import type { ModelInfo } from '@/types/os'

/**
 * ModelSelector component
 * Dropdown for selecting LLM models across different providers
 */
export function ModelSelector() {
    const {
        modelProviders,
        currentModel,
        isModelsLoading,
        selectModel,
        refresh
    } = useModels()

    // Get current model display name
    const currentModelDisplay = useMemo(() => {
        if (!currentModel) return 'Select Model'

        if (currentModel.model_info) {
            return currentModel.model_info.name
        }

        return currentModel.model_id
    }, [currentModel])

    // Handle model selection
    const handleSelectModel = async (modelId: string, provider: string) => {
        await selectModel(modelId, provider)
    }

    // Get icon for model based on capabilities
    const getModelIcon = (model: ModelInfo) => {
        if (model.is_reasoning) {
            return <Sparkles className="h-3.5 w-3.5 text-purple-400/80" />
        }
        if (model.supports_vision) {
            return <Sparkles className="h-3.5 w-3.5 text-blue-400/80" />
        }
        return null
    }

    // Get badge color for provider
    const getProviderColor = (providerId: string) => {
        const colors: Record<string, string> = {
            openai: 'text-emerald-400/80',
            anthropic: 'text-orange-400/80',
            google: 'text-blue-400/80',
            azure: 'text-cyan-400/80',
            deepseek: 'text-purple-400/80',
            ollama: 'text-gray-400/80'
        }
        return colors[providerId] || 'text-gray-400/80'
    }

    if (isModelsLoading) {
        return (
            <div className="flex h-9 w-full items-center gap-2 rounded-xl border border-primary/15 bg-primaryAccent px-3 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-muted">Loading models...</span>
            </div>
        )
    }

    // Flatten all models with provider info for Select
    const allModels = modelProviders.flatMap((provider) =>
        provider.models.map((model) => ({
            ...model,
            providerName: provider.name
        }))
    )

    const currentModelValue = currentModel
        ? `${currentModel.provider}:${currentModel.model_id}`
        : ''

    return (
        <div className="flex w-full items-center gap-1">
            <Select
                value={currentModelValue}
                onValueChange={(value) => {
                    const [provider, modelId] = value.split(':')
                    handleSelectModel(modelId, provider)
                }}
            >
                <SelectTrigger className="h-9 w-full rounded-xl border border-primary/15 bg-primaryAccent text-xs font-medium">
                    <SelectValue placeholder="Select Model">
                        <div className="flex items-center gap-2">
                            <span className="truncate">{currentModelDisplay}</span>
                            {currentModel?.model_info && (
                                <>
                                    {currentModel.model_info.is_reasoning && (
                                        <Sparkles className="h-3 w-3 text-purple-500" />
                                    )}
                                    {currentModel.model_info.supports_vision &&
                                        !currentModel.model_info.is_reasoning && (
                                            <Sparkles className="h-3 w-3 text-blue-500" />
                                        )}
                                </>
                            )}
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[400px] border-none bg-primaryAccent font-dmmono shadow-lg">
                    {allModels.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs text-muted">
                            No models available
                        </div>
                    ) : (
                        modelProviders.map((provider) => (
                            <div key={provider.id}>
                                <div
                                    className={cn(
                                        'px-3 py-2 text-xs font-semibold',
                                        getProviderColor(provider.id)
                                    )}
                                >
                                    {provider.name}
                                </div>
                                {provider.models.map((model) => {
                                    const value = `${provider.id}:${model.id}`
                                    const isSelected = currentModelValue === value

                                    return (
                                        <SelectItem
                                            key={value}
                                            value={value}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex w-full items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    {isSelected && (
                                                        <Check className="h-3.5 w-3.5 text-emerald-400/80" />
                                                    )}
                                                    {!isSelected && <div className="h-3.5 w-3.5" />}
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-medium">
                                                                {model.name}
                                                            </span>
                                                            {getModelIcon(model)}
                                                        </div>
                                                        {model.description && (
                                                            <span className="text-xs text-muted">
                                                                {model.description.slice(0, 40)}
                                                                {model.description.length > 40 ? '...' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {model.context_window && (
                                                    <span className="text-xs text-muted">
                                                        {(model.context_window / 1000).toFixed(0)}K
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    )
                                })}
                            </div>
                        ))
                    )}
                </SelectContent>
            </Select>
            <ModelConfigModal />
            <ProviderSettingsModal />
            <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 p-0"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    refresh()
                }}
                title="Refresh models"
            >
                <RefreshCw className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}
