import type { McpSessionStorageApi } from '~/core/storage/types';
import { normalizeMcpSession, type McpSession } from '../../normalize';
import {
  persistDelete,
  persistGetAll,
  persistUpsert,
  sortByCreatedAt,
} from './primitives';

export const mcpSessionElectronAdapter: McpSessionStorageApi = {
  getAll: async () =>
    sortByCreatedAt(await persistGetAll<McpSession>('mcpSessions')).flatMap(
      session => {
        const normalized = normalizeMcpSession(session);
        return normalized ? [normalized] : [];
      }
    ),

  upsert: session =>
    persistUpsert<McpSession>('mcpSessions', session.id, session),

  delete: async id => {
    await persistDelete<McpSession>(
      'mcpSessions',
      [{ field: 'id', value: id }],
      'all'
    );
  },
};
