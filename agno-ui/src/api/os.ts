import { toast } from 'sonner'

import { APIRoutes } from './routes'

import {
  AgentDetails,
  CreateMCPServerPayload,
  CreateToolPayload,
  ExternalToolAccessSettings,
  MCPServerMetadata,
  MCPServerResponse,
  Sessions,
  SkillMetadata,
  SkillRouteResponse,
  TeamDetails,
  ToolMetadata,
  ToolResponse,
  UpdateMCPServerPayload,
  UpdateToolPayload
} from '@/types/os'

// Helper function to create headers with optional auth token
const createHeaders = (authToken?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  return headers
}

export const getAgentsAPI = async (
  endpoint: string,
  authToken?: string
): Promise<AgentDetails[]> => {
  const url = APIRoutes.GetAgents(endpoint)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(authToken)
    })
    if (!response.ok) {
      toast.error(`Failed to fetch  agents: ${response.statusText}`)
      return []
    }
    const data = await response.json()
    return data
  } catch {
    toast.error('Error fetching  agents')
    return []
  }
}

export const getStatusAPI = async (
  base: string,
  authToken?: string
): Promise<number> => {
  const response = await fetch(APIRoutes.Status(base), {
    method: 'GET',
    headers: createHeaders(authToken)
  })
  return response.status
}

export const getAllSessionsAPI = async (
  base: string,
  type: 'agent' | 'team',
  componentId: string,
  dbId: string,
  authToken?: string
): Promise<Sessions | { data: [] }> => {
  try {
    const url = new URL(APIRoutes.GetSessions(base))
    url.searchParams.set('type', type)
    url.searchParams.set('component_id', componentId)
    url.searchParams.set('db_id', dbId)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { data: [] }
      }
      throw new Error(`Failed to fetch sessions: ${response.statusText}`)
    }
    return response.json()
  } catch {
    return { data: [] }
  }
}

export const getSessionAPI = async (
  base: string,
  type: 'agent' | 'team',
  sessionId: string,
  dbId?: string,
  authToken?: string
) => {
  // build query string
  const queryParams = new URLSearchParams({ type })
  if (dbId) queryParams.append('db_id', dbId)

  const response = await fetch(
    `${APIRoutes.GetSession(base, sessionId)}?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: createHeaders(authToken)
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`)
  }

  return response.json()
}

export const deleteSessionAPI = async (
  base: string,
  dbId: string,
  sessionId: string,
  authToken?: string
) => {
  const queryParams = new URLSearchParams()
  if (dbId) queryParams.append('db_id', dbId)
  const response = await fetch(
    `${APIRoutes.DeleteSession(base, sessionId)}?${queryParams.toString()}`,
    {
      method: 'DELETE',
      headers: createHeaders(authToken)
    }
  )
  return response
}

export const getTeamsAPI = async (
  endpoint: string,
  authToken?: string
): Promise<TeamDetails[]> => {
  const url = APIRoutes.GetTeams(endpoint)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(authToken)
    })
    if (!response.ok) {
      toast.error(`Failed to fetch  teams: ${response.statusText}`)
      return []
    }
    const data = await response.json()

    return data
  } catch {
    toast.error('Error fetching  teams')
    return []
  }
}

export const getSkillsAPI = async (
  endpoint: string,
  authToken?: string
): Promise<SkillMetadata[]> => {
  const url = APIRoutes.GetSkills(endpoint)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch skills: ${response.statusText}`)
      return []
    }

    return (await response.json()) as SkillMetadata[]
  } catch {
    toast.error('Error fetching skills')
    return []
  }
}

export const routeSkillsAPI = async (
  endpoint: string,
  message: string,
  authToken?: string,
  signal?: AbortSignal
): Promise<SkillMetadata[]> => {
  if (!message.trim()) {
    return []
  }

  try {
    const response = await fetch(APIRoutes.RouteSkills(endpoint), {
      method: 'POST',
      headers: {
        ...createHeaders(authToken)
      },
      body: JSON.stringify({ message }),
      signal
    })

    if (!response.ok) {
      toast.error(`Failed to route skills: ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as SkillRouteResponse
    return data.skills
  } catch {
    toast.error('Error routing skills')
    return []
  }
}

