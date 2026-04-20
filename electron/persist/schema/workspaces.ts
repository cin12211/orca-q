import type { Knex } from 'knex';
import type { Workspace } from '~/core/types/entities';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type WorkspaceRow = ToSQLiteRow<Workspace>;

export async function createWorkspacesTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'workspaces', t => {
    t.text('id').primary();
    t.text('icon').nullable();
    t.text('name').nullable();
    t.text('desc').nullable();
    t.text('last_opened').nullable();
    t.text('created_at').nullable();
    t.text('updated_at').nullable();
  });
}
