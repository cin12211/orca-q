import type { Knex } from 'knex';
import type { McpSession } from '../utils/normalizeState';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type McpSessionRow = ToSQLiteRow<McpSession>;

export async function createMcpSessionsTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'mcp_sessions', t => {
    t.text('id').primary();
    t.text('name').notNullable();
    t.text('token').notNullable();
    t.integer('require_token').notNullable().defaultTo(1);
    t.text('workspace_access').notNullable().defaultTo('{}');
    t.text('connection_access').notNullable().defaultTo('{}');
    t.text('created_at').nullable();
    t.text('updated_at').nullable();

    t.unique(['token'], { indexName: 'idx_mcp_sessions_token' });
  });
}
