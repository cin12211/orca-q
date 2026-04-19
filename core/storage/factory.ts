/**
 * Factory that returns the correct storage implementation based on runtime platform.
 *
 * Platform resolution:
 *   isElectron() == true  → IPC-proxy wrappers around existing electron adapters (renderer → main via IPC; main uses SQLite)
 *   isElectron() == false → IDB entity storage singletons (localforage / IndexedDB)
 */
import { isElectron } from '~/core/helpers/environment';
import {
  agentElectronAdapter,
  appConfigElectronAdapter,
  connectionElectronAdapter,
  environmentTagElectronAdapter,
  quickQueryLogsElectronAdapter,
  rowQueryFilesElectronAdapter,
  tabViewsElectronAdapter,
  workspaceElectronAdapter,
  workspaceStateElectronAdapter,
} from '~/core/persist/adapters/electron';
import {
  persistDelete,
  persistFind,
  persistGetAll as electronPersistGetAll,
  persistReplaceAll,
  type PersistFilter,
} from '~/core/persist/adapters/electron/primitives';
import {
  normalizeAppConfigState,
  normalizeAgentState,
} from '~/core/persist/store-state';
import type { MigrationState } from '~/core/types/entities/migration-state.entity';
import {
  workspaceStorage,
  connectionStorage,
  workspaceStateStorage,
  tabViewStorage,
  quickQueryLogStorage,
  rowQueryFileStorage,
  environmentTagStorage,
  appConfigStorage,
  agentStateStorage,
  migrationStateStorage,
} from './entities';
import type { StorageApis } from './types';

// ── Browser (IDB) path ────────────────────────────────────────────────────────

function createIDBStorageApis(): StorageApis {
  return {
    workspaceStorage: {
      getAll: () => workspaceStorage.getAll(),
      getOne: id => workspaceStorage.getOne(id),
      create: ws => workspaceStorage.create(ws),
      update: ws => workspaceStorage.update(ws),
      /** Cascade: deletes connections, states, logs, files */
      delete: async id => {
        const deleted = await workspaceStorage.delete(id);
        if (!deleted) return null;
        const conns = await connectionStorage.getMany({
          workspaceId: id,
        } as never);
        await Promise.all(conns.map(c => connectionStorage.delete(c.id)));
        await Promise.all(
          (await tabViewStorage.getAll())
            .filter(tv => tv.workspaceId === id)
            .map(tv => tabViewStorage.delete(tv.id))
        );
        await rowQueryFileStorage.deleteFileByWorkspaceId({ wsId: id });
        await workspaceStateStorage.delete(id);
        await quickQueryLogStorage.deleteByConnectionProps({ workspaceId: id });
        return deleted;
      },
    },
    connectionStorage:
      connectionStorage as unknown as StorageApis['connectionStorage'],
    workspaceStateStorage:
      workspaceStateStorage as unknown as StorageApis['workspaceStateStorage'],
    tabViewStorage: tabViewStorage as unknown as StorageApis['tabViewStorage'],
    quickQueryLogStorage: {
      getAll: () => quickQueryLogStorage.getAll(),
      getByContext: ctx => quickQueryLogStorage.getByContext(ctx),
      create: log => quickQueryLogStorage.create(log),
      delete: props => quickQueryLogStorage.deleteByConnectionProps(props),
    },
    rowQueryFileStorage:
      rowQueryFileStorage as unknown as StorageApis['rowQueryFileStorage'],
    environmentTagStorage:
      environmentTagStorage as unknown as StorageApis['environmentTagStorage'],
    appConfigStorage: {
      get: () => appConfigStorage.get(),
      save: state => appConfigStorage.save(state),
      delete: () => appConfigStorage.deleteConfig(),
    },
    agentStorage: {
      get: () => agentStateStorage.get(),
      save: state => agentStateStorage.save(state),
      delete: () => agentStateStorage.deleteState(),
    },
    migrationStateStorage: {
      get: () => migrationStateStorage.get(),
      save: names => migrationStateStorage.save(names),
      clear: () => migrationStateStorage.clear(),
    },
  };
}

// ── Electron renderer (IPC proxy) path ───────────────────────────────────────

function createElectronStorageApis(): StorageApis {
  return {
    workspaceStorage:
      workspaceElectronAdapter as unknown as StorageApis['workspaceStorage'],
    connectionStorage:
      connectionElectronAdapter as unknown as StorageApis['connectionStorage'],
    workspaceStateStorage:
      workspaceStateElectronAdapter as unknown as StorageApis['workspaceStateStorage'],

    tabViewStorage: {
      getAll: () => tabViewsElectronAdapter.getAll(),
      getByContext: ctx => tabViewsElectronAdapter.getByContext(ctx),
      create: tab => tabViewsElectronAdapter.create(tab as never),
      delete: id => tabViewsElectronAdapter.delete({ id }) as Promise<never>,
      deleteByProps: props =>
        tabViewsElectronAdapter.delete(props) as Promise<void>,
      bulkDeleteByProps: async propsArray => {
        await Promise.all(
          propsArray.map(p => tabViewsElectronAdapter.delete(p))
        );
      },
      replaceAll: async tabs => {
        await persistReplaceAll(
          'tabViews',
          tabs as unknown as Record<string, unknown>[]
        );
      },
    },

    quickQueryLogStorage: {
      getAll: () => quickQueryLogsElectronAdapter.getAll(),
      getByContext: ctx => quickQueryLogsElectronAdapter.getByContext(ctx),
      create: log => quickQueryLogsElectronAdapter.create(log),
      delete: props => quickQueryLogsElectronAdapter.delete(props),
    },

    rowQueryFileStorage:
      rowQueryFilesElectronAdapter as unknown as StorageApis['rowQueryFileStorage'],
    environmentTagStorage:
      environmentTagElectronAdapter as unknown as StorageApis['environmentTagStorage'],

    appConfigStorage: {
      get: async () => {
        const data = await appConfigElectronAdapter.get();
        return data
          ? normalizeAppConfigState(data)
          : normalizeAppConfigState({});
      },
      save: async state => {
        await appConfigElectronAdapter.save(state);
      },
      delete: () => appConfigElectronAdapter.delete(),
    },

    agentStorage: {
      get: async () => {
        const data = await agentElectronAdapter.get();
        return data ? normalizeAgentState(data) : normalizeAgentState({});
      },
      save: async state => {
        await agentElectronAdapter.save(state);
      },
      delete: () => agentElectronAdapter.delete(),
    },

    migrationStateStorage: {
      get: () =>
        electronPersistGetAll<{ id: string; names: string[] }>(
          'migrationState'
        ).then(records => (records[0] ?? null) as MigrationState | null),
      save: async names => {
        await persistReplaceAll('migrationState', [
          { id: 'applied-migrations', names },
        ]);
      },
      clear: async () => {
        await persistReplaceAll('migrationState', []);
      },
    },
  };
}

// ── Public factory ─────────────────────────────────────────────────────────────

/**
 * Returns the correct storage implementation based on runtime platform.
 * Call this once at store initialization — do NOT call on every operation.
 */
export function createStorageApis(): StorageApis {
  if (isElectron()) {
    return createElectronStorageApis();
  }
  return createIDBStorageApis();
}
