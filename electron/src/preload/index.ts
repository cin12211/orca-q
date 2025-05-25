import { electronAPI } from '@electron-toolkit/preload'

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  connectDB: (config: { dbConnectionString: string }) => ipcRenderer.invoke('db:connect', config),

  bulkDelete: (payload: { dbConnectionString: string; sql: string }) =>
    ipcRenderer.invoke('db:bulk-delete', payload),

  bulkUpdate: (payload: { dbConnectionString: string; sql: string }) =>
    ipcRenderer.invoke('db:bulk-update', payload),

  execute: (payload: { dbConnectionString: string; sql: string }) =>
    ipcRenderer.invoke('db:execute', payload),

  getDatabaseNames: (config: { dbConnectionString: string }) =>
    ipcRenderer.invoke('db:get-names', config),

  getDatabaseSource: (config: { dbConnectionString: string }) =>
    ipcRenderer.invoke('db:get-source', config),

  getFunctions: (config: { dbConnectionString: string }) =>
    ipcRenderer.invoke('db:get-functions', config),

  getOneTable: (config: { dbConnectionString: string; tableName: string }) =>
    ipcRenderer.invoke('db:get-one-table', config),

  getOverviewFunctions: (config: { dbConnectionString: string }) =>
    ipcRenderer.invoke('db:get-overview-functions', config),

  getOverviewTables: (config: { dbConnectionString: string }) =>
    ipcRenderer.invoke('db:get-overview-tables', config),

  getTables: (config: { dbConnectionString: string }) => ipcRenderer.invoke('db:get-tables', config)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