export const reloadSkillsAPI = async (
  endpoint: string,
  authToken?: string
): Promise<SkillMetadata[]> => {
  try {
    const response = await fetch(APIRoutes.ReloadSkills(endpoint), {
      method: 'POST',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to reload skills: ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as SkillRouteResponse & {
      status?: string
    }

    if ('skills' in data) {
      return data.skills
    }

    return []
  } catch {
    toast.error('Error reloading skills')
    return []
  }
}

export interface CreateSkillPayload {
  name: string
  description: string
  tags: string[]
  match_terms: string[]
  instructions: string
  version?: string
}

export interface CreateSkillResponse {
  status: string
  skill: SkillMetadata
  message: string
}

export const createSkillAPI = async (
  endpoint: string,
  payload: CreateSkillPayload,
  authToken?: string
): Promise<CreateSkillResponse | null> => {
  try {
    const response = await fetch(APIRoutes.CreateSkill(endpoint), {
      method: 'POST',
      headers: createHeaders(authToken),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to create skill: ${errorMessage}`)
      return null
    }

    const data = (await response.json()) as CreateSkillResponse
    toast.success(data.message || 'Skill created successfully')
    return data
  } catch (error) {
    toast.error('Error creating skill')
    return null
  }
}

export const deleteTeamSessionAPI = async (
  base: string,
  teamId: string,
  sessionId: string,
  authToken?: string
) => {
  const response = await fetch(
    APIRoutes.DeleteTeamSession(base, teamId, sessionId),
    {
      method: 'DELETE',
      headers: createHeaders(authToken)
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to delete team session: ${response.statusText}`)
  }
  return response
}

// ============================================
// MCP Server APIs
// ============================================

export const getMCPServersAPI = async (
  endpoint: string,
  authToken?: string
): Promise<MCPServerMetadata[]> => {
  const url = APIRoutes.GetMCPServers(endpoint)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch MCP servers: ${response.statusText}`)
      return []
    }

    return (await response.json()) as MCPServerMetadata[]
  } catch {
    toast.error('Error fetching MCP servers')
    return []
  }
}

export const getMCPServerAPI = async (
  endpoint: string,
  serverId: string,
  authToken?: string
): Promise<MCPServerMetadata | null> => {
  try {
    const response = await fetch(APIRoutes.GetMCPServer(endpoint, serverId), {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch MCP server: ${response.statusText}`)
      return null
    }

    return (await response.json()) as MCPServerMetadata
  } catch {
    toast.error('Error fetching MCP server')
    return null
  }
}

export const createMCPServerAPI = async (
  endpoint: string,
  payload: CreateMCPServerPayload,
  authToken?: string
): Promise<MCPServerResponse | null> => {
  try {
    const response = await fetch(APIRoutes.CreateMCPServer(endpoint), {
      method: 'POST',
      headers: createHeaders(authToken),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to create MCP server: ${errorMessage}`)
      return null
    }

    const data = (await response.json()) as MCPServerResponse
    toast.success(data.message || 'MCP server created successfully')
    return data
  } catch (error) {
    toast.error('Error creating MCP server')
    return null
  }
}

export const updateMCPServerAPI = async (
  endpoint: string,
  serverId: string,
  payload: UpdateMCPServerPayload,
  authToken?: string
): Promise<MCPServerMetadata | null> => {
  try {
    const response = await fetch(APIRoutes.UpdateMCPServer(endpoint, serverId), {
      method: 'PATCH',
      headers: createHeaders(authToken),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to update MCP server: ${errorMessage}`)
      return null
    }

    const data = (await response.json()) as MCPServerMetadata
    toast.success('MCP server updated successfully')
    return data
  } catch (error) {
    toast.error('Error updating MCP server')
    return null
  }
}

export const deleteMCPServerAPI = async (
  endpoint: string,
  serverId: string,
  authToken?: string
): Promise<boolean> => {
  try {
    const response = await fetch(APIRoutes.DeleteMCPServer(endpoint, serverId), {
      method: 'DELETE',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to delete MCP server: ${errorMessage}`)
      return false
    }

    toast.success('MCP server deleted successfully')
    return true
  } catch (error) {
    toast.error('Error deleting MCP server')
    return false
  }
}

// ============================================
// Tools APIs
// ============================================

export const getToolsAPI = async (
  endpoint: string,
  includeDisabled: boolean = true,
  authToken?: string
): Promise<ToolMetadata[]> => {
  const url = `${APIRoutes.GetTools(endpoint)}?include_disabled=${includeDisabled}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch tools: ${response.statusText}`)
      return []
    }

    return (await response.json()) as ToolMetadata[]
  } catch {
    toast.error('Error fetching tools')
    return []
  }
}

export const getToolAPI = async (
  endpoint: string,
  toolId: string,
  authToken?: string
): Promise<ToolMetadata | null> => {
  try {
    const response = await fetch(APIRoutes.GetTool(endpoint, toolId), {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch tool: ${response.statusText}`)
      return null
    }

    return (await response.json()) as ToolMetadata
  } catch {
    toast.error('Error fetching tool')
    return null
  }
}

export const createToolAPI = async (
  endpoint: string,
  payload: CreateToolPayload,
  authToken?: string
): Promise<ToolResponse | null> => {
  try {
    const response = await fetch(APIRoutes.CreateTool(endpoint), {
      method: 'POST',
      headers: createHeaders(authToken),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to create tool: ${errorMessage}`)
      return null
    }

    const data = (await response.json()) as ToolResponse
    toast.success(data.message || 'Tool created successfully')
    return data
  } catch (error) {
    toast.error('Error creating tool')
    return null
  }
}

export const updateToolAPI = async (
  endpoint: string,
  toolId: string,
  payload: UpdateToolPayload,
  authToken?: string
): Promise<ToolMetadata | null> => {
  try {
    const response = await fetch(APIRoutes.UpdateTool(endpoint, toolId), {
      method: 'PATCH',
      headers: createHeaders(authToken),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to update tool: ${errorMessage}`)
      return null
    }

    const data = (await response.json()) as ToolMetadata
    toast.success('Tool updated successfully')
    return data
  } catch (error) {
    toast.error('Error updating tool')
    return null
  }
}

