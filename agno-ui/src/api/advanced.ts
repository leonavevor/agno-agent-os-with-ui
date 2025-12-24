/**
 * Memory and reference search API client
 * Provides TypeScript-safe wrappers for memory management and agentic RAG
 */

import { toast } from 'sonner'
import { APIRoutes } from './routes'

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
    metadata?: string
}

export interface ChatHistoryResponse {
    session_id: string
    messages: ChatMessage[]
    total: number
}

export interface LearnedFacts {
    session_id: string
    facts: string | null
}

export interface SearchResult {
    skill_id: string
    file_path: string
    content: string
    chunk_index: number
    similarity?: number
}

export interface SearchResponse {
    query: string
    results: SearchResult[]
    total: number
    search_type: 'keyword' | 'vector'
}

export interface EmbeddingStatus {
    skill_id: string
    is_embedded: boolean
    chunk_count: number
}

// ============================================================================
// Helper Functions
// ============================================================================

const createHeaders = (authToken?: string): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    }

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
    }

    return headers
}

// ============================================================================
// Memory API
// ============================================================================

export const initializeMemorySession = async (
    endpoint: string,
    sessionId: string,
    userId?: string,
    authToken?: string
): Promise<{ session_id: string; status: string }> => {
    try {
        const response = await fetch(APIRoutes.InitializeSession(endpoint), {
            method: 'POST',
            headers: createHeaders(authToken),
            body: JSON.stringify({
                session_id: sessionId,
                user_id: userId
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to initialize session: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to initialize memory session')
        throw error
    }
}

export const addMemoryMessage = async (
    endpoint: string,
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: string,
    authToken?: string
): Promise<ChatMessage> => {
    try {
        const response = await fetch(APIRoutes.AddMessage(endpoint), {
            method: 'POST',
            headers: createHeaders(authToken),
            body: JSON.stringify({
                session_id: sessionId,
                role,
                content,
                metadata
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to add message: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to save message to memory')
        throw error
    }
}

export const getChatHistory = async (
    endpoint: string,
    sessionId: string,
    limit: number = 50,
    authToken?: string
): Promise<ChatHistoryResponse> => {
    try {
        const url = new URL(APIRoutes.GetChatHistory(endpoint, sessionId))
        url.searchParams.set('limit', limit.toString())

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: createHeaders(authToken)
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch chat history: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to load chat history')
        throw error
    }
}

export const updateLearnedFacts = async (
    endpoint: string,
    sessionId: string,
    facts: string,
    authToken?: string
): Promise<LearnedFacts> => {
    try {
        const response = await fetch(
            APIRoutes.UpdateLearnedFacts(endpoint, sessionId),
            {
                method: 'POST',
                headers: createHeaders(authToken),
                body: JSON.stringify({
                    session_id: sessionId,
                    facts
                })
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to update learned facts: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to save learned facts')
        throw error
    }
}

export const getLearnedFacts = async (
    endpoint: string,
    sessionId: string,
    authToken?: string
): Promise<LearnedFacts> => {
    try {
        const response = await fetch(
            APIRoutes.GetLearnedFacts(endpoint, sessionId),
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to fetch learned facts: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to load learned facts')
        throw error
    }
}

export const clearMemorySession = async (
    endpoint: string,
    sessionId: string,
    authToken?: string
): Promise<{ session_id: string; status: string }> => {
    try {
        const response = await fetch(
            APIRoutes.ClearMemorySession(endpoint, sessionId),
            {
                method: 'DELETE',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to clear session: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to clear memory session')
        throw error
    }
}

// Alias for consistency
export const deleteMemorySession = clearMemorySession

// Get memory session history (alias for getChatHistory)
export const getMemorySessionHistory = getChatHistory

// ============================================================================
// Reference Search API
// ============================================================================

export const searchReferences = async (
    endpoint: string,
    query: string,
    skillId?: string,
    limit: number = 5,
    useVector: boolean = false,
    authToken?: string
): Promise<SearchResponse> => {
    try {
        const response = await fetch(APIRoutes.SearchReferences(endpoint), {
            method: 'POST',
            headers: createHeaders(authToken),
            body: JSON.stringify({
                query,
                skill_id: skillId,
                limit,
                use_vector: useVector
            })
        })

        if (!response.ok) {
            throw new Error(`Reference search failed: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to search references')
        throw error
    }
}

export const embedSkillReferences = async (
    endpoint: string,
    skillId: string,
    chunkSize: number = 1000,
    authToken?: string
): Promise<{ skill_id: string; chunks_indexed: number; status: string }> => {
    try {
        const response = await fetch(APIRoutes.EmbedReferences(endpoint), {
            method: 'POST',
            headers: createHeaders(authToken),
            body: JSON.stringify({
                skill_id: skillId,
                chunk_size: chunkSize
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to embed references: ${response.statusText}`)
        }

        const data = await response.json()
        toast.success(
            `Embedded ${data.chunks_indexed} chunks for skill: ${skillId}`
        )
        return data
    } catch (error) {
        toast.error('Failed to embed skill references')
        throw error
    }
}

export const getEmbeddingStatus = async (
    endpoint: string,
    skillId: string,
    authToken?: string
): Promise<EmbeddingStatus> => {
    try {
        const response = await fetch(
            APIRoutes.GetEmbeddingStatus(endpoint, skillId),
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(
                `Failed to get embedding status: ${response.statusText}`
            )
        }

        return response.json()
    } catch (error) {
        console.error('Failed to check embedding status:', error)
        // Don't show toast for status checks
        throw error
    }
}
