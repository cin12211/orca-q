import { AGENT_STATE_IDB } from '#shared/storage/idbRegistry';
import type { AgentPersistedState } from '#shared/types/entities';
import { normalizeAgentState } from '~/core/persist/store-state';
import { IDBStorage } from '../base/IDBStorage';

interface AgentStateRecord {
  id: string;
  data: AgentPersistedState;
}

class AgentStateStorage extends IDBStorage<AgentStateRecord> {
  readonly name = 'agentState';
  private static readonly KEY = 'agent-state';

  constructor() {
    super(AGENT_STATE_IDB);
  }

  async get(): Promise<AgentPersistedState> {
    const record = await this.getOne(AgentStateStorage.KEY);
    return normalizeAgentState(record?.data ?? {});
  }

  async save(state: AgentPersistedState): Promise<void> {
    await this.upsert({
      id: AgentStateStorage.KEY,
      data: normalizeAgentState(state),
    });
  }

  async deleteState(): Promise<void> {
    await this.delete(AgentStateStorage.KEY);
  }
}

export const agentStateStorage = new AgentStateStorage();
