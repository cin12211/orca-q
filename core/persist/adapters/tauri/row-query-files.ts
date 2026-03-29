import dayjs from 'dayjs';
import { toRawJSON } from '~/core/helpers';
import type {
  RowQueryFile,
  RowQueryFileContent,
} from '../../../stores/useExplorerFileStore';
import type { RowQueryFilesPersistApi } from '../../types';
import {
  persistDelete,
  persistFind,
  persistGetAll,
  persistGetOne,
  persistUpsert,
  sortByCreatedAt,
} from './primitives';

export const rowQueryFilesTauriAdapter: RowQueryFilesPersistApi = {
  getAllFiles: async () => {
    return sortByCreatedAt(await persistGetAll<RowQueryFile>('rowQueryFiles'));
  },

  getFilesByContext: async ({ workspaceId }) => {
    return sortByCreatedAt(
      await persistFind<RowQueryFile>(
        'rowQueryFiles',
        [{ field: 'workspaceId', value: workspaceId }],
        'all'
      )
    );
  },

  createFiles: async fileValue => {
    const file: RowQueryFile = toRawJSON({
      ...fileValue,
      createdAt: fileValue.createdAt || dayjs().toISOString(),
    });

    const existingContent = await persistGetOne<RowQueryFileContent>(
      'rowQueryFileContents',
      file.id
    );

    await persistUpsert<RowQueryFile>('rowQueryFiles', file.id, file);

    if (!existingContent) {
      await persistUpsert<RowQueryFileContent>(
        'rowQueryFileContents',
        file.id,
        { id: file.id, contents: '', variables: '' }
      );
    }

    return file;
  },

  updateFile: async fileValue => {
    const existing = await persistGetOne<RowQueryFile>(
      'rowQueryFiles',
      fileValue.id
    );
    if (!existing) return null;

    const updated = toRawJSON<RowQueryFile>({ ...existing, ...fileValue });
    return persistUpsert<RowQueryFile>('rowQueryFiles', fileValue.id, updated);
  },

  updateFileContent: async fileContent => {
    const existing = await persistGetOne<RowQueryFileContent>(
      'rowQueryFileContents',
      fileContent.id
    );
    if (!existing) return null;

    return persistUpsert<RowQueryFileContent>(
      'rowQueryFileContents',
      fileContent.id,
      fileContent
    );
  },

  getFileContentById: async id => {
    return persistGetOne<RowQueryFileContent>('rowQueryFileContents', id);
  },

  deleteFile: async ({ id }) => {
    await Promise.all([
      persistDelete<RowQueryFile>(
        'rowQueryFiles',
        [{ field: 'id', value: id }],
        'all'
      ),
      persistDelete<RowQueryFileContent>(
        'rowQueryFileContents',
        [{ field: 'id', value: id }],
        'all'
      ),
    ]);
  },

  deleteFileByWorkspaceId: async ({ wsId }) => {
    const files = await rowQueryFilesTauriAdapter.getFilesByContext({
      workspaceId: wsId,
    });
    await Promise.all(
      files.map(file => rowQueryFilesTauriAdapter.deleteFile({ id: file.id }))
    );
  },
};
