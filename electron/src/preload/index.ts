import { electronAPI } from '@electron-toolkit/preload'

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron'
import type {
  DBBulkDeleteRequest,
  DBBulkDeleteResponse,
  DBBulkUpdateRequest,
  DBBulkUpdateResponse,
  DBExecuteRequest,
  DBExecuteResponse,
  DBGetFunctions,
  DBGetOneTableResponse,
  DbGetOverviewFunctionsResponse,
  DBGetOverviewTablesResponse,
  DbGetSourceResponse,
  DBGetTablesRequest,
  GetOneTableRequest
} from '../main/ipc'
import type { IpcBaseRequest, IpcBaseResponse } from '../main/ipc/interface'

export const electronBridgeApi = {
  connectDB: (config: IpcBaseRequest): Promise<IpcBaseResponse> =>
    ipcRenderer.invoke('db:connect', config),

  bulkDelete: (payload: DBBulkDeleteRequest): Promise<DBBulkDeleteResponse> =>
    ipcRenderer.invoke('db:bulk-delete', payload),

  bulkUpdate: (payload: DBBulkUpdateRequest): Promise<DBBulkUpdateResponse> =>
    ipcRenderer.invoke('db:bulk-update', payload),

  execute: (payload: DBExecuteRequest): Promise<DBExecuteResponse> =>
    ipcRenderer.invoke('db:execute', payload),

  getDatabaseSource: (config: IpcBaseRequest): Promise<DbGetSourceResponse> =>
    ipcRenderer.invoke('db:get-source', config),

  getFunctions: (config: IpcBaseRequest): Promise<DBGetFunctions> =>
    ipcRenderer.invoke('db:get-functions', config),

  getOneTable: (config: GetOneTableRequest): Promise<DBGetOneTableResponse> =>
    ipcRenderer.invoke('db:get-one-table', config),

  getOverviewFunctions: (config: IpcBaseRequest): Promise<DbGetOverviewFunctionsResponse> =>
    ipcRenderer.invoke('db:get-overview-functions', config),

  getOverviewTables: (config: IpcBaseRequest): Promise<DBGetOverviewTablesResponse> =>
    ipcRenderer.invoke('db:get-overview-tables', config),

  getTables: (config: IpcBaseRequest): Promise<DBGetTablesRequest> =>
    ipcRenderer.invoke('db:get-tables', config)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', electronBridgeApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = electronBridgeApi
}
