import type { Knex } from 'knex';
import type { WorkspaceState } from '~/core/types/entities';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type WorkspaceStateRow = ToSQLiteRow<WorkspaceState>;

export async function createWorkspaceStatesTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'workspace_states', t => {
    t.text('id').primary();
    t.text('connection_id').nullable();
    t.text('connection_states').nullable();
    t.text('opened_at').nullable();
    t.text('updated_at').nullable();
  });
}
