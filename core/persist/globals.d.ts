import type {
  AppConfigPersistApi,
  AgentPersistApi,
  WorkspacePersistApi,
  WorkspaceStatePersistApi,
  ConnectionPersistApi,
  TabViewsPersistApi,
  QuickQueryLogsPersistApi,
  RowQueryFilesPersistApi,
} from './types';

declare global {
  interface Window {
    appConfigApi: AppConfigPersistApi;
    agentApi: AgentPersistApi;
    workspaceApi: WorkspacePersistApi;
    workspaceStateApi: WorkspaceStatePersistApi;
    connectionApi: ConnectionPersistApi;
    tabViewsApi: TabViewsPersistApi;
    quickQueryLogsApi: QuickQueryLogsPersistApi;
    rowQueryFilesApi: RowQueryFilesPersistApi;
  }
}
