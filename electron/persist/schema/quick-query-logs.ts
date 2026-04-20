import type { Knex } from 'knex';
import type { QuickQueryLog } from '~/core/types/entities';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type QuickQueryLogRow = ToSQLiteRow<QuickQueryLog>;

export async function createQuickQueryLogsTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'quick_query_logs', t => {
    t.text('id').primary();
    t.text('connection_id').nullable();
    t.text('workspace_id').nullable();
    t.text('schema_name').nullable();
    t.text('table_name').nullable();
    t.text('logs').nullable();
    t.float('query_time').nullable();
    t.text('error').nullable();
    t.text('error_message').nullable();
    t.text('created_at').nullable();
    t.text('updated_at').nullable();

    t.index(['connection_id'], 'idx_qlogs_conn');
  });
}
