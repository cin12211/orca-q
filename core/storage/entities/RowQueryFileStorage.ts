import type { RowQueryFile, RowQueryFileContent } from '~/core/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class RowQueryFileIDB extends IDBStorage<RowQueryFile> {
  readonly name = 'rowQueryFile';

  constructor() {
    super({ dbName: 'rowQueryFileIDB', storeName: 'row_query_files' });
  }
}

class RowQueryFileContentIDB extends IDBStorage<RowQueryFileContent> {
  readonly name = 'rowQueryFileContent';

  constructor() {
    super({
      dbName: 'rowQueryFileContentIDB',
      storeName: 'row_query_file_contents',
    });
  }

  // No timestamps for content records
  protected override applyTimestamps(
    entity: RowQueryFileContent
  ): RowQueryFileContent {
    return entity;
  }
}

const fileStore = new RowQueryFileIDB();
const contentStore = new RowQueryFileContentIDB();

export const rowQueryFileStorage = {
  getAllFiles: () => fileStore.getMany(),

  getFilesByContext: (ctx: { workspaceId: string }) =>
    fileStore.getMany({
      workspaceId: ctx.workspaceId,
    } as Partial<RowQueryFile>),

  createFiles: async (file: RowQueryFile): Promise<RowQueryFile> => {
    const created = await fileStore.create(file);
    const existing = await contentStore.getOne(file.id);
    if (!existing) {
      await contentStore.upsert({ id: file.id, contents: '' });
    }
    return created;
  },

  updateFile: (file: Partial<RowQueryFile> & { id: string }) =>
    fileStore.update(file),

  updateFileContent: async (content: RowQueryFileContent): Promise<void> => {
    await contentStore.upsert(content);
  },

  getFileContentById: (id: string) => contentStore.getOne(id),

  deleteFile: async (props: { id: string }): Promise<void> => {
    await contentStore.delete(props.id);
    await fileStore.delete(props.id);
  },

  deleteFileByWorkspaceId: async (props: { wsId: string }): Promise<void> => {
    const files = await fileStore.getMany({
      workspaceId: props.wsId,
    } as Partial<RowQueryFile>);
    await Promise.all(
      files.map(async f => {
        await contentStore.delete(f.id);
        await fileStore.delete(f.id);
      })
    );
  },
};
