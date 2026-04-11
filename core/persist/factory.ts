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
} from './adapters/electron';
import {
  agentIDBAdapter,
  appConfigIDBAdapter,
  connectionIDBAdapter,
  environmentTagIDBAdapter,
  quickQueryLogsIDBAdapter,
  rowQueryFilesIDBAdapter,
  tabViewsIDBAdapter,
  workspaceIDBAdapter,
  workspaceStateIDBAdapter,
} from './adapters/idb';
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
    environmentTagApi: environmentTagIDBAdapter,
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
    environmentTagApi: environmentTagElectronAdapter,
  };
}

/**
 * Factory that returns the correct persist implementation
 * based on the current runtime environment.
 *
 * Priority: Electron > IDB (web)
 */
export function createPersistApis(): PersistApis {
  if (isElectron()) {
    return createElectronApis();
  }

  return createIDBApis();
}
