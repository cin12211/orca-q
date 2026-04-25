import type {
  RowQueryFile,
  RowQueryFileContent,
} from '~/core/types/entities/row-query-file.entity';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { RowQueryFileContentRow, RowQueryFileRow } from '../schema';

class RowQueryFileSQLiteStorage extends SQLite3Storage<RowQueryFile> {
  readonly name = 'rowQueryFileSQLite';
  readonly tableName = 'row_query_files';

  toRow(f: RowQueryFile): Record<string, unknown> {
    return {
      id: f.id,
      workspaceId: f.workspaceId,
      parentId: f.parentId ?? null,
      title: f.title,
      type: f.type,
      isFolder: f.isFolder ? 1 : 0,
      icon: f.icon,
      closeIcon: f.closeIcon ?? null,
      variables: f.variables ?? '',
      path: f.path ?? null,
      cursorPos: f.cursorPos != null ? JSON.stringify(f.cursorPos) : null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): RowQueryFile {
    const r = row as unknown as RowQueryFileRow;
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      parentId: r.parentId ?? undefined,
      title: r.title,
      type: r.type,
      isFolder: Number(r.isFolder) === 1,
      icon: r.icon ?? '',
      closeIcon: r.closeIcon ?? undefined,
      variables: r.variables ?? '',
      path: r.path ?? undefined,
      cursorPos: r.cursorPos ? JSON.parse(r.cursorPos) : undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? undefined,
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

  protected override getOrderByColumn(): string | null {
    return null; // no order needed
  }
}

export const rowQueryFileSQLiteFileAdapter = new RowQueryFileSQLiteStorage(
  getKnex()
);
export const rowQueryFileSQLiteContentAdapter =
  new RowQueryFileContentSQLiteStorage(getKnex());

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
