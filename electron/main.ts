import {
  app,
  BrowserWindow,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import path from 'node:path';
import { registerAllIpcHandlers } from './ipc';
import { getKnex } from './persist/knex-db';
import { runMigrations } from './persist/migration/runner';
import { persistGetAll } from './persist/store';
import { buildRecentConnectionTargets } from './recent-connections';
import { initUpdater } from './updater';
import { spawnSidecar, killSidecar } from './utils/sidecar';

const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL =
  process.env.ELECTRON_DEV_SERVER_URL ?? 'http://localhost:3000';
const APP_WEBSITE_URL = 'https://orca-q.com/';
const REPORT_ISSUE_URL = 'https://github.com/cin12211/orca-q/issues';

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 720;
const MAX_RECENT_CONNECTIONS = 10;

let mainWindow: BrowserWindow | null = null;
let appServerUrl: string | null = null;

function buildAppUrl(serverUrl: string, routePath = '/'): string {
  const normalizedPath = routePath.startsWith('/')
    ? routePath
    : `/${routePath}`;
  return new URL(normalizedPath, serverUrl).toString();
}

function focusWindow(win: BrowserWindow): void {
  if (win.isMinimized()) {
    win.restore();
  }

  if (!win.isVisible()) {
    win.show();
  }

  win.focus();
}

function createWindow(serverUrl: string, routePath = '/'): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    center: true,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  void win.loadURL(buildAppUrl(serverUrl, routePath));
  return win;
}

function attachMainWindow(win: BrowserWindow): void {
  mainWindow = win;
  initUpdater(win.webContents);

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

function ensureMainWindow(routePath = '/'): BrowserWindow {
  if (!appServerUrl) {
    throw new Error('Application server URL is not ready yet.');
  }

  if (!mainWindow) {
    const win = createWindow(appServerUrl, routePath);
    attachMainWindow(win);
    return win;
  }

  return mainWindow;
}

async function openRoute(routePath = '/'): Promise<void> {
  const win = ensureMainWindow(routePath);
  const targetUrl = buildAppUrl(appServerUrl!, routePath);

  if (win.webContents.getURL() !== targetUrl) {
    await win.loadURL(targetUrl);
  }

  focusWindow(win);
}

function sendRendererCommand(channel: string): void {
  const win = ensureMainWindow('/');
  const dispatch = () => {
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel);
      }
    }, 150);
  };

  if (win.webContents.isLoadingMainFrame()) {
    win.webContents.once('did-finish-load', dispatch);
  } else {
    dispatch();
  }

  focusWindow(win);
}

async function getRecentConnectionMenuItems(): Promise<
  MenuItemConstructorOptions[]
> {
  const [workspaces, connections, workspaceStates] = await Promise.all([
    persistGetAll('workspaces'),
    persistGetAll('connections'),
    persistGetAll('workspaceState'),
  ]);

  const recentConnections = buildRecentConnectionTargets(
    workspaces as Array<{ id: string; name: string }>,
    connections as Array<{ id: string; workspaceId: string; name: string }>,
    workspaceStates as Array<{
      id: string;
      connectionId?: string;
      openedAt?: string;
      updatedAt?: string;
    }>,
    MAX_RECENT_CONNECTIONS
  );

  if (recentConnections.length === 0) {
    return [
      {
        label: 'No recent connections',
        enabled: false,
      },
    ];
  }

  return recentConnections.map(connection => ({
    label: `${connection.connectionName}  ${'\u203a'}  ${connection.workspaceName}`,
    click: () => {
      void openRoute(
        `/${encodeURIComponent(connection.workspaceId)}/${encodeURIComponent(connection.connectionId)}`
      );
    },
  }));
}

async function refreshNativeMenus(): Promise<void> {
  const recentConnectionItems = await getRecentConnectionMenuItems();

  const menuTemplate: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: 'Settings…',
                accelerator: 'CmdOrCtrl+,',
                click: () => sendRendererCommand('window:open-settings'),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Home',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            void openRoute('/');
          },
        },
        {
          label: 'Recent Connections',
          submenu: recentConnectionItems,
        },
        { type: 'separator' },
        {
          label: 'Open Data Folder',
          click: () => {
            void shell.openPath(path.join(app.getPath('appData'), 'orcaq'));
          },
        },
        ...(process.platform === 'darwin'
          ? [{ role: 'close' as const }]
          : [{ role: 'quit' as const }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'OrcaQ Website',
          click: () => {
            void shell.openExternal(APP_WEBSITE_URL);
          },
        },
        {
          label: 'Report an Issue',
          click: () => {
            void shell.openExternal(REPORT_ISSUE_URL);
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  if (process.platform === 'darwin') {
    const dockItems: MenuItemConstructorOptions[] = [
      {
        label: 'Open Home',
        click: () => {
          void openRoute('/');
        },
      },
      { type: 'separator' },
      ...recentConnectionItems,
    ];

    app.dock?.setMenu(Menu.buildFromTemplate(dockItems));
  }
}

async function bootstrap(): Promise<void> {
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      focusWindow(mainWindow);
      return;
    }

    if (appServerUrl) {
      void openRoute('/');
    }
  });

  await app.whenReady();

  if (IS_DEV) {
    appServerUrl = DEV_SERVER_URL;
  } else {
    try {
      appServerUrl = await spawnSidecar();
    } catch (error) {
      console.error('[electron] Failed to start Nitro runtime:', error);
      app.quit();
      return;
    }
  }

  await runMigrations(getKnex());

  registerAllIpcHandlers(
    () => mainWindow,
    () => {
      void refreshNativeMenus();
    }
  );

  attachMainWindow(createWindow(appServerUrl));
  await refreshNativeMenus();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      attachMainWindow(createWindow(appServerUrl!));
    }

    void refreshNativeMenus();
  });
}

app.on('before-quit', () => {
  killSidecar();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

bootstrap().catch(error => {
  console.error('[electron] Bootstrap failed:', error);
  process.exit(1);
});
