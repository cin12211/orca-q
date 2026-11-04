import type { Knex } from 'knex';
import type { BlobRow } from './shared';
import { createTableIfMissing } from './shared';

export type AgentStateRow = BlobRow;

export async function createAgentStateTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'agent_state', t => {
    t.text('id').primary();
    t.text('data').notNullable();
  });
}
