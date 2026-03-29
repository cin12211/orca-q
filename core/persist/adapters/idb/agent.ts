import localforage from 'localforage';
import {
  AGENT_STATE_PERSIST_ID,
  normalizeAgentState,
  type AgentPersistedState,
} from '../../store-state';
import type { AgentPersistApi } from '../../types';

const store = localforage.createInstance({
  name: 'agentStateIDB',
  storeName: 'agentState',
});

export const agentIDBAdapter: AgentPersistApi = {
  get: async () => {
    const value = await store.getItem<AgentPersistedState>(
      AGENT_STATE_PERSIST_ID
    );
    return value ? normalizeAgentState(value) : null;
  },

  save: async state => {
    const normalized = normalizeAgentState(state);
    await store.setItem(normalized.id, normalized);
    return normalized;
  },

  delete: async () => {
    await store.removeItem(AGENT_STATE_PERSIST_ID);
  },
};
