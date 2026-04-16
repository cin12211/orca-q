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

const sanitizeRowQueryFile = <T extends { connectionId?: string }>(file: T) => {
  const { connectionId: _connectionId, ...sanitized } = file;
  return sanitized as Omit<T, 'connectionId'> & { connectionId?: never };
};

export const rowQueryFilesElectronAdapter: RowQueryFilesPersistApi = {
  getAllFiles: async () => {
    const files = await persistGetAll<RowQueryFile>('rowQueryFiles');

    await Promise.all(
      files
        .filter(file => file.connectionId !== undefined)
        .map(file => {
          const sanitizedFile = sanitizeRowQueryFile(file) as RowQueryFile;

          return persistUpsert<RowQueryFile>(
            'rowQueryFiles',
            sanitizedFile.id,
            sanitizedFile
          );
        })
    );

    return sortByCreatedAt(
      files.map(file => sanitizeRowQueryFile(file) as RowQueryFile)
    );
  },

  getFilesByContext: async ({ workspaceId }) => {
    const files = await persistFind<RowQueryFile>(
      'rowQueryFiles',
      [{ field: 'workspaceId', value: workspaceId }],
      'all'
    );

    await Promise.all(
      files
        .filter(file => file.connectionId !== undefined)
        .map(file => {
          const sanitizedFile = sanitizeRowQueryFile(file) as RowQueryFile;

          return persistUpsert<RowQueryFile>(
            'rowQueryFiles',
            sanitizedFile.id,
            sanitizedFile
          );
        })
    );

    return sortByCreatedAt(
      files.map(file => sanitizeRowQueryFile(file) as RowQueryFile)
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

    const existingContent = await persistGetOne<RowQueryFileContent>(
      'rowQueryFileContents',
      file.id
    );

    await persistUpsert<RowQueryFile>('rowQueryFiles', file.id, file);

    if (!existingContent) {
      await persistUpsert<RowQueryFileContent>(
        'rowQueryFileContents',
        file.id,
        {
          id: file.id,
          contents: '',
        }
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

    const updated = toRawJSON<RowQueryFile>({
      ...sanitizeRowQueryFile(existing),
      ...sanitizeRowQueryFile(fileValue),
    });
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
    const files = await rowQueryFilesElectronAdapter.getFilesByContext({
      workspaceId: wsId,
    });
    await Promise.all(
      files.map(file =>
        rowQueryFilesElectronAdapter.deleteFile({ id: file.id })
      )
    );
  },
};
