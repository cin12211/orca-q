import { ElectronAPI } from '@electron-toolkit/preload'
import { electronBridgeApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: typeof electronBridgeApi
  }
}
