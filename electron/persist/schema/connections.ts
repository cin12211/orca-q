import type { Knex } from 'knex';
import type { Connection } from '~/core/types/entities';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type ConnectionRow = ToSQLiteRow<Connection>;

export async function createConnectionsTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'connections', t => {
    t.text('id').primary();
    t.text('workspace_id').references('id').inTable('workspaces').nullable();
    t.text('name').nullable();
    t.text('type').nullable();
    t.text('method').nullable();
    t.text('connection_string').nullable();
    t.text('host').nullable();
    t.text('port').nullable();
    t.text('username').nullable();
    t.text('password').nullable();
    t.text('database').nullable();
    t.text('ssl').nullable();
    t.text('ssh').nullable();
    t.text('tag_ids').nullable();
    t.text('created_at').nullable();
    t.text('updated_at').nullable();

    t.index(['workspace_id'], 'idx_connections_workspace');
  });
}