export const deleteToolAPI = async (
  endpoint: string,
  toolId: string,
  authToken?: string
): Promise<boolean> => {
  try {
    const response = await fetch(APIRoutes.DeleteTool(endpoint, toolId), {
      method: 'DELETE',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to delete tool: ${errorMessage}`)
      return false
    }

    toast.success('Tool deleted successfully')
    return true
  } catch (error) {
    toast.error('Error deleting tool')
    return false
  }
}

export const getExternalToolSettingsAPI = async (
  endpoint: string,
  authToken?: string
): Promise<ExternalToolAccessSettings | null> => {
  try {
    const response = await fetch(APIRoutes.GetExternalToolSettings(endpoint), {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch external tool settings: ${response.statusText}`)
      return null
    }

    return (await response.json()) as ExternalToolAccessSettings
  } catch {
    toast.error('Error fetching external tool settings')
    return null
  }
}

export const updateExternalToolSettingsAPI = async (
  endpoint: string,
  settings: ExternalToolAccessSettings,
  authToken?: string
): Promise<ExternalToolAccessSettings | null> => {
  try {
    const response = await fetch(APIRoutes.UpdateExternalToolSettings(endpoint), {
      method: 'PUT',
      headers: createHeaders(authToken),
      body: JSON.stringify(settings)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to update external tool settings: ${errorMessage}`)
      return null
    }

    const data = (await response.json()) as ExternalToolAccessSettings
    toast.success('External tool settings updated successfully')
    return data
  } catch (error) {
    toast.error('Error updating external tool settings')
    return null
  }
}

// ==================== Audio API Functions ====================

export const getAudioSettingsAPI = async (
  endpoint: string,
  authToken?: string
): Promise<import('@/types/os').AudioSettings | null> => {
  try {
    const response = await fetch(APIRoutes.GetAudioSettings(endpoint), {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch audio settings: ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    toast.error('Error fetching audio settings')
    return null
  }
}

export const updateAudioSettingsAPI = async (
  endpoint: string,
  settings: import('@/types/os').AudioSettingsUpdate,
  authToken?: string
): Promise<import('@/types/os').AudioSettings | null> => {
  try {
    const response = await fetch(APIRoutes.UpdateAudioSettings(endpoint), {
      method: 'PUT',
      headers: createHeaders(authToken),
      body: JSON.stringify(settings)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to update audio settings: ${errorMessage}`)
      return null
    }

    const data = await response.json()
    toast.success('Audio settings updated successfully')
    return data
  } catch (error) {
    toast.error('Error updating audio settings')
    return null
  }
}

export const textToSpeechAPI = async (
  endpoint: string,
  text: string,
  voice?: string,
  authToken?: string
): Promise<Blob | null> => {
  try {
    const body: import('@/types/os').TTSRequest = { text }
    if (voice) body.voice = voice

    const response = await fetch(APIRoutes.TextToSpeech(endpoint), {
      method: 'POST',
      headers: createHeaders(authToken),
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to convert text to speech: ${errorMessage}`)
      return null
    }

    return await response.blob()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    toast.error(`Error converting text to speech: ${errorMessage}`)
    return null
  }
}

export const speechToTextAPI = async (
  endpoint: string,
  audioFile: File,
  authToken?: string
): Promise<import('@/types/os').STTResponse | null> => {
  try {
    const formData = new FormData()
    formData.append('audio', audioFile) // Changed from 'audio_file' to match backend

    const response = await fetch(APIRoutes.SpeechToText(endpoint), {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || response.statusText
      toast.error(`Failed to convert speech to text: ${errorMessage}`)
      return null
    }

    return await response.json()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    toast.error(`Error converting speech to text: ${errorMessage}`)
    return null
  }
}

export const getVoicesAPI = async (
  endpoint: string,
  authToken?: string
): Promise<import('@/types/os').Voice[]> => {
  try {
    const response = await fetch(APIRoutes.GetVoices(endpoint), {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch voices: ${response.statusText}`)
      return []
    }

    const data = await response.json()
    return data.voices || []
  } catch (error) {
    toast.error('Error fetching voices')
    return []
  }
}

export const getAudioModelsAPI = async (
  endpoint: string,
  authToken?: string
): Promise<import('@/types/os').AudioModel[]> => {
  try {
    const response = await fetch(APIRoutes.GetAudioModels(endpoint), {
      method: 'GET',
      headers: createHeaders(authToken)
    })

    if (!response.ok) {
      toast.error(`Failed to fetch audio models: ${response.statusText}`)
      return []
    }

    const data = await response.json()
    return data.models || []
  } catch (error) {
    toast.error('Error fetching audio models')
    return []
  }
}
