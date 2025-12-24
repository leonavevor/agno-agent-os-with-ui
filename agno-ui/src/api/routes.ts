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

  // Reference search routes
  SearchReferences: (agentOSUrl: string) => `${agentOSUrl}/references/search`,
  EmbedReferences: (agentOSUrl: string) => `${agentOSUrl}/references/embed`,
  GetEmbeddingStatus: (agentOSUrl: string, skillId: string) =>
    `${agentOSUrl}/references/skills/${skillId}/status`
}
