import type { BrowserWindow } from 'electron';
import { registerPersistHandlers } from './persist';
import { registerUpdaterHandlers, registerWindowHandlers } from './window';

export function registerAllIpcHandlers(mainWindow: BrowserWindow): void {
  registerPersistHandlers();
  registerWindowHandlers(mainWindow);
  registerUpdaterHandlers();
}
