// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type { Connection, TabView, Workspace } from '../../../shared/stores'
import {
  ConnectionIpcChannels,
  TabViewsIpcChannels,
  WindowIpcChannels,
  WorkspaceIpcChannels,
  WorkspaceStateIpcChannels,
  QQueryLogsIpcChannels,
  RowQueryFilesIpcChannels
} from '../constants'
import { type UpdateWindowTitleProps } from '../main/ipc/updateWindowTitle'
import { type WorkspaceState } from '../../../shared/stores/useWSStateStore'
import { type DeleteTabViewProps, type GetTabViewsByContextProps } from '../main/ipc/tabViews'
import type { QuickQueryLog } from '../../../shared/stores/useQuickQueryLogs'
import type { DeleteQQueryLogsProps, GetQQueryLogsProps } from '../main/ipc/quickQueryLogs'
import type {
  RowQueryFile,
  RowQueryFileContent
} from '../../../shared/stores/useExplorerFileStoreStore'

export const electronBridgeApi = {
  updateWindowTitle: (props: UpdateWindowTitleProps) =>
    ipcRenderer.invoke(WindowIpcChannels.UpdateTitle, props)
}

export const workspaceStateApi = {
  getAll: (): Promise<WorkspaceState[]> => ipcRenderer.invoke(WorkspaceStateIpcChannels.Gets),
  create: (wsState: WorkspaceState): Promise<WorkspaceState> =>
    ipcRenderer.invoke(WorkspaceStateIpcChannels.Create, wsState),
  update: (wsState: WorkspaceState): Promise<WorkspaceState | null> =>
    ipcRenderer.invoke(WorkspaceStateIpcChannels.Update, wsState),
  delete: (id: string): Promise<WorkspaceState | null> =>
    ipcRenderer.invoke(WorkspaceStateIpcChannels.Delete, id)
}

export const workspaceApi = {
  getAll: (): Promise<Workspace[]> => ipcRenderer.invoke(WorkspaceIpcChannels.Gets),
  getOne: (id: string): Promise<Workspace | null> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.GetOne, id),
  create: (workspace: Workspace): Promise<Workspace> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.Create, workspace),
  update: (workspace: Workspace): Promise<Workspace | null> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.Update, workspace),
  delete: (id: string): Promise<Workspace | null> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.Delete, id)
}

export const connectionApi = {
  getAll: (): Promise<Connection[]> => ipcRenderer.invoke(ConnectionIpcChannels.Gets),
  getByWorkspaceId: (workspaceId: string): Promise<Connection[]> =>
    ipcRenderer.invoke(ConnectionIpcChannels.GetByWorkspaceId, workspaceId),
  getOne: (id: string): Promise<Connection> => ipcRenderer.invoke(ConnectionIpcChannels.GetOne, id),
  create: (connection: Connection): Promise<Connection> =>
    ipcRenderer.invoke(ConnectionIpcChannels.Create, connection),
  update: (connection: Connection): Promise<Connection> =>
    ipcRenderer.invoke(ConnectionIpcChannels.Update, connection),
  delete: (id: string): Promise<Connection> => ipcRenderer.invoke(ConnectionIpcChannels.Delete, id)
}

export const tabViewsApi = {
  getAll: (): Promise<TabView[]> => ipcRenderer.invoke(TabViewsIpcChannels.Gets),
  getByContext: (props: GetTabViewsByContextProps): Promise<TabView[]> =>
    ipcRenderer.invoke(TabViewsIpcChannels.GetByContext, props),
  create: (tabView: TabView): Promise<TabView> =>
    ipcRenderer.invoke(TabViewsIpcChannels.Create, tabView),
  update: (tabView: TabView): Promise<TabView> =>
    ipcRenderer.invoke(TabViewsIpcChannels.Update, tabView),
  delete: (props: DeleteTabViewProps): Promise<TabView> =>
    ipcRenderer.invoke(TabViewsIpcChannels.Delete, props),
  bulkDelete: (props: DeleteTabViewProps[]): Promise<TabView[]> =>
    ipcRenderer.invoke(TabViewsIpcChannels.BulkDelete, props)
}

export const quickQueryLogsApi = {
  getAll: (): Promise<QuickQueryLog[]> => ipcRenderer.invoke(QQueryLogsIpcChannels.Gets),
  getByContext: (props: GetQQueryLogsProps): Promise<QuickQueryLog[]> =>
    ipcRenderer.invoke(QQueryLogsIpcChannels.GetByContext, props),
  create: (qqLog: QuickQueryLog): Promise<QuickQueryLog> =>
    ipcRenderer.invoke(QQueryLogsIpcChannels.Create, qqLog),
  update: (qqLog: QuickQueryLog): Promise<QuickQueryLog> =>
    ipcRenderer.invoke(QQueryLogsIpcChannels.Update, qqLog),
  delete: (props: DeleteQQueryLogsProps): Promise<void> =>
    ipcRenderer.invoke(QQueryLogsIpcChannels.Delete, props)
}

export const rowQueryFilesApi = {
  getAllFiles: (): Promise<RowQueryFile[]> => ipcRenderer.invoke(RowQueryFilesIpcChannels.Gets),

  getFilesByContext: (props: { workspaceId: string }): Promise<RowQueryFile[]> =>
    ipcRenderer.invoke(RowQueryFilesIpcChannels.GetByContext, props),

  createFiles: (file: RowQueryFile): Promise<RowQueryFile> =>
    ipcRenderer.invoke(RowQueryFilesIpcChannels.Create, file),

  updateFile: (file: Partial<RowQueryFile> & { id: string }): Promise<RowQueryFile | null> =>
    ipcRenderer.invoke(RowQueryFilesIpcChannels.Update, file),

  updateFileContent: (fileContent: RowQueryFileContent): Promise<RowQueryFileContent | null> =>
    ipcRenderer.invoke(RowQueryFilesIpcChannels.UpdateContent, fileContent),

  deleteFile: (props: { id: string }): Promise<void> =>
    ipcRenderer.invoke(RowQueryFilesIpcChannels.Delete, props),

  deleteFileByWorkspaceId: (props: { wsId: string }): Promise<void> =>
    ipcRenderer.invoke(RowQueryFilesIpcChannels.DeleteByWorkspaceId, props),
  getFileContentById: (id: string): Promise<RowQueryFileContent | null> =>
    ipcRenderer.invoke(RowQueryFilesIpcChannels.GetFileContentById, id)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', electronBridgeApi)
    contextBridge.exposeInMainWorld('workspaceApi', workspaceApi)
    contextBridge.exposeInMainWorld('workspaceStateApi', workspaceStateApi)
    contextBridge.exposeInMainWorld('connectionApi', connectionApi)
    contextBridge.exposeInMainWorld('tabViewsApi', tabViewsApi)
    contextBridge.exposeInMainWorld('quickQueryLogsApi', quickQueryLogsApi)
    contextBridge.exposeInMainWorld('rowQueryFilesApi', rowQueryFilesApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = electronBridgeApi
  // @ts-ignore (define in dts)
  window.workspaceApi = workspaceApi
  // @ts-ignore (define in dts)
  window.connectionApi = connectionApi
  // @ts-ignore (define in dts)
  window.workspaceStateApi = workspaceStateApi
  // @ts-ignore (define in dts)
  window.tabViewsApi = tabViewsApi
  // @ts-ignore (define in dts)
  window.quickQueryLogsApi = quickQueryLogsApi
  // @ts-ignore (define in dts)
  window.rowQueryFilesApi = rowQueryFilesApi
}
