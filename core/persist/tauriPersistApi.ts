import dayjs from 'dayjs';
import { toRawJSON } from '~/core/helpers';
import { invokeTauri } from '~/core/platform/tauri';
import type {
  DeleteQQueryLogsProps,
  GetQQueryLogsProps,
} from '~/electron/src/main/ipc/quickQueryLogs';
import type {
  DeleteTabViewProps,
  GetTabViewsByContextProps,
} from '~/electron/src/main/ipc/tabViews';
import type { Connection, TabView, Workspace } from '../stores';
import type {
  RowQueryFile,
  RowQueryFileContent,
} from '../stores/useExplorerFileStore';
import type { QuickQueryLog } from '../stores/useQuickQueryLogs';
import type { WorkspaceState } from '../stores/useWSStateStore';
import { connectionIDBApi } from './connectionIDBApi';
import { quickQueryLogsIDBApi } from './quickQueryLogsIDBApi';
import {
  getAllRowQueryFileContentsFromIDB,
  rowQueryFileIDBApi,
} from './rowQueryFile';
import { tabViewsIDBApi } from './tabViewsIDBApi';
import { workspaceIDBApi } from './workspaceIDBApi';
import { workspaceStateIDBApi } from './workspaceStateIDBApi';

type PersistCollection =
  | 'workspaces'
  | 'workspaceState'
  | 'connections'
  | 'tabViews'
  | 'quickQueryLogs'
  | 'rowQueryFiles'
  | 'rowQueryFileContents';

type PersistFilter = {
  field: string;
  value: unknown;
};

type PersistMatchMode = 'all' | 'any';

const persistCollections: PersistCollection[] = [
  'workspaces',
  'workspaceState',
  'connections',
  'tabViews',
  'quickQueryLogs',
  'rowQueryFiles',
  'rowQueryFileContents',
];

