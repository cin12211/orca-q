// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type { Connection, Workspace } from '../../../shared/stores'
import {
  ConnectionIpcChannels,
  WindowIpcChannels,
  WorkspaceIpcChannels,
  WorkspaceStateIpcChannels
} from '../constants'
import { type UpdateWindowTitleProps } from '../main/ipc/updateWindowTitle'
import { type WorkspaceState } from '../../../shared/stores/useWSStateStore'

export const electronBridgeApi = {
  updateWindowTitle: (props: UpdateWindowTitleProps) =>
    ipcRenderer.invoke(WindowIpcChannels.UpdateTitle, props)
}

export const workspaceStateApi = {
  getAll: (): Promise<WorkspaceState[]> => ipcRenderer.invoke(WorkspaceStateIpcChannels.Gets),
  create: (wsState: WorkspaceState): Promise<WorkspaceState> =>
    ipcRenderer.invoke(WorkspaceStateIpcChannels.Create, wsState),
  update: (wsState: WorkspaceState): Promise<WorkspaceState> =>
    ipcRenderer.invoke(WorkspaceStateIpcChannels.Update, wsState),
  delete: (id: string): Promise<WorkspaceState> =>
    ipcRenderer.invoke(WorkspaceStateIpcChannels.Delete, id)
}

export const workspaceApi = {
  getAll: (): Promise<Workspace[]> => ipcRenderer.invoke(WorkspaceIpcChannels.Gets),
  getOne: (id: string): Promise<Workspace> => ipcRenderer.invoke(WorkspaceIpcChannels.GetOne, id),
  create: (workspace: Workspace): Promise<Workspace> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.Create, workspace),
  update: (workspace: Workspace): Promise<Workspace> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.Update, workspace),
  delete: (id: string): Promise<Workspace> => ipcRenderer.invoke(WorkspaceIpcChannels.Delete, id)
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
}
