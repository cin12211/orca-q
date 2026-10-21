import {
  generateMcpToken,
  getMcpTokenPreview,
  hashMcpToken,
} from '~/core/helpers/mcp-token';
import { uuidv4 } from '~/core/helpers/uuid';
import type {
  McpConnectionAccess,
  McpSession,
} from '~/core/persist/store-state';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

export interface McpSessionDraft {
  name: string;
  workspaceAccess: Record<string, McpConnectionAccess>;
  connectionAccess: Record<string, McpConnectionAccess>;
}

/**
 * MCP session CRUD. Tokens are returned to the caller exactly once; only
 * their hash is persisted, so a lost token must be regenerated.
 */
export function useMcpSessions() {
  const appConfigStore = useAppConfigStore();

  const sessions = computed(() => appConfigStore.mcpServerConfigs.sessions);

  const findSession = (sessionId: string) =>
    appConfigStore.mcpServerConfigs.sessions.find(
      session => session.id === sessionId
    );

  const issueToken = async () => {
    const token = generateMcpToken();
    return {
      token,
      tokenHash: await hashMcpToken(token),
      tokenPreview: getMcpTokenPreview(token),
    };
  };

  const createSession = async (draft: McpSessionDraft): Promise<string> => {
    const { token, tokenHash, tokenPreview } = await issueToken();
    const session: McpSession = {
      id: uuidv4(),
      name: draft.name.trim() || 'MCP session',
      tokenHash,
      tokenPreview,
      createdAt: new Date().toISOString(),
      workspaceAccess: { ...draft.workspaceAccess },
      connectionAccess: { ...draft.connectionAccess },
    };

    appConfigStore.mcpServerConfigs.sessions.push(session);
    return token;
  };

  const updateSession = (sessionId: string, draft: McpSessionDraft) => {
    const session = findSession(sessionId);
    if (!session) return;

    session.name = draft.name.trim() || session.name;
    session.workspaceAccess = { ...draft.workspaceAccess };
    session.connectionAccess = { ...draft.connectionAccess };
  };

  const regenerateToken = async (sessionId: string): Promise<string | null> => {
    const session = findSession(sessionId);
    if (!session) return null;

    const { token, tokenHash, tokenPreview } = await issueToken();
    session.tokenHash = tokenHash;
    session.tokenPreview = tokenPreview;
    return token;
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
