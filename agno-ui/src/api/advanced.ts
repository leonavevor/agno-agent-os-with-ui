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

export interface MemorySession {
    session_id: string
    user_id: string | null
    message_count: number
    has_facts: boolean
    created_at: string
    updated_at: string
}

export interface MemoryStats {
    total_sessions: number
    total_messages: number
    sessions_with_facts: number
    average_messages_per_session: number
}

export interface MemorySearchResult {
    id: string
    session_id: string
    role: string
    content: string
    timestamp: string
}

export const listMemorySessions = async (
    endpoint: string,
    limit: number = 100,
    userId?: string,
    authToken?: string
): Promise<{ sessions: MemorySession[]; total: number }> => {
    try {
        const params = new URLSearchParams({ limit: limit.toString() })
        if (userId) {
            params.append('user_id', userId)
        }

        const response = await fetch(
            `${APIRoutes.ListMemorySessions(endpoint)}?${params}`,
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to list sessions: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to list memory sessions')
        throw error
    }
}

export const getMemoryStats = async (
    endpoint: string,
    authToken?: string
): Promise<MemoryStats> => {
    try {
        const response = await fetch(
            APIRoutes.GetMemoryStats(endpoint),
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to get memory stats: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to get memory statistics')
        throw error
    }
}

export const clearAllMemorySessions = async (
    endpoint: string,
    authToken?: string
): Promise<{ status: string; sessions_deleted: number }> => {
    try {
        const response = await fetch(
            APIRoutes.ClearAllMemorySessions(endpoint),
            {
                method: 'DELETE',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to clear all sessions: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to clear all memory sessions')
        throw error
    }
}

export const searchMemoryMessages = async (
    endpoint: string,
    query: string,
    sessionId?: string,
    limit: number = 50,
    authToken?: string
): Promise<{ results: MemorySearchResult[]; total: number; query: string }> => {
    try {
        const params = new URLSearchParams({ query, limit: limit.toString() })
        if (sessionId) {
            params.append('session_id', sessionId)
        }

        const response = await fetch(
            `${APIRoutes.SearchMemoryMessages(endpoint)}?${params}`,
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to search messages: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to search memory messages')
        throw error
    }
}

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

// ============================================================================
// Knowledge Base API
// ============================================================================

export interface KnowledgeContent {
    id: string
    name: string
    description?: string
    type?: string
    size?: string
    metadata?: Record<string, any>
    access_count?: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    status_message?: string
    created_at: string
    updated_at: string
}

export interface KnowledgeListResponse {
    data: KnowledgeContent[]
    meta: {
        page: number
        limit: number
        total_pages: number
        total_count: number
    }
}

export const uploadKnowledge = async (
    endpoint: string,
    file: File,
    description?: string,
    metadata?: Record<string, any>,
    authToken?: string
): Promise<KnowledgeContent> => {
    try {
        const formData = new FormData()
        formData.append('file', file)
        if (description) {
            formData.append('description', description)
        }
        if (metadata) {
            formData.append('metadata', JSON.stringify(metadata))
        }

        const response = await fetch(APIRoutes.UploadKnowledge(endpoint), {
            method: 'POST',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            body: formData
        })

        if (!response.ok) {
            throw new Error(`Failed to upload knowledge: ${response.statusText}`)
        }

        const data = await response.json()
        toast.success(`Uploaded: ${file.name}`)
        return data
    } catch (error) {
        toast.error('Failed to upload knowledge')
        throw error
    }
}

export const listKnowledge = async (
    endpoint: string,
    page: number = 1,
    limit: number = 20,
    authToken?: string
): Promise<KnowledgeListResponse> => {
    try {
        const url = new URL(APIRoutes.ListKnowledge(endpoint))
        url.searchParams.append('page', page.toString())
        url.searchParams.append('limit', limit.toString())

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: createHeaders(authToken)
        })

        if (!response.ok) {
            throw new Error(`Failed to list knowledge: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to load knowledge list')
        throw error
    }
}

export const getKnowledgeStatus = async (
    endpoint: string,
    contentId: string,
    authToken?: string
): Promise<KnowledgeContent> => {
    try {
        const response = await fetch(
            APIRoutes.GetKnowledgeStatus(endpoint, contentId),
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(
                `Failed to get knowledge status: ${response.statusText}`
            )
        }

        return response.json()
    } catch (error) {
        console.error('Failed to check knowledge status:', error)
        throw error
    }
}

export const deleteKnowledge = async (
    endpoint: string,
    contentId: string,
    authToken?: string
): Promise<void> => {
    try {
        const response = await fetch(
            APIRoutes.DeleteKnowledge(endpoint, contentId),
            {
                method: 'DELETE',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to delete knowledge: ${response.statusText}`)
        }

        toast.success('Knowledge deleted successfully')
    } catch (error) {
        toast.error('Failed to delete knowledge')
        throw error
    }
}

export const deleteAllKnowledge = async (
    endpoint: string,
    authToken?: string
): Promise<void> => {
    try {
        const response = await fetch(
            APIRoutes.DeleteAllKnowledge(endpoint),
            {
                method: 'DELETE',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(
                `Failed to delete all knowledge: ${response.statusText}`
            )
        }

        toast.success('All knowledge deleted successfully')
    } catch (error) {
        toast.error('Failed to delete all knowledge')
        throw error
    }
}

export interface KnowledgeStats {
    total: number
    completed: number
    processing: number
    pending: number
    failed: number
    total_size: number
    total_access_count: number
}

export const getKnowledgeStats = async (
    endpoint: string,
    authToken?: string
): Promise<KnowledgeStats> => {
    try {
        const response = await fetch(
            APIRoutes.GetKnowledgeStats(endpoint),
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to get stats: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        console.error('Failed to get knowledge stats:', error)
        throw error
    }
}

export const searchKnowledge = async (
    endpoint: string,
    query: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
    authToken?: string
): Promise<KnowledgeListResponse> => {
    try {
        const url = new URL(APIRoutes.SearchKnowledge(endpoint))
        url.searchParams.append('q', query)
        if (status) url.searchParams.append('status', status)
        url.searchParams.append('page', page.toString())
        url.searchParams.append('limit', limit.toString())

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: createHeaders(authToken)
        })

        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        toast.error('Failed to search knowledge')
        throw error
    }
}

export const checkKnowledgeHealth = async (
    endpoint: string,
    authToken?: string
): Promise<{
    status: string
    has_knowledge_base: boolean
    has_embedder: boolean
    can_list_content: boolean
    message: string
}> => {
    try {
        const response = await fetch(
            APIRoutes.KnowledgeHealthCheck(endpoint),
            {
                method: 'GET',
                headers: createHeaders(authToken)
            }
        )

        if (!response.ok) {
            throw new Error(`Health check failed: ${response.statusText}`)
        }

        return response.json()
    } catch (error) {
        console.error('Health check failed:', error)
        throw error
    }
}
