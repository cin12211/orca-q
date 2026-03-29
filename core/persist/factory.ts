import { isTauri } from '~/core/helpers/environment';
import {
  agentIDBAdapter,
  appConfigIDBAdapter,
  connectionIDBAdapter,
  quickQueryLogsIDBAdapter,
  rowQueryFilesIDBAdapter,
  tabViewsIDBAdapter,
  workspaceIDBAdapter,
  workspaceStateIDBAdapter,
} from './adapters/idb';
import {
  agentTauriAdapter,
  appConfigTauriAdapter,
  connectionTauriAdapter,
  quickQueryLogsTauriAdapter,
  rowQueryFilesTauriAdapter,
  tabViewsTauriAdapter,
  workspaceTauriAdapter,
  workspaceStateTauriAdapter,
} from './adapters/tauri';
import type { PersistApis } from './types';

function createIDBApis(): PersistApis {
  return {
    appConfigApi: appConfigIDBAdapter,
    agentApi: agentIDBAdapter,
    workspaceApi: workspaceIDBAdapter,
    workspaceStateApi: workspaceStateIDBAdapter,
    connectionApi: connectionIDBAdapter,
    tabViewsApi: tabViewsIDBAdapter,
    quickQueryLogsApi: quickQueryLogsIDBAdapter,
    rowQueryFilesApi: rowQueryFilesIDBAdapter,
  };
}

function createTauriApis(): PersistApis {
  return {
    appConfigApi: appConfigTauriAdapter,
    agentApi: agentTauriAdapter,
    workspaceApi: workspaceTauriAdapter,
    workspaceStateApi: workspaceStateTauriAdapter,
    connectionApi: connectionTauriAdapter,
    tabViewsApi: tabViewsTauriAdapter,
    quickQueryLogsApi: quickQueryLogsTauriAdapter,
    rowQueryFilesApi: rowQueryFilesTauriAdapter,
  };
}

/**
 * Factory that returns the correct persist implementation
 * based on the current runtime environment.
 */
export function createPersistApis(): PersistApis {
  if (isTauri()) {
    return createTauriApis();
  }

  return createIDBApis();
}
