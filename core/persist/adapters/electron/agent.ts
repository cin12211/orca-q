import {
  AGENT_STATE_PERSIST_ID,
  normalizeAgentState,
  type AgentPersistedState,
} from '../../store-state';
import type { AgentPersistApi } from '../../types';
import { persistDelete, persistGetOne, persistUpsert } from './primitives';

export const agentElectronAdapter: AgentPersistApi = {
  get: async () => {
    const value = await persistGetOne<AgentPersistedState>(
      'agentState',
      AGENT_STATE_PERSIST_ID
    );
    return value ? normalizeAgentState(value) : null;
  },

  save: async state => {
    const normalized = normalizeAgentState(state);
    return persistUpsert<AgentPersistedState>(
      'agentState',
      normalized.id,
      normalized
    );
  },

  delete: async () => {
    await persistDelete(
      'agentState',
      [{ field: 'id', value: AGENT_STATE_PERSIST_ID }],
      'all'
    );
  },
};
