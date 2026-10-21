import { storeToRefs } from 'pinia';
import { useMcpSessionStore } from '~/core/stores/useMcpSessionStore';

export type { McpSessionDraft } from '~/core/stores/useMcpSessionStore';

/** MCP session CRUD for Settings → MCP Server. */
export function useMcpSessions() {
  const mcpSessionStore = useMcpSessionStore();
  const { sessions } = storeToRefs(mcpSessionStore);

  return {
    sessions,
    createSession: mcpSessionStore.createSession,
    updateSession: mcpSessionStore.updateSession,
    regenerateToken: mcpSessionStore.regenerateToken,
    deleteSession: mcpSessionStore.deleteSession,
  };
}
