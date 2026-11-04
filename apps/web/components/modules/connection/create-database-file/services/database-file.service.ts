import type { CreateDatabaseFileBody } from '../types';

export const databaseFileService = {
  create: (body: CreateDatabaseFileBody) =>
    $fetch<{ filePath: string }>(
      '/api/managment-connection/create-database-file',
      { method: 'POST', body }
    ),

  pickDirectory: async () =>
    (await window.electronAPI?.window.pickDirectory()) ?? null,
};
