import type {
  RowQueryFile,
  RowQueryFileContent,
} from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { RowQueryFileContentRow, RowQueryFileRow } from '../schema';

class RowQueryFileSQLiteStorage extends SQLite3Storage<RowQueryFile> {
  readonly name = 'rowQueryFileSQLite';
  readonly tableName = 'row_query_files';

  toRow(f: RowQueryFile): Record<string, unknown> {
    return {
      id: f.id,
      workspace_id: f.workspaceId,
      parent_id: f.parentId ?? null,
      title: f.title,
      type: f.type,
      created_at: f.createdAt,
      updated_at: f.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): RowQueryFile {
    const r = row as unknown as RowQueryFileRow;
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      parentId: r.parent_id ?? undefined,
      title: r.title,
      type: r.type,
      createdAt: r.created_at,
      updatedAt: r.updated_at ?? undefined,
    };
  }
}

class RowQueryFileContentSQLiteStorage extends SQLite3Storage<RowQueryFileContent> {
  readonly name = 'rowQueryFileContentSQLite';
  readonly tableName = 'row_query_file_contents';

  toRow(c: RowQueryFileContent): Record<string, unknown> {
    return { id: c.id, contents: c.contents };
  }

  fromRow(row: Record<string, unknown>): RowQueryFileContent {
    const r = row as unknown as RowQueryFileContentRow;
    return { id: r.id, contents: r.contents };
  }

  // No timestamps for content records
  protected override applyTimestamps(
    entity: RowQueryFileContent
  ): RowQueryFileContent {
    return entity;
  }

  protected override addDefaultOrder(sql: string): string {
    return sql; // no order needed
  }
}

export const rowQueryFileSQLiteFileAdapter = new RowQueryFileSQLiteStorage(
  getDB()
);
export const rowQueryFileSQLiteContentAdapter =
  new RowQueryFileContentSQLiteStorage(getDB());

const fileDb = rowQueryFileSQLiteFileAdapter;
const contentDb = rowQueryFileSQLiteContentAdapter;

export const rowQueryFileSQLiteStorage = {
  getAllFiles: () => fileDb.getMany(),

  getFilesByContext: (ctx: { workspaceId: string }) =>
    fileDb.getMany({ workspaceId: ctx.workspaceId } as Partial<RowQueryFile>),

  createFiles: async (file: RowQueryFile): Promise<RowQueryFile> => {
    const created = await fileDb.create(file);
    const existing = await contentDb.getOne(file.id);
    if (!existing) {
      await contentDb.upsert({ id: file.id, contents: '' });
    }
    return created;
  },

  updateFile: (file: Partial<RowQueryFile> & { id: string }) =>
    fileDb.update(file),

  updateFileContent: async (content: RowQueryFileContent): Promise<void> => {
    await contentDb.upsert(content);
  },

  getFileContentById: (id: string) => contentDb.getOne(id),

  deleteFile: async (props: { id: string }): Promise<void> => {
    await contentDb.delete(props.id);
    await fileDb.delete(props.id);
  },

  deleteFileByWorkspaceId: async (props: { wsId: string }): Promise<void> => {
    const files = await fileDb.getMany({
      workspaceId: props.wsId,
    } as Partial<RowQueryFile>);
    await Promise.all(
      files.map(async f => {
        await contentDb.delete(f.id);
        await fileDb.delete(f.id);
      })
    );
  },
};