const sortByCreatedAt = <T extends { createdAt?: string }>(
  values: T[]
): T[] => {
  return [...values].sort(
    (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
  );
};

const persistGetAll = async <T>(
  collection: PersistCollection
): Promise<T[]> => {
  return await invokeTauri<T[]>('persist_get_all', { collection });
};

const persistGetOne = async <T>(
  collection: PersistCollection,
  id: string
): Promise<T | null> => {
  return await invokeTauri<T | null>('persist_get_one', { collection, id });
};

const persistFind = async <T>(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode = 'all'
): Promise<T[]> => {
  return await invokeTauri<T[]>('persist_find', {
    collection,
    filters,
    matchMode,
  });
};

const persistUpsert = async <T>(
  collection: PersistCollection,
  id: string,
  value: T
): Promise<T> => {
  return await invokeTauri<T>('persist_upsert', {
    collection,
    id,
    value: toRawJSON(value),
  });
};

const persistDelete = async <T>(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode = 'all'
): Promise<T[]> => {
  return await invokeTauri<T[]>('persist_delete', {
    collection,
    filters,
    matchMode,
  });
};

const persistReplaceAll = async <T>(
  collection: PersistCollection,
  values: T[]
): Promise<void> => {
  await invokeTauri('persist_replace_all', {
    collection,
    values: values.map(value => toRawJSON(value)),
  });
};

const deleteConnectionsByWorkspaceId = async (
  workspaceId: string
): Promise<void> => {
  await persistDelete<Connection>(
    'connections',
    [{ field: 'workspaceId', value: workspaceId }],
    'all'
  );
};

const deleteTabViewsByWorkspaceId = async (
  workspaceId: string
): Promise<void> => {
  await persistDelete<TabView>(
    'tabViews',
    [{ field: 'workspaceId', value: workspaceId }],
    'all'
  );
};

const deleteTabViewsByConnectionId = async (
  connectionId: string
): Promise<void> => {
  await persistDelete<TabView>(
    'tabViews',
    [{ field: 'connectionId', value: connectionId }],
    'all'
  );
};

export const workspaceStateTauriApi = {
  getAll: async (): Promise<WorkspaceState[]> => {
    return await persistGetAll<WorkspaceState>('workspaceState');
  },

  create: async (wsState: WorkspaceState): Promise<WorkspaceState> => {
    const wsStateTmp: WorkspaceState = {
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };

    return await persistUpsert<WorkspaceState>(
      'workspaceState',
      wsStateTmp.id,
      wsStateTmp
    );
  },

  update: async (wsState: WorkspaceState): Promise<WorkspaceState | null> => {
    const current = await persistGetOne<WorkspaceState>(
      'workspaceState',
      wsState.id
    );
    if (!current) return null;

    const wsStateTmp: WorkspaceState = {
      ...current,
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };

    return await persistUpsert<WorkspaceState>(
      'workspaceState',
      wsState.id,
      wsStateTmp
    );
  },

  delete: async (id: string): Promise<WorkspaceState | null> => {
    const deleted = await persistDelete<WorkspaceState>(
      'workspaceState',
      [{ field: 'id', value: id }],
      'all'
    );

    return deleted[0] || null;
  },
};

export const connectionTauriApi = {
  getAll: async (): Promise<Connection[]> => {
    return sortByCreatedAt(await persistGetAll<Connection>('connections'));
  },

  getByWorkspaceId: async (workspaceId: string): Promise<Connection[]> => {
    return sortByCreatedAt(
      await persistFind<Connection>(
        'connections',
        [{ field: 'workspaceId', value: workspaceId }],
        'all'
      )
    );
  },

  getOne: async (id: string): Promise<Connection | null> => {
    return await persistGetOne<Connection>('connections', id);
  },

  create: async (connection: Connection): Promise<Connection> => {
    const connectionTmp: Connection = {
      ...connection,
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };

    return await persistUpsert<Connection>(
      'connections',
      connectionTmp.id,
      connectionTmp
    );
  },

  update: async (connection: Connection): Promise<Connection | null> => {
    const existing = await persistGetOne<Connection>(
      'connections',
      connection.id
    );
    if (!existing) return null;

    const updated: Connection = {
      ...existing,
      ...connection,
      updatedAt: dayjs().toISOString(),
    };

    return await persistUpsert<Connection>('connections', updated.id, updated);
  },

  delete: async (id: string): Promise<Connection | null> => {
    const deleted = await persistDelete<Connection>(
      'connections',
      [{ field: 'id', value: id }],
      'all'
    );

    if (deleted.length) {
      await deleteTabViewsByConnectionId(id);
      await quickQueryLogsTauriApi.delete({ connectionId: id });
      return deleted[0] || null;
    }

    return null;
  },
};

export const workspaceTauriApi = {
  getAll: async (): Promise<Workspace[]> => {
    return sortByCreatedAt(await persistGetAll<Workspace>('workspaces'));
  },

  getOne: async (id: string): Promise<Workspace | null> => {
    return await persistGetOne<Workspace>('workspaces', id);
  },

  create: async (workspace: Workspace): Promise<Workspace> => {
    const workspaceTmp: Workspace = {
      ...workspace,
      id: workspace.id || crypto.randomUUID(),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };

    return await persistUpsert<Workspace>(
      'workspaces',
      workspaceTmp.id,
      workspaceTmp
    );
  },

  update: async (workspace: Workspace): Promise<Workspace | null> => {
    const current = await persistGetOne<Workspace>('workspaces', workspace.id);
    if (!current) return null;

    const workspaceTmp: Workspace = {
      ...workspace,
      updatedAt: dayjs().toISOString(),
    };

    return await persistUpsert<Workspace>(
      'workspaces',
      workspaceTmp.id,
      workspaceTmp
    );
  },

  delete: async (id: string): Promise<Workspace | null> => {
    const deleted = await persistDelete<Workspace>(
      'workspaces',
      [{ field: 'id', value: id }],
      'all'
    );

    const workspace = deleted[0] || null;
    if (!workspace) {
      return null;
    }

    await deleteConnectionsByWorkspaceId(id);
    await deleteTabViewsByWorkspaceId(id);
    await rowQueryFilesTauriApi.deleteFileByWorkspaceId({ wsId: id });
    await workspaceStateTauriApi.delete(id);
    await quickQueryLogsTauriApi.delete({ workspaceId: id });

    return workspace;
  },
};

export const tabViewsTauriApi = {
  getAll: async (): Promise<TabView[]> => {
    return await persistGetAll<TabView>('tabViews');
  },

  getByContext: async ({
    workspaceId,
    connectionId,
  }: GetTabViewsByContextProps): Promise<TabView[]> => {
    return await persistFind<TabView>(
      'tabViews',
      [
        { field: 'workspaceId', value: workspaceId },
        { field: 'connectionId', value: connectionId },
      ],
      'all'
    );
  },

  create: async (tabView: TabView): Promise<TabView> => {
    return await persistUpsert<TabView>('tabViews', tabView.id, tabView);
  },

  update: async (tabView: TabView): Promise<TabView | null> => {
    const existing = await persistGetOne<TabView>('tabViews', tabView.id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...tabView,
    };

    return await persistUpsert<TabView>('tabViews', tabView.id, updated);
  },

  delete: async (props: DeleteTabViewProps): Promise<TabView | null> => {
    const filters: PersistFilter[] = [];

    if (props.id) {
      filters.push({ field: 'id', value: props.id });
    }

    if (props.connectionId) {
      filters.push({ field: 'connectionId', value: props.connectionId });
    }

    if (props.schemaId) {
      filters.push({ field: 'schemaId', value: props.schemaId });
    }

    const deleted = await persistDelete<TabView>('tabViews', filters, 'all');
    return deleted[0] || null;
  },

  bulkDelete: async (propsArray: DeleteTabViewProps[]): Promise<TabView[]> => {
    const deletedGroups = await Promise.all(
      propsArray.map(props => tabViewsTauriApi.delete(props))
    );

    return deletedGroups.filter(Boolean) as TabView[];
  },
};

export const quickQueryLogsTauriApi = {
  getAll: async (): Promise<QuickQueryLog[]> => {
    return sortByCreatedAt(
      await persistGetAll<QuickQueryLog>('quickQueryLogs')
    );
  },

  getByContext: async ({
    connectionId,
  }: GetQQueryLogsProps): Promise<QuickQueryLog[]> => {
    return sortByCreatedAt(
      await persistFind<QuickQueryLog>(
        'quickQueryLogs',
        [{ field: 'connectionId', value: connectionId }],
        'all'
      )
    );
  },

  create: async (qqLog: QuickQueryLog): Promise<QuickQueryLog> => {
    return await persistUpsert<QuickQueryLog>(
      'quickQueryLogs',
      qqLog.id,
      qqLog
    );
  },

  update: async (qqLog: QuickQueryLog): Promise<QuickQueryLog | null> => {
    const existing = await persistGetOne<QuickQueryLog>(
      'quickQueryLogs',
      qqLog.id
    );
    if (!existing) return null;

    const updated: QuickQueryLog = {
      ...existing,
      ...qqLog,
    };

    return await persistUpsert<QuickQueryLog>(
      'quickQueryLogs',
      qqLog.id,
      updated
    );
  },

  delete: async (props: DeleteQQueryLogsProps): Promise<void> => {
    const filters: PersistFilter[] = [];

    if ('workspaceId' in props) {
      filters.push({ field: 'workspaceId', value: props.workspaceId });
    }

    if ('connectionId' in props) {
      filters.push({ field: 'connectionId', value: props.connectionId });
    }

    if ('schemaName' in props) {
      filters.push({ field: 'schemaName', value: props.schemaName });
    }

    if ('tableName' in props) {
      filters.push({ field: 'tableName', value: props.tableName });
    }

    await persistDelete<QuickQueryLog>('quickQueryLogs', filters, 'all');
  },
};

export const rowQueryFilesTauriApi = {
  getAllFiles: async (): Promise<RowQueryFile[]> => {
    return sortByCreatedAt(await persistGetAll<RowQueryFile>('rowQueryFiles'));
  },

  getFilesByContext: async ({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<RowQueryFile[]> => {
    return sortByCreatedAt(
      await persistFind<RowQueryFile>(
        'rowQueryFiles',
        [{ field: 'workspaceId', value: workspaceId }],
        'all'
      )
    );
  },

  createFiles: async (fileValue: RowQueryFile): Promise<RowQueryFile> => {
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
        {
          id: file.id,
          contents: '',
          variables: '',
        }
      );
    }

    return file;
  },

  updateFile: async (
    fileValue: Partial<RowQueryFile> & { id: string }
  ): Promise<RowQueryFile | null> => {
    const existing = await persistGetOne<RowQueryFile>(
      'rowQueryFiles',
      fileValue.id
    );
    if (!existing) return null;

    const updated = toRawJSON<RowQueryFile>({
      ...existing,
      ...fileValue,
    });

    return await persistUpsert<RowQueryFile>(
      'rowQueryFiles',
      fileValue.id,
      updated
    );
  },

  updateFileContent: async (
    fileContent: RowQueryFileContent
  ): Promise<RowQueryFileContent | null> => {
    const existing = await persistGetOne<RowQueryFileContent>(
      'rowQueryFileContents',
      fileContent.id
    );
    if (!existing) return null;

    return await persistUpsert<RowQueryFileContent>(
      'rowQueryFileContents',
      fileContent.id,
      fileContent
    );
  },

  getFileContentById: async (
    id: string
  ): Promise<RowQueryFileContent | null> => {
    return await persistGetOne<RowQueryFileContent>('rowQueryFileContents', id);
  },

  deleteFile: async ({ id }: { id: string }): Promise<void> => {
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

  deleteFileByWorkspaceId: async ({
    wsId,
  }: {
    wsId: string;
  }): Promise<void> => {
    const files = await rowQueryFilesTauriApi.getFilesByContext({
      workspaceId: wsId,
    });

    await Promise.all(
      files.map(async file => {
        await rowQueryFilesTauriApi.deleteFile({ id: file.id });
      })
    );
  },
};

const getNativeSnapshot = async (): Promise<
  Record<PersistCollection, unknown[]>
> => {
  const entries = await Promise.all(
    persistCollections.map(async collection => {
      const values = await persistGetAll<unknown>(collection);
      return [collection, values] as const;
    })
  );

  return Object.fromEntries(entries) as Record<PersistCollection, unknown[]>;
};

const getIndexedDbSnapshot = async (): Promise<
  Record<PersistCollection, unknown[]>
> => {
  return {
    workspaces: await workspaceIDBApi.getAll(),
    workspaceState: await workspaceStateIDBApi.getAll(),
    connections: await connectionIDBApi.getAll(),
    tabViews: await tabViewsIDBApi.getAll(),
    quickQueryLogs: await quickQueryLogsIDBApi.getAll(),
    rowQueryFiles: await rowQueryFileIDBApi.getAllFiles(),
    rowQueryFileContents: await getAllRowQueryFileContentsFromIDB(),
  };
};

let tauriPersistMigrationPromise: Promise<void> | null = null;

export const migrateIndexedDbPersistToTauriNativeStore = async () => {
  if (!tauriPersistMigrationPromise) {
    tauriPersistMigrationPromise = (async () => {
      const nativeSnapshot = await getNativeSnapshot();
      const hasNativeData = Object.values(nativeSnapshot).some(
        values => values.length > 0
      );

      if (hasNativeData) {
        return;
      }

      const indexedDbSnapshot = await getIndexedDbSnapshot();
      const hasIndexedDbData = Object.values(indexedDbSnapshot).some(
        values => values.length > 0
      );

      if (!hasIndexedDbData) {
        return;
      }

      await Promise.all(
        persistCollections.map(async collection => {
          await persistReplaceAll(collection, indexedDbSnapshot[collection]);
        })
      );

      console.info('[Persist] Migrated Tauri IndexedDB data to native store.');
    })().catch(error => {
      console.error('[Persist] Failed to migrate Tauri IndexedDB data:', error);
      throw error;
    });
  }

  return await tauriPersistMigrationPromise;
};
