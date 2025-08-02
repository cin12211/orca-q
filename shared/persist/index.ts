import { connectionIDBApi } from './connectionIDBApi';
import { quickQueryLogsIDBApi } from './quickQueryLogsIDBApi';
import { rowQueryFileIDBApi } from './rowQueryFile';
import { tabViewsIDBApi } from './tabViewsIDBApi';
import { workspaceIDBApi } from './workspaceIDBApi';
import { workspaceStateIDBApi } from './workspaceStateIDBApi';

export const initIDB = async () => {
  if (window.electron) {
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
