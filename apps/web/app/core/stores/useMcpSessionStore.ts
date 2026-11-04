import { defineStore } from 'pinia';
import { ref } from 'vue';
import { generateMcpToken } from '~/core/helpers/mcp-token';
import { uuidv4 } from '~/core/helpers/uuid';
import type { McpConnectionAccess, McpSession } from '~/core/persist/normalize';
import { createStorageApis } from '~/core/storage';

export interface McpSessionDraft {
  name: string;
  requireToken: boolean;
  workspaceAccess: Record<string, McpConnectionAccess>;
  connectionAccess: Record<string, McpConnectionAccess>;
}

const DEFAULT_SESSION_NAME = 'MCP session';

/** Plain copy so the record can cross the Electron IPC boundary. */
const toPlainSession = (session: McpSession): McpSession =>
  JSON.parse(JSON.stringify(session)) as McpSession;

/**
 * MCP sessions, persisted in their own collection (`mcp_sessions` table on
 * desktop) so the Nitro MCP endpoint can read them directly.
 */
export const useMcpSessionStore = defineStore('mcp-sessions', () => {
  const storageApis = createStorageApis();

  const sessions = ref<McpSession[]>([]);

  const findSession = (sessionId: string) =>
    sessions.value.find(session => session.id === sessionId);

  const persistSession = async (session: McpSession) => {
    const saved = await storageApis.mcpSessionStorage.upsert(
      toPlainSession({ ...session, updatedAt: new Date().toISOString() })
    );
    const index = sessions.value.findIndex(item => item.id === saved.id);

    if (index === -1) sessions.value.push(saved);
    else sessions.value.splice(index, 1, saved);

    return saved;
  };

  /** Only one session may accept requests without a token. */
  const releaseTokenlessSlot = async (exceptSessionId: string) => {
    const others = sessions.value.filter(
      session => session.id !== exceptSessionId && !session.requireToken
    );

    for (const session of others) {
      await persistSession({ ...session, requireToken: true });
    }
  };

  const loadPersistData = async () => {
    sessions.value = await storageApis.mcpSessionStorage.getAll();
  };

  const createSession = async (draft: McpSessionDraft) => {
    const session = await persistSession({
      id: uuidv4(),
      name: draft.name.trim() || DEFAULT_SESSION_NAME,
      token: generateMcpToken(),
      requireToken: draft.requireToken,
      createdAt: new Date().toISOString(),
      workspaceAccess: { ...draft.workspaceAccess },
      connectionAccess: { ...draft.connectionAccess },
    });

    if (!session.requireToken) await releaseTokenlessSlot(session.id);
    return session;
  };

  const updateSession = async (sessionId: string, draft: McpSessionDraft) => {
    const session = findSession(sessionId);
    if (!session) return;

    await persistSession({
      ...session,
      name: draft.name.trim() || session.name,
      requireToken: draft.requireToken,
      workspaceAccess: { ...draft.workspaceAccess },
      connectionAccess: { ...draft.connectionAccess },
    });

    if (!draft.requireToken) await releaseTokenlessSlot(sessionId);
  };

  /** Issue a new token; the previous one stops working immediately. */
  const regenerateToken = async (sessionId: string) => {
    const session = findSession(sessionId);
    if (!session) return;

    await persistSession({ ...session, token: generateMcpToken() });
  };

  const deleteSession = async (sessionId: string) => {
    await storageApis.mcpSessionStorage.delete(sessionId);
    sessions.value = sessions.value.filter(session => session.id !== sessionId);
  };

  return {
    sessions,
    loadPersistData,
    createSession,
    updateSession,
    regenerateToken,
    deleteSession,
  };
});
