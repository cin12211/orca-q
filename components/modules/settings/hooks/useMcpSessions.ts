import { generateMcpToken } from '~/core/helpers/mcp-token';
import { uuidv4 } from '~/core/helpers/uuid';
import type {
  McpConnectionAccess,
  McpSession,
} from '~/core/persist/store-state';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

export interface McpSessionDraft {
  name: string;
  requireToken: boolean;
  workspaceAccess: Record<string, McpConnectionAccess>;
  connectionAccess: Record<string, McpConnectionAccess>;
}

/** MCP session CRUD for Settings → MCP Server. */
export function useMcpSessions() {
  const appConfigStore = useAppConfigStore();

  const sessions = computed(() => appConfigStore.mcpServerConfigs.sessions);

  const findSession = (sessionId: string) =>
    appConfigStore.mcpServerConfigs.sessions.find(
      session => session.id === sessionId
    );

  /** Only one session may accept requests without a token. */
  const releaseTokenlessSlot = (exceptSessionId: string) => {
    for (const session of appConfigStore.mcpServerConfigs.sessions) {
      if (session.id !== exceptSessionId) session.requireToken = true;
    }
  };

  const createSession = (draft: McpSessionDraft): McpSession => {
    const session: McpSession = {
      id: uuidv4(),
      name: draft.name.trim() || 'MCP session',
      token: generateMcpToken(),
      requireToken: draft.requireToken,
      createdAt: new Date().toISOString(),
      workspaceAccess: { ...draft.workspaceAccess },
      connectionAccess: { ...draft.connectionAccess },
    };

    if (!session.requireToken) releaseTokenlessSlot(session.id);
    appConfigStore.mcpServerConfigs.sessions.push(session);
    return session;
  };

  const updateSession = (sessionId: string, draft: McpSessionDraft) => {
    const session = findSession(sessionId);
    if (!session) return;

    session.name = draft.name.trim() || session.name;
    session.workspaceAccess = { ...draft.workspaceAccess };
    session.connectionAccess = { ...draft.connectionAccess };
    session.requireToken = draft.requireToken;
    if (!session.requireToken) releaseTokenlessSlot(session.id);
  };

  /** Issue a new token; the previous one stops working immediately. */
  const regenerateToken = (sessionId: string) => {
    const session = findSession(sessionId);
    if (session) session.token = generateMcpToken();
  };

  const deleteSession = (sessionId: string) => {
    appConfigStore.mcpServerConfigs.sessions =
      appConfigStore.mcpServerConfigs.sessions.filter(
        session => session.id !== sessionId
      );
  };

  return {
    sessions,
    createSession,
    updateSession,
    regenerateToken,
    deleteSession,
  };
}
