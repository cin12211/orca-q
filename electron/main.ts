import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import { registerAllIpcHandlers } from './ipc';
import { initUpdater } from './updater';
import { spawnSidecar, killSidecar } from './utils/sidecar';

const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL =
  process.env.ELECTRON_DEV_SERVER_URL ?? 'http://localhost:3000';

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 720;

let mainWindow: BrowserWindow | null = null;

function createWindow(serverUrl: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    center: true,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for preload to use Node built-ins
    },
  });

  // Show window once ready to prevent blank flash
  win.once('ready-to-show', () => win.show());

  // Open external links in the default browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      import('electron').then(({ shell }) => shell.openExternal(url));
    }
    return { action: 'deny' };
  });

  win.loadURL(serverUrl);
  return win;
}

async function bootstrap(): Promise<void> {
  // Prevent duplicate instances
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  await app.whenReady();

  let serverUrl: string;

  if (IS_DEV) {
    serverUrl = DEV_SERVER_URL;
  } else {
    try {
      serverUrl = await spawnSidecar();
    } catch (error) {
      console.error('[electron] Failed to start Nitro runtime:', error);
      app.quit();
      return;
    }
  }

  mainWindow = createWindow(serverUrl);
  registerAllIpcHandlers(mainWindow);

  // Initialize auto-updater after window is created
  initUpdater(mainWindow.webContents);

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow(serverUrl);
    }
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.on('before-quit', () => {
  killSidecar();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

bootstrap().catch(err => {
  console.error('[electron] Bootstrap failed:', err);
  process.exit(1);
});
