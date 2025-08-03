import { ElectronAPI } from '@electron-toolkit/preload'
import {
  electronBridgeApi,
  workspaceApi,
  connectionApi,
  workspaceStateApi,
  tabViewsApi,
  quickQueryLogsApi,
  rowQueryFilesApi
} from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: typeof electronBridgeApi
    workspaceApi: typeof workspaceApi
    workspaceStateApi: typeof workspaceStateApi
    connectionApi: typeof connectionApi
    tabViewsApi: typeof tabViewsApi
    quickQueryLogsApi: typeof quickQueryLogsApi
    rowQueryFilesApi: typeof rowQueryFilesApi
  }
}
