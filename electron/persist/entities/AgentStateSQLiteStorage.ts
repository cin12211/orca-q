import type { AgentPersistedState } from '~/core/types/entities/agent-state.entity';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { AgentStateRow } from '../schema';
import { normalizeAgentState } from '../utils/normalizeState';

interface AgentStateRecord {
  id: string;
  data: AgentPersistedState;
}

class AgentStateSQLiteStorage extends SQLite3Storage<AgentStateRecord> {
  readonly name = 'agentStateSQLite';
  readonly tableName = 'agent_state';
  private static readonly KEY = 'agent-state';

  toRow(record: AgentStateRecord): Record<string, unknown> {
    return { id: record.id, data: JSON.stringify(record.data) };
  }

  fromRow(row: Record<string, unknown>): AgentStateRecord {
    const r = row as unknown as AgentStateRow;
    return { id: r.id, data: JSON.parse(r.data) };
  }

  async get(): Promise<AgentPersistedState> {
    const record = await this.getOne(AgentStateSQLiteStorage.KEY);
    return normalizeAgentState(record?.data ?? {});
  }

  async save(state: AgentPersistedState): Promise<void> {
    await this.upsert({
      id: AgentStateSQLiteStorage.KEY,
      data: normalizeAgentState(state),
    });
  }

  async deleteState(): Promise<void> {
    await this.delete(AgentStateSQLiteStorage.KEY);
  }

  // No timestamps for blob records
  protected override applyTimestamps(
    entity: AgentStateRecord
  ): AgentStateRecord {
    return entity;
  }

  protected override getOrderByColumn(): string | null {
    return null;
  }
}

export const agentStateSQLiteStorage = new AgentStateSQLiteStorage(getKnex());
