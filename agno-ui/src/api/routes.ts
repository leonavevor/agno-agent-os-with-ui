export const APIRoutes = {
  GetAgents: (agentOSUrl: string) => `${agentOSUrl}/agents`,
  AgentRun: (agentOSUrl: string) => `${agentOSUrl}/agents/{agent_id}/runs`,
  Status: (agentOSUrl: string) => `${agentOSUrl}/health`,
  GetSessions: (agentOSUrl: string) => `${agentOSUrl}/sessions`,
  GetSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}/runs`,

  DeleteSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}`,

  GetTeams: (agentOSUrl: string) => `${agentOSUrl}/teams`,
  TeamRun: (agentOSUrl: string, teamId: string) =>
    `${agentOSUrl}/teams/${teamId}/runs`,
  DeleteTeamSession: (agentOSUrl: string, teamId: string, sessionId: string) =>
    `${agentOSUrl}/v1//teams/${teamId}/sessions/${sessionId}`,

  // Skill routes
  GetSkills: (agentOSUrl: string) => `${agentOSUrl}/skills`,
  RouteSkills: (agentOSUrl: string) => `${agentOSUrl}/skills/route`,
  ReloadSkills: (agentOSUrl: string) => `${agentOSUrl}/skills/reload`,
  CreateSkill: (agentOSUrl: string) => `${agentOSUrl}/skills/create`,

  // MCP Server routes
  GetMCPServers: (agentOSUrl: string) => `${agentOSUrl}/mcp-servers`,
  GetMCPServer: (agentOSUrl: string, serverId: string) =>
    `${agentOSUrl}/mcp-servers/${serverId}`,
  CreateMCPServer: (agentOSUrl: string) => `${agentOSUrl}/mcp-servers`,
  UpdateMCPServer: (agentOSUrl: string, serverId: string) =>
    `${agentOSUrl}/mcp-servers/${serverId}`,
  DeleteMCPServer: (agentOSUrl: string, serverId: string) =>
    `${agentOSUrl}/mcp-servers/${serverId}`,

  // Tools routes
  GetTools: (agentOSUrl: string) => `${agentOSUrl}/tools`,
  GetTool: (agentOSUrl: string, toolId: string) => `${agentOSUrl}/tools/${toolId}`,
  CreateTool: (agentOSUrl: string) => `${agentOSUrl}/tools`,
  UpdateTool: (agentOSUrl: string, toolId: string) => `${agentOSUrl}/tools/${toolId}`,
  DeleteTool: (agentOSUrl: string, toolId: string) => `${agentOSUrl}/tools/${toolId}`,
  GetExternalToolSettings: (agentOSUrl: string) => `${agentOSUrl}/tools/settings/external-access`,
  UpdateExternalToolSettings: (agentOSUrl: string) => `${agentOSUrl}/tools/settings/external-access`,
  CheckToolExecution: (agentOSUrl: string, toolId: string) => `${agentOSUrl}/tools/${toolId}/can-execute`,
  ClearMemorySession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/memory/sessions/${sessionId}`,
  ListMemorySessions: (agentOSUrl: string) => `${agentOSUrl}/memory/sessions`,
  GetMemoryStats: (agentOSUrl: string) => `${agentOSUrl}/memory/stats`,
  ClearAllMemorySessions: (agentOSUrl: string) => `${agentOSUrl}/memory/sessions`,
  SearchMemoryMessages: (agentOSUrl: string) => `${agentOSUrl}/memory/search`,

  // Reference search routes
  SearchReferences: (agentOSUrl: string) => `${agentOSUrl}/references/search`,
  EmbedReferences: (agentOSUrl: string) => `${agentOSUrl}/references/embed`,
  GetEmbeddingStatus: (agentOSUrl: string, skillId: string) =>
    `${agentOSUrl}/references/skills/${skillId}/status`,

  // Knowledge base routes
  UploadKnowledge: (agentOSUrl: string) => `${agentOSUrl}/knowledge/content`,
  BulkUploadKnowledge: (agentOSUrl: string) => `${agentOSUrl}/knowledge/content/bulk`,
  ListKnowledge: (agentOSUrl: string) => `${agentOSUrl}/knowledge/content`,
  GetKnowledgeStatus: (agentOSUrl: string, contentId: string) =>
    `${agentOSUrl}/knowledge/content/${contentId}/status`,
  DeleteKnowledge: (agentOSUrl: string, contentId: string) =>
    `${agentOSUrl}/knowledge/content/${contentId}`,
  DeleteAllKnowledge: (agentOSUrl: string) => `${agentOSUrl}/knowledge/content`,
  GetKnowledgeStats: (agentOSUrl: string) => `${agentOSUrl}/knowledge/stats`,
  SearchKnowledge: (agentOSUrl: string) => `${agentOSUrl}/knowledge/search`,
  UpdateKnowledgeMetadata: (agentOSUrl: string, contentId: string) =>
    `${agentOSUrl}/knowledge/${contentId}/metadata`,
  KnowledgeHealthCheck: (agentOSUrl: string) => `${agentOSUrl}/knowledge/health`,

  // Audio routes
  GetAudioSettings: (agentOSUrl: string) => `${agentOSUrl}/os/audio/settings`,
  UpdateAudioSettings: (agentOSUrl: string) => `${agentOSUrl}/os/audio/settings`,
  TextToSpeech: (agentOSUrl: string) => `${agentOSUrl}/os/audio/tts`,
  SpeechToText: (agentOSUrl: string) => `${agentOSUrl}/os/audio/stt`,
  GetVoices: (agentOSUrl: string) => `${agentOSUrl}/os/audio/voices`,
  GetAudioModels: (agentOSUrl: string) => `${agentOSUrl}/os/audio/models`
}

// Export audioRoutes for audio API client
export const audioRoutes = {
  settings: '/os/audio/settings',
  tts: '/os/audio/tts',
  stt: '/os/audio/stt',
  voices: '/os/audio/voices',
  models: '/os/audio/models'
}

