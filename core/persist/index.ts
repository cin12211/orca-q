import { createPersistApis } from './factory';

export type { PersistApis } from './types';
export type {
  AppConfigPersistApi,
  AgentPersistApi,
  WorkspacePersistApi,
  WorkspaceStatePersistApi,
  ConnectionPersistApi,
  TabViewsPersistApi,
  QuickQueryLogsPersistApi,
  RowQueryFilesPersistApi,
  GetTabViewsByContextProps,
  DeleteTabViewProps,
  GetQQueryLogsProps,
  DeleteQQueryLogsProps,
} from './types';

/**
 * Wire up the platform persist APIs on `window`.
 * Schema migrations and platform storage init are handled earlier
 * by `plugins/01.migration.client.ts`.
 */
export const initPersist = async () => {
  const apis = createPersistApis();

  window.appConfigApi = apis.appConfigApi;
  window.agentApi = apis.agentApi;
  window.workspaceApi = apis.workspaceApi;
  window.workspaceStateApi = apis.workspaceStateApi;
  window.connectionApi = apis.connectionApi;
  window.tabViewsApi = apis.tabViewsApi;
  window.quickQueryLogsApi = apis.quickQueryLogsApi;
  window.rowQueryFilesApi = apis.rowQueryFilesApi;
};

/** @deprecated Use `initPersist` instead. Alias kept for backward compatibility. */
export const initIDB = initPersist;
