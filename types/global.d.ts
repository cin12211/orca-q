import { ElectronAPI } from '@electron-toolkit/preload';
import { electronBridgeApi } from '../electron/src/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: typeof electronBridgeApi;
  }
}
