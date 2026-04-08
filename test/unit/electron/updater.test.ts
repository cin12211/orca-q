import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockWebContents = {
  destroy: () => void;
  isDestroyed: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
};

function createMockWebContents(): MockWebContents {
  let destroyed = false;
  const destroyedListeners = new Set<() => void>();

  return {
    send: vi.fn(),
    isDestroyed: vi.fn(() => destroyed),
    once: vi.fn((event: string, listener: () => void) => {
      if (event === 'destroyed') {
        destroyedListeners.add(listener);
      }
    }),
    removeListener: vi.fn((event: string, listener: () => void) => {
      if (event === 'destroyed') {
        destroyedListeners.delete(listener);
      }
    }),
    destroy: () => {
      destroyed = true;
      [...destroyedListeners].forEach(listener => listener());
    },
  };
}

function createMockAutoUpdater() {
  const emitter = new EventEmitter() as EventEmitter & {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    checkForUpdates: ReturnType<typeof vi.fn>;
    downloadUpdate: ReturnType<typeof vi.fn>;
    quitAndInstall: ReturnType<typeof vi.fn>;
  };

  emitter.autoDownload = true;
  emitter.autoInstallOnAppQuit = true;
  emitter.checkForUpdates = vi.fn().mockResolvedValue(undefined);
  emitter.downloadUpdate = vi.fn().mockResolvedValue(undefined);
  emitter.quitAndInstall = vi.fn();

  return emitter;
}

async function loadUpdaterModule() {
  return import('~/electron/updater');
}

describe('electron updater bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('does not send updater events to destroyed webContents', async () => {
    const mockApp = {
      getVersion: vi.fn(() => '1.0.46'),
      removeAllListeners: vi.fn(),
    };
    const mockAutoUpdater = createMockAutoUpdater();

    vi.doMock('electron', () => ({
      app: mockApp,
    }));
    vi.doMock('electron-updater', () => ({
      autoUpdater: mockAutoUpdater,
    }));

    const { initUpdater } = await loadUpdaterModule();
    const webContents = createMockWebContents();

    initUpdater(webContents as unknown as Electron.WebContents);
    webContents.destroy();
    mockAutoUpdater.emit('error', new Error('late updater event'));

    expect(webContents.send).not.toHaveBeenCalled();
  });

  it('rebinds updater events to the latest webContents without duplicating listeners', async () => {
    const mockApp = {
      getVersion: vi.fn(() => '1.0.46'),
      removeAllListeners: vi.fn(),
    };
    const mockAutoUpdater = createMockAutoUpdater();

    vi.doMock('electron', () => ({
      app: mockApp,
    }));
    vi.doMock('electron-updater', () => ({
      autoUpdater: mockAutoUpdater,
    }));

    const { initUpdater } = await loadUpdaterModule();
    const firstWebContents = createMockWebContents();
    const secondWebContents = createMockWebContents();

    initUpdater(firstWebContents as unknown as Electron.WebContents);
    initUpdater(secondWebContents as unknown as Electron.WebContents);

    mockAutoUpdater.emit('update-downloaded', {
      version: '1.0.47',
      releaseDate: '2026-04-02T00:00:00.000Z',
      releaseNotes: 'Regression fix',
    });

    expect(firstWebContents.send).not.toHaveBeenCalled();
    expect(secondWebContents.send).toHaveBeenCalledTimes(1);
    expect(secondWebContents.send).toHaveBeenCalledWith('updater:ready', {
      version: '1.0.47',
      currentVersion: '1.0.46',
      releaseDate: '2026-04-02T00:00:00.000Z',
      releaseNotes: 'Regression fix',
    });
  });

  it('forwards install-time updater errors after quitAndInstall starts', async () => {
    const mockApp = {
      getVersion: vi.fn(() => '1.0.46'),
      removeAllListeners: vi.fn(),
    };
    const mockAutoUpdater = createMockAutoUpdater();

    vi.doMock('electron', () => ({
      app: mockApp,
    }));
    vi.doMock('electron-updater', () => ({
      autoUpdater: mockAutoUpdater,
    }));

    const { initUpdater, quitAndInstall } = await loadUpdaterModule();
    const webContents = createMockWebContents();

    initUpdater(webContents as unknown as Electron.WebContents);
    quitAndInstall();
    await new Promise(resolve => setImmediate(resolve));

    mockAutoUpdater.emit('error', new Error('ShipIt validation failed'));

    expect(webContents.send).toHaveBeenCalledWith(
      'updater:error',
      'ShipIt validation failed'
    );

    mockAutoUpdater.emit('update-available', {
      version: '1.0.47',
      releaseDate: '2026-04-02T00:00:00.000Z',
      releaseNotes: 'Retry works',
    });

    expect(webContents.send).toHaveBeenCalledWith('updater:update-available', {
      version: '1.0.47',
      currentVersion: '1.0.46',
      releaseDate: '2026-04-02T00:00:00.000Z',
      releaseNotes: 'Retry works',
    });
  });
});
