// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import { type Workspace } from '../../../shared/stores'
import { WindowIpcChannels, WorkspaceIpcChannels } from '../constants'
import { type UpdateWindowTitleProps } from '../main/ipc/updateWindowTitle'

export const electronBridgeApi = {
  updateWindowTitle: (props: UpdateWindowTitleProps) =>
    ipcRenderer.invoke(WindowIpcChannels.UpdateTitle, props)
}

export const workspaceApi = {
  getAll: (): Promise<Workspace[]> => ipcRenderer.invoke(WorkspaceIpcChannels.Gets),
  getOne: (id: string): Promise<Workspace> => ipcRenderer.invoke(WorkspaceIpcChannels.GetOne, id),
  create: (workspace: Workspace): Promise<Workspace> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.Create, workspace),
  update: (id: string, workspace: Workspace): Promise<Workspace> =>
    ipcRenderer.invoke(WorkspaceIpcChannels.Update, id, workspace),
  delete: (id: string): Promise<Workspace> => ipcRenderer.invoke(WorkspaceIpcChannels.Delete, id)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', electronBridgeApi)
    contextBridge.exposeInMainWorld('workspaceApi', workspaceApi)
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
}
