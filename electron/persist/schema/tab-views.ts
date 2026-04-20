import type { Knex } from 'knex';
import type { TabView } from '~/core/types/entities';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type TabViewRow = ToSQLiteRow<TabView>;

export async function createTabViewsTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'tab_views', t => {
    t.text('id').primary();
    t.text('workspace_id').references('id').inTable('workspaces').nullable();
    t.text('connection_id').nullable();
    t.text('schema_id').nullable();
    t.integer('index').nullable();
    t.text('name').nullable();
    t.text('icon').nullable();
    t.text('icon_class').nullable();
    t.text('type').nullable();
    t.text('route_name').nullable();
    t.text('route_params').nullable();
    t.text('metadata').nullable();

    t.index(['workspace_id', 'connection_id'], 'idx_tab_views_ctx');
  });
}
