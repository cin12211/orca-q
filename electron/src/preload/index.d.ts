import { ElectronAPI } from '@electron-toolkit/preload'
import { electronBridgeApi, workspaceApi, connectionApi, workspaceStateApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: typeof electronBridgeApi
    workspaceApi: typeof workspaceApi
    workspaceStateApi: typeof workspaceStateApi
    connectionApi: typeof connectionApi
  }
}
