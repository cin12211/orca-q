import type { Knex } from 'knex';
import type { RowQueryFile, RowQueryFileContent } from '~/core/types/entities';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type RowQueryFileRow = ToSQLiteRow<
  Pick<
    RowQueryFile,
    | 'id'
    | 'workspaceId'
    | 'parentId'
    | 'title'
    | 'type'
    | 'isFolder'
    | 'icon'
    | 'variables'
    | 'createdAt'
    | 'updatedAt'
  >
> & {
  closeIcon: string | null;
  path: string | null;
  cursorPos: string | null; // JSON-encoded { from, to }
};

export type RowQueryFileContentRow = ToSQLiteRow<RowQueryFileContent>;

export async function createRowQueryFilesTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'row_query_files', t => {
    t.text('id').primary();
    t.text('workspace_id').references('id').inTable('workspaces').nullable();
    t.text('parent_id').nullable();
    t.text('title').nullable();
    t.text('type').nullable();
    t.integer('is_folder').nullable();
    t.text('icon').nullable().defaultTo('');
    t.text('close_icon').nullable();
    t.text('variables').nullable();
    t.text('path').nullable();
    t.text('cursor_pos').nullable();
    t.text('created_at').nullable();
    t.text('updated_at').nullable();

    t.index(['workspace_id'], 'idx_rqf_workspace');
  });
}

export async function createRowQueryFileContentsTable(
  knex: Knex
): Promise<void> {
  await createTableIfMissing(knex, 'row_query_file_contents', t => {
    t.text('id')
      .primary()
      .references('id')
      .inTable('row_query_files')
      .onDelete('CASCADE');
    t.text('contents').nullable().defaultTo('');
  });
}
