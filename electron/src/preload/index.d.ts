import { ElectronAPI } from '@electron-toolkit/preload'
import { electronBridgeApi, workspaceApi, connectionApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: typeof electronBridgeApi
    workspaceApi: typeof workspaceApi
    connectionApi: typeof connectionApi
  }
}
