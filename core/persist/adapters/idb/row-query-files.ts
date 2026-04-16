import dayjs from 'dayjs';
import localforage from 'localforage';
import { toRawJSON } from '~/core/helpers';
import type {
  RowQueryFile,
  RowQueryFileContent,
} from '../../../stores/useExplorerFileStore';
import type { RowQueryFilesPersistApi } from '../../types';

const fileStore = localforage.createInstance({
  name: 'rowQueryFileIDBStore',
  storeName: 'rowQueryFiles',
});

const contentStore = localforage.createInstance({
  name: 'rowQueryFileContentIDBStore',
  storeName: 'rowQueryFileContents',
});

const sanitizeRowQueryFile = <T extends { connectionId?: string }>(file: T) => {
  const { connectionId: _connectionId, ...sanitized } = file;
  return sanitized as Omit<T, 'connectionId'> & { connectionId?: never };
};

export const getAllRowQueryFileContentsFromIDB = async (): Promise<
  RowQueryFileContent[]
> => {
  const keys = await contentStore.keys();
  const all: RowQueryFileContent[] = [];
  for (const key of keys) {
    const item = await contentStore.getItem<RowQueryFileContent>(key);
    if (item) all.push(item);
  }
  return all;
};

export const rowQueryFilesIDBAdapter: RowQueryFilesPersistApi = {
  getAllFiles: async () => {
    const all: RowQueryFile[] = [];
    const keys = await fileStore.keys();
    for (const key of keys) {
      const item = await fileStore.getItem<RowQueryFile>(key);
      if (item) {
        const sanitizedItem = sanitizeRowQueryFile(item) as RowQueryFile;

        if (item.connectionId !== undefined) {
          await fileStore.setItem(sanitizedItem.id, sanitizedItem);
        }

        all.push(sanitizedItem);
      }
    }
    return all.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
    );
  },

  getFilesByContext: async ({ workspaceId }) => {
    const files = await rowQueryFilesIDBAdapter.getAllFiles();
    return files
      .filter(file => file.workspaceId === workspaceId)
      .sort(
        (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
      );
  },

  createFiles: async fileValue => {
    const file: RowQueryFile = toRawJSON({
      ...sanitizeRowQueryFile(fileValue),
      variables:
        fileValue.isFolder || typeof fileValue.variables === 'string'
          ? fileValue.variables
          : '',
      createdAt: fileValue.createdAt || dayjs().toISOString(),
    });

    const existingContent = await contentStore.getItem<RowQueryFileContent>(
      file.id
    );
    await fileStore.setItem(file.id, file);

    if (!existingContent) {
      const fileContent: RowQueryFileContent = {
        id: file.id,
        contents: '',
      };
      await contentStore.setItem(file.id, fileContent);
    }

    return file;
  },

  updateFile: async fileValue => {
    const existing = await fileStore.getItem<RowQueryFile>(fileValue.id);
    if (!existing) return null;

    const updated: RowQueryFile = toRawJSON<RowQueryFile>({
      ...sanitizeRowQueryFile(existing),
      ...sanitizeRowQueryFile(fileValue),
    });
    await fileStore.setItem(fileValue.id, updated);
    return updated;
  },

  updateFileContent: async fileContent => {
    const existing = await contentStore.getItem<RowQueryFileContent>(
      fileContent.id
    );
    if (!existing) return null;

    await contentStore.setItem(fileContent.id, fileContent);
    return fileContent;
  },

  getFileContentById: async id => {
    return contentStore.getItem<RowQueryFileContent>(id);
  },

  deleteFile: async ({ id }) => {
    await fileStore.removeItem(id);
    await contentStore.removeItem(id);
  },

  deleteFileByWorkspaceId: async ({ wsId }) => {
    const files = await rowQueryFilesIDBAdapter.getFilesByContext({
      workspaceId: wsId,
    });

    await Promise.all([
      ...files.map(file => fileStore.removeItem(file.id)),
      ...files.map(file => contentStore.removeItem(file.id)),
    ]);
  },
};
