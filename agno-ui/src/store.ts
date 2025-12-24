import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  AgentDetails,
  SessionEntry,
  TeamDetails,
  type ChatMessage,
  type SkillMetadata,
  type ModelProvider,
  type CurrentModelResponse,
  type ProviderConfig,
  type DefaultModelConfig,
  type EntityModelConfig,
  type ModelConfiguration
} from '@/types/os'
import { Project } from '@/components/ProjectModal'

interface Store {
  hydrated: boolean
  setHydrated: () => void
  streamingErrorMessage: string
  setStreamingErrorMessage: (streamingErrorMessage: string) => void
  endpoints: {
    endpoint: string
    id__endpoint: string
  }[]
  setEndpoints: (
    endpoints: {
      endpoint: string
      id__endpoint: string
    }[]
  ) => void
  isStreaming: boolean
  setIsStreaming: (isStreaming: boolean) => void
  isEndpointActive: boolean
  setIsEndpointActive: (isActive: boolean) => void
  isEndpointLoading: boolean
  setIsEndpointLoading: (isLoading: boolean) => void
  messages: ChatMessage[]
  setMessages: (
    messages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])
  ) => void
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>
  selectedEndpoint: string
  setSelectedEndpoint: (selectedEndpoint: string) => void
  authToken: string
  setAuthToken: (authToken: string) => void
  agents: AgentDetails[]
  setAgents: (agents: AgentDetails[]) => void
  teams: TeamDetails[]
  setTeams: (teams: TeamDetails[]) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  mode: 'agent' | 'team'
  setMode: (mode: 'agent' | 'team') => void
  sessionsData: SessionEntry[] | null
  setSessionsData: (
    sessionsData:
      | SessionEntry[]
      | ((prevSessions: SessionEntry[] | null) => SessionEntry[] | null)
  ) => void
  isSessionsLoading: boolean
  setIsSessionsLoading: (isSessionsLoading: boolean) => void
  skills: SkillMetadata[]
  setSkills: (skills: SkillMetadata[]) => void
  isSkillsLoading: boolean
  setIsSkillsLoading: (isLoading: boolean) => void
  skillSearchQuery: string
  setSkillSearchQuery: (query: string) => void
  recommendedSkills: SkillMetadata[]
  setRecommendedSkills: (skills: SkillMetadata[]) => void
  isRoutingSkills: boolean
  setIsRoutingSkills: (isRouting: boolean) => void
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down' | 'checking'
    backendConnected: boolean
    databaseConnected: boolean
    lastChecked: number | null
    error: string | null
  }
  setSystemHealth: (health: Store['systemHealth']) => void
  modelProviders: ModelProvider[]
  setModelProviders: (providers: ModelProvider[]) => void
  currentModel: CurrentModelResponse | null
  setCurrentModel: (model: CurrentModelResponse | null) => void
  isModelsLoading: boolean
  setIsModelsLoading: (isLoading: boolean) => void
  providerConfigs: ProviderConfig[]
  setProviderConfigs: (configs: ProviderConfig[]) => void
  defaultModelConfig: DefaultModelConfig | null
  setDefaultModelConfig: (config: DefaultModelConfig | null) => void
  entityModelConfigs: EntityModelConfig[]
  setEntityModelConfigs: (configs: EntityModelConfig[]) => void
  isModelConfigLoading: boolean
  setIsModelConfigLoading: (isLoading: boolean) => void
  projects: Project[]
  setProjects: (projects: Project[]) => void
  selectedProject: string | null
  setSelectedProject: (projectId: string | null) => void
  enabledSkills: Set<string>
  setEnabledSkills: (skillIds: Set<string>) => void
  theme: 'light' | 'dark-gray' | 'dark'
  setTheme: (theme: 'light' | 'dark-gray' | 'dark') => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      streamingErrorMessage: '',
      setStreamingErrorMessage: (streamingErrorMessage) =>
        set(() => ({ streamingErrorMessage })),
      endpoints: [],
      setEndpoints: (endpoints) => set(() => ({ endpoints })),
      isStreaming: false,
      setIsStreaming: (isStreaming) => set(() => ({ isStreaming })),
      isEndpointActive: false,
      setIsEndpointActive: (isActive) =>
        set(() => ({ isEndpointActive: isActive })),
      isEndpointLoading: true,
      setIsEndpointLoading: (isLoading) =>
        set(() => ({ isEndpointLoading: isLoading })),
      messages: [],
      setMessages: (messages) =>
        set((state) => ({
          messages:
            typeof messages === 'function' ? messages(state.messages) : messages
        })),
      chatInputRef: { current: null },
      selectedEndpoint: 'http://localhost:7777',
      setSelectedEndpoint: (selectedEndpoint) =>
        set(() => ({ selectedEndpoint })),
      authToken: '',
      setAuthToken: (authToken) => set(() => ({ authToken })),
      agents: [],
      setAgents: (agents) => set({ agents }),
      teams: [],
      setTeams: (teams) => set({ teams }),
      selectedModel: '',
      setSelectedModel: (selectedModel) => set(() => ({ selectedModel })),
      mode: 'agent',
      setMode: (mode) => set(() => ({ mode })),
      sessionsData: null,
      setSessionsData: (sessionsData) =>
        set((state) => ({
          sessionsData:
            typeof sessionsData === 'function'
              ? sessionsData(state.sessionsData)
              : sessionsData
        })),
      isSessionsLoading: false,
      setIsSessionsLoading: (isSessionsLoading) =>
        set(() => ({ isSessionsLoading })),
      skills: [],
      setSkills: (skills) => set(() => ({ skills })),
      isSkillsLoading: false,
      setIsSkillsLoading: (isLoading) =>
        set(() => ({ isSkillsLoading: isLoading })),
      skillSearchQuery: '',
      setSkillSearchQuery: (query) => set(() => ({ skillSearchQuery: query })),
      recommendedSkills: [],
      setRecommendedSkills: (skills) =>
        set(() => ({ recommendedSkills: skills })),
      isRoutingSkills: false,
      setIsRoutingSkills: (isRouting) =>
        set(() => ({ isRoutingSkills: isRouting })),
      systemHealth: {
        status: 'checking',
        backendConnected: false,
        databaseConnected: false,
        lastChecked: null,
        error: null
      },
      setSystemHealth: (health) => set(() => ({ systemHealth: health })),
      modelProviders: [],
      setModelProviders: (providers) => set(() => ({ modelProviders: providers })),
      currentModel: null,
      setCurrentModel: (model) => set(() => ({ currentModel: model })),
      isModelsLoading: false,
      providerConfigs: [],
      setProviderConfigs: (configs) => set(() => ({ providerConfigs: configs })),
      setIsModelsLoading: (isLoading) =>
        set(() => ({ isModelsLoading: isLoading })),
      defaultModelConfig: null,
      setDefaultModelConfig: (config) => set(() => ({ defaultModelConfig: config })),
      entityModelConfigs: [],
      setEntityModelConfigs: (configs) => set(() => ({ entityModelConfigs: configs })),
      isModelConfigLoading: false,
      setIsModelConfigLoading: (isLoading) =>
        set(() => ({ isModelConfigLoading: isLoading })),
      projects: [],
      setProjects: (projects) => set(() => ({ projects })),
      selectedProject: null,
      setSelectedProject: (projectId) => set(() => ({ selectedProject: projectId })),
      enabledSkills: new Set(),
      setEnabledSkills: (skillIds) => set(() => ({ enabledSkills: skillIds })),
      theme: 'dark',
      setTheme: (theme) => set(() => ({ theme }))
    }),
    {
      name: 'endpoint-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedEndpoint: state.selectedEndpoint,
        projects: state.projects,
        selectedProject: state.selectedProject,
        enabledSkills: Array.from(state.enabledSkills),
        theme: state.theme
      }),
      merge: (persistedState: any, currentState) => {
        // Convert enabledSkills array back to Set on rehydration
        const enabledSkills = persistedState?.enabledSkills
          ? new Set(persistedState.enabledSkills)
          : new Set()
        return {
          ...currentState,
          ...persistedState,
          enabledSkills
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.()
      }
    }
  )
)
