import { isElectron, isTauri } from '~/core/helpers/environment';
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
  agentElectronAdapter,
  appConfigElectronAdapter,
  connectionElectronAdapter,
  quickQueryLogsElectronAdapter,
  rowQueryFilesElectronAdapter,
  tabViewsElectronAdapter,
  workspaceElectronAdapter,
  workspaceStateElectronAdapter,
} from './adapters/electron';
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

function createElectronApis(): PersistApis {
  return {
    appConfigApi: appConfigElectronAdapter,
    agentApi: agentElectronAdapter,
    workspaceApi: workspaceElectronAdapter,
    workspaceStateApi: workspaceStateElectronAdapter,
    connectionApi: connectionElectronAdapter,
    tabViewsApi: tabViewsElectronAdapter,
    quickQueryLogsApi: quickQueryLogsElectronAdapter,
    rowQueryFilesApi: rowQueryFilesElectronAdapter,
  };
}

/**
 * Factory that returns the correct persist implementation
 * based on the current runtime environment.
 *
 * Priority: Tauri > Electron > IDB (web)
 */
export function createPersistApis(): PersistApis {
  if (isTauri()) {
    return createTauriApis();
  }

  if (isElectron()) {
    return createElectronApis();
  }

  return createIDBApis();
}

