import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type UpdateListener = (payload: any) => void;

function createMockUpdaterApi() {
  const listeners = {
    updateAvailable: [] as UpdateListener[],
    upToDate: [] as UpdateListener[],
    progress: [] as UpdateListener[],
    ready: [] as UpdateListener[],
    error: [] as UpdateListener[],
  };

  const api = {
    check: vi.fn(),
    download: vi.fn().mockResolvedValue(undefined),
    install: vi.fn().mockResolvedValue(undefined),
    onUpdateAvailable: vi.fn((cb: UpdateListener) => {
      listeners.updateAvailable.push(cb);
      return () => undefined;
    }),
    onUpToDate: vi.fn((cb: UpdateListener) => {
      listeners.upToDate.push(cb);
      return () => undefined;
    }),
    onProgress: vi.fn((cb: UpdateListener) => {
      listeners.progress.push(cb);
      return () => undefined;
    }),
    onReady: vi.fn((cb: UpdateListener) => {
      listeners.ready.push(cb);
      return () => undefined;
    }),
    onError: vi.fn((cb: UpdateListener) => {
      listeners.error.push(cb);
      return () => undefined;
    }),
  };

  return {
    api,
    emitUpdateAvailable(payload: any) {
      listeners.updateAvailable.forEach(listener => listener(payload));
    },
    emitUpToDate(payload: any) {
      listeners.upToDate.forEach(listener => listener(payload));
    },
    emitProgress(payload: any) {
      listeners.progress.forEach(listener => listener(payload));
    },
    emitReady(payload: any) {
      listeners.ready.forEach(listener => listener(payload));
    },
    emitError(payload: any) {
      listeners.error.forEach(listener => listener(payload));
    },
  };
}

async function loadComposable() {
  return import('~/core/composables/useElectronUpdater');
}

describe('useElectronUpdater', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('marks same-version check as up-to-date instead of available', async () => {
    const updater = createMockUpdaterApi();
    updater.api.check.mockResolvedValue({
      status: 'up-to-date',
      currentVersion: '1.0.40',
    });

    vi.stubGlobal('window', {
      electronAPI: {
        updater: updater.api,
      },
    });

    const { useElectronUpdater } = await loadComposable();
    const composable = useElectronUpdater();

    await composable.checkForUpdates();

    expect(composable.status.value).toBe('up-to-date');
    expect(composable.availableUpdate.value).toBeNull();
  });

  it('stores available update with real current version', async () => {
    const updater = createMockUpdaterApi();
    updater.api.check.mockResolvedValue({
      status: 'available',
      updateInfo: {
        version: '1.0.41',
        currentVersion: '1.0.40',
        releaseDate: '2026-04-01T10:00:00.000Z',
        releaseNotes: 'Bug fixes',
      },
    });

    vi.stubGlobal('window', {
      electronAPI: {
        updater: updater.api,
      },
    });

    const { useElectronUpdater } = await loadComposable();
    const composable = useElectronUpdater();

    await composable.checkForUpdates();

    expect(composable.status.value).toBe('available');
    expect(composable.availableUpdate.value).toEqual({
      version: '1.0.41',
      currentVersion: '1.0.40',
      date: '2026-04-01T10:00:00.000Z',
      body: 'Bug fixes',
    });
  });

  it('opens the startup prompt when an update is available on startup', async () => {
    const updater = createMockUpdaterApi();
    updater.api.check.mockResolvedValue({
      status: 'available',
      updateInfo: {
        version: '1.0.41',
        currentVersion: '1.0.40',
      },
    });

    vi.stubGlobal('window', {
      electronAPI: {
        updater: updater.api,
      },
    });

    const { useElectronUpdater } = await loadComposable();
    const composable = useElectronUpdater();

    await composable.checkForUpdates({ promptIfAvailable: true });

    expect(composable.startupPromptOpen.value).toBe(true);
  });

  it('downloads when installUpdate is triggered from available state', async () => {
    const updater = createMockUpdaterApi();
    updater.api.check.mockResolvedValue({
      status: 'available',
      updateInfo: {
        version: '1.0.41',
        currentVersion: '1.0.40',
      },
    });

    vi.stubGlobal('window', {
      electronAPI: {
        updater: updater.api,
      },
    });

    const { useElectronUpdater } = await loadComposable();
    const composable = useElectronUpdater();

    await composable.checkForUpdates();
    await composable.installUpdate();

    expect(updater.api.download).toHaveBeenCalledTimes(1);
    expect(composable.status.value).toBe('downloading');
  });

  it('shares updater state across composable instances', async () => {
    const updater = createMockUpdaterApi();

    vi.stubGlobal('window', {
      electronAPI: {
        updater: updater.api,
      },
    });

    const { useElectronUpdater } = await loadComposable();
    const first = useElectronUpdater();
    const second = useElectronUpdater();

    updater.emitUpdateAvailable({
      version: '1.0.41',
      currentVersion: '1.0.40',
      releaseNotes: 'Shared state',
    });

    expect(second.status.value).toBe('available');
    expect(first.availableUpdate.value?.version).toBe('1.0.41');
  });

  it('schedules a delayed startup check', async () => {
    vi.useFakeTimers();

    const updater = createMockUpdaterApi();
    updater.api.check.mockResolvedValue({
      status: 'up-to-date',
      currentVersion: '1.0.40',
    });

    vi.stubGlobal('window', {
      electronAPI: {
        updater: updater.api,
      },
      addEventListener: vi.fn(),
    });

    const { scheduleElectronStartupUpdateCheck } = await loadComposable();
    scheduleElectronStartupUpdateCheck(5_000);

    expect(updater.api.check).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_000);

    expect(updater.api.check).toHaveBeenCalledTimes(1);
  });

  it('retries startup check on first window focus before the delay fires', async () => {
    vi.useFakeTimers();

    const updater = createMockUpdaterApi();
    updater.api.check.mockResolvedValue({
      status: 'up-to-date',
      currentVersion: '1.0.40',
    });

    let focusHandler: (() => void) | null = null;

    vi.stubGlobal('window', {
      electronAPI: {
        updater: updater.api,
      },
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'focus') {
          focusHandler = handler;
        }
      }),
    });

    const { scheduleElectronStartupUpdateCheck } = await loadComposable();
    scheduleElectronStartupUpdateCheck(5_000);

    expect(focusHandler).not.toBeNull();

    expect(updater.api.check).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);

    expect(updater.api.check).toHaveBeenCalledTimes(1);
  });
});
