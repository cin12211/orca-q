import { isTauri } from '../helpers/environment';
import { connectionIDBApi } from './connectionIDBApi';
import { quickQueryLogsIDBApi } from './quickQueryLogsIDBApi';
import { rowQueryFileIDBApi } from './rowQueryFile';
import { tabViewsIDBApi } from './tabViewsIDBApi';
import {
  connectionTauriApi,
  migrateIndexedDbPersistToTauriNativeStore,
  quickQueryLogsTauriApi,
  rowQueryFilesTauriApi,
  tabViewsTauriApi,
  workspaceStateTauriApi,
  workspaceTauriApi,
} from './tauriPersistApi';
import { workspaceIDBApi } from './workspaceIDBApi';
import { workspaceStateIDBApi } from './workspaceStateIDBApi';

export const initIDB = async () => {
  if (window.electron) {
    return;
  }

  if (isTauri()) {
    // @ts-ignore (define in dts)
    window.workspaceApi = workspaceTauriApi;
    // @ts-ignore (define in dts)
    window.workspaceStateApi = workspaceStateTauriApi;
    // @ts-ignore (define in dts)
    window.quickQueryLogsApi = quickQueryLogsTauriApi;
    // @ts-ignore (define in dts)
    window.connectionApi = connectionTauriApi;
    // @ts-ignore (define in dts)
    window.tabViewsApi = tabViewsTauriApi;
    // @ts-ignore (define in dts)
    window.rowQueryFilesApi = rowQueryFilesTauriApi;

    await migrateIndexedDbPersistToTauriNativeStore();
    return;
  }

  // @ts-ignore (define in dts)
  window.workspaceApi = workspaceIDBApi;
  // @ts-ignore (define in dts)
  window.workspaceStateApi = workspaceStateIDBApi;
  // @ts-ignore (define in dts)
  window.quickQueryLogsApi = quickQueryLogsIDBApi;
  // @ts-ignore (define in dts)
  window.connectionApi = connectionIDBApi;
  // @ts-ignore (define in dts)
  window.tabViewsApi = tabViewsIDBApi;
  // @ts-ignore (define in dts)
  window.rowQueryFilesApi = rowQueryFileIDBApi;
};
