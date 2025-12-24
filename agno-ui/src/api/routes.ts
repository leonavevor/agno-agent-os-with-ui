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

  // Memory routes
  InitializeSession: (agentOSUrl: string) => `${agentOSUrl}/memory/sessions`,
  AddMessage: (agentOSUrl: string) => `${agentOSUrl}/memory/messages`,
  GetChatHistory: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/memory/sessions/${sessionId}/history`,
  UpdateLearnedFacts: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/memory/sessions/${sessionId}/facts`,
  GetLearnedFacts: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/memory/sessions/${sessionId}/facts`,
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
  KnowledgeHealthCheck: (agentOSUrl: string) => `${agentOSUrl}/knowledge/health`
}
