import dayjs from 'dayjs';
import localforage from 'localforage';
import { toRawJSON } from '~/core/helpers';
import type {
  RowQueryFile,
  RowQueryFileContent,
} from '../stores/useExplorerFileStore';

const rowQueryFileIDBStore = localforage.createInstance({
  name: 'rowQueryFileIDBStore',
  storeName: 'rowQueryFiles',
});

const rowQueryFileContentIDBStore = localforage.createInstance({
  name: 'rowQueryFileContentIDBStore',
  storeName: 'rowQueryFileContents',
});

export const rowQueryFileIDBApi: (typeof window)['rowQueryFilesApi'] = {
  getAllFiles: async (): Promise<RowQueryFile[]> => {
    const keys = await rowQueryFileIDBStore.keys();
    const all: RowQueryFile[] = [];

    for (const key of keys) {
      const item = await rowQueryFileIDBStore.getItem<RowQueryFile>(key);
      if (item) all.push(item);
    }

    return all.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
    );
  },

  getFilesByContext: async ({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<RowQueryFile[]> => {
    const files = await rowQueryFileIDBApi.getAllFiles();

    return files
      .filter(file => file.workspaceId === workspaceId)
      .sort(
        (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
      );
  },

  createFiles: async (fileValue: RowQueryFile): Promise<RowQueryFile> => {
    const file: RowQueryFile = toRawJSON({
      ...fileValue,
      createdAt: fileValue.createdAt || dayjs().toISOString(),
    });

    const isExitFileContent =
      await rowQueryFileContentIDBStore.getItem<RowQueryFileContent>(file.id);

    await rowQueryFileIDBStore.setItem(file.id, file);

    if (!isExitFileContent) {
      const fileContent: RowQueryFileContent = {
        id: file.id,
        contents: '',
        variables: '',
      };

      await rowQueryFileContentIDBStore.setItem(file.id, fileContent);
    }

    return file;
  },

  updateFile: async (
    fileValue: Partial<RowQueryFile> & { id: string }
  ): Promise<RowQueryFile | null> => {
    const existing = await rowQueryFileIDBStore.getItem<RowQueryFile>(
      fileValue.id
    );

    if (!existing) return null;

    const fileUpdated: RowQueryFile = toRawJSON<RowQueryFile>({
      ...existing,
      ...fileValue,
    });

    await rowQueryFileIDBStore.setItem(fileValue.id, fileUpdated);
    return fileUpdated;
  },

  updateFileContent: async (
    fileContent: RowQueryFileContent
  ): Promise<RowQueryFileContent | null> => {
    const existing = await rowQueryFileIDBStore.getItem<RowQueryFileContent>(
      fileContent.id
    );

    if (!existing) return null;

    await rowQueryFileContentIDBStore.setItem(fileContent.id, fileContent);
    return fileContent;
  },

  getFileContentById: async (
    id: string
  ): Promise<RowQueryFileContent | null> => {
    return await rowQueryFileContentIDBStore.getItem<RowQueryFileContent>(id);
  },

  deleteFile: async ({ id }: { id: string }): Promise<void> => {
    await rowQueryFileIDBStore.removeItem(id);
    await rowQueryFileContentIDBStore.removeItem(id);
  },

  deleteFileByWorkspaceId: async ({
    wsId,
  }: {
    wsId: string;
  }): Promise<void> => {
    const files = await rowQueryFileIDBApi.getFilesByContext({
      workspaceId: wsId,
    });

    const deleteFileIds = files.map(e => e.id);

    await Promise.all([
      ...deleteFileIds.map(async fileId => {
        return await rowQueryFileIDBStore.removeItem(fileId);
      }),
      ...deleteFileIds.map(async fileId => {
        return await rowQueryFileContentIDBStore.removeItem(fileId);
      }),
    ]);
  },
};
