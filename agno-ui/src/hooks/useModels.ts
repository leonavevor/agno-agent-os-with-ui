import { useEffect, useCallback } from 'react'
import { toast } from 'sonner'

import { useStore } from '@/store'
import type { ModelProvider, CurrentModelResponse } from '@/types/os'

/**
 * Hook for managing LLM models via API
 * Fetches available models and handles model selection
 * Auto-refreshes when backend reconnects
 */
export function useModels() {
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const modelProviders = useStore((state) => state.modelProviders)
    const setModelProviders = useStore((state) => state.setModelProviders)
    const currentModel = useStore((state) => state.currentModel)
    const setCurrentModel = useStore((state) => state.setCurrentModel)
    const isModelsLoading = useStore((state) => state.isModelsLoading)
    const setIsModelsLoading = useStore((state) => state.setIsModelsLoading)

    /**
     * Fetch available models from the backend
     */
    const fetchModels = useCallback(async () => {
        if (!selectedEndpoint) return

        setIsModelsLoading(true)
        try {
            const response = await fetch(`${selectedEndpoint}/models/list`)

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.statusText}`)
            }

            const providers: ModelProvider[] = await response.json()
            setModelProviders(providers)
        } catch (error) {
            console.error('Error fetching models:', error)
            toast.error('Failed to fetch available models')
            setModelProviders([])
        } finally {
            setIsModelsLoading(false)
        }
    }, [selectedEndpoint, setModelProviders, setIsModelsLoading])

    /**
     * Fetch current model from the backend
     */
    const fetchCurrentModel = useCallback(async () => {
        if (!selectedEndpoint) return

        try {
            const response = await fetch(`${selectedEndpoint}/models/current`)

            if (!response.ok) {
                throw new Error(`Failed to fetch current model: ${response.statusText}`)
            }

            const model: CurrentModelResponse = await response.json()
            setCurrentModel(model)
        } catch (error) {
            console.error('Error fetching current model:', error)
            setCurrentModel(null)
        }
    }, [selectedEndpoint, setCurrentModel])

    /**
     * Select a new model
     */
    const selectModel = useCallback(
        async (modelId: string, provider: string): Promise<boolean> => {
            if (!selectedEndpoint) {
                toast.error('No endpoint selected')
                return false
            }

            try {
                const response = await fetch(`${selectedEndpoint}/models/select`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model_id: modelId,
                        provider: provider
                    })
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.detail || 'Failed to select model')
                }

                const model: CurrentModelResponse = await response.json()
                setCurrentModel(model)

                toast.success(
                    `Switched to ${model.model_info?.name || modelId}`,
                    {
                        description: `Provider: ${provider}`
                    }
                )

                return true
            } catch (error) {
                console.error('Error selecting model:', error)
                toast.error(
                    'Failed to switch model',
                    {
                        description:
                            error instanceof Error ? error.message : 'Unknown error'
                    }
                )
                return false
            }
        },
        [selectedEndpoint, setCurrentModel]
    )

    /**
     * Refresh all model data
     */
    const refresh = useCallback(async () => {
        await Promise.all([fetchModels(), fetchCurrentModel()])
    }, [fetchModels, fetchCurrentModel])

    // Load models on mount and when endpoint changes
    useEffect(() => {
        if (selectedEndpoint) {
            refresh()
        }
    }, [selectedEndpoint]) // Only depend on selectedEndpoint, not refresh

    // Listen for reconnection events and auto-refresh
    useEffect(() => {
        const handleReconnect = () => {
            console.log('Backend reconnected - refreshing models...')
            refresh()
        }

        window.addEventListener('backend-reconnected', handleReconnect)
        return () => window.removeEventListener('backend-reconnected', handleReconnect)
    }, [refresh])

    return {
        modelProviders,
        currentModel,
        isModelsLoading,
        selectModel,
        refresh,
        fetchModels,
        fetchCurrentModel
    }
}
