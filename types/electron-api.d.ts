type PersistCollection =
  import('~/core/storage/idbRegistry').ElectronPersistCollection;

interface PersistFilter {
  field: string;
  value: unknown;
}

type PersistMatchMode = 'all' | 'any';

interface ElectronUpdaterInfo {
  version: string;
  currentVersion: string;
  releaseDate?: string;
  releaseNotes?: string;
}

type ElectronUpdaterCheckResult =
  | {
      status: 'available';
      updateInfo: ElectronUpdaterInfo;
    }
  | {
      status: 'ready';
      updateInfo: ElectronUpdaterInfo;
    }
  | {
      status: 'up-to-date';
      currentVersion: string;
    };

interface ElectronDownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

interface ElectronSaveDialogFilter {
  name: string;
  extensions: string[];
}

interface ElectronSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: ElectronSaveDialogFilter[];
}

interface ElectronPersistAPI {
  getAll: <T = Record<string, unknown>>(
    collection: PersistCollection
  ) => Promise<T[]>;
  getOne: <T = Record<string, unknown>>(
    collection: PersistCollection,
    id: string
  ) => Promise<T | null>;
  find: <T = Record<string, unknown>>(
    collection: PersistCollection,
    filters: PersistFilter[],
    matchMode?: PersistMatchMode
  ) => Promise<T[]>;
  upsert: <T = Record<string, unknown>>(
    collection: PersistCollection,
    id: string,
    value: T
  ) => Promise<T>;
  delete: <T = Record<string, unknown>>(
    collection: PersistCollection,
    filters: PersistFilter[],
    matchMode?: PersistMatchMode
  ) => Promise<T[]>;
  replaceAll: <T = Record<string, unknown>>(
    collection: PersistCollection,
    values: T[]
  ) => Promise<void>;
  mergeAll: <T = Record<string, unknown>>(
    collection: PersistCollection,
    values: T[]
  ) => Promise<void>;
}

interface ElectronUpdaterAPI {
  check: () => Promise<ElectronUpdaterCheckResult | null>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  onUpdateAvailable: (cb: (info: ElectronUpdaterInfo) => void) => () => void;
  onUpToDate: (cb: () => void) => () => void;
  onProgress: (cb: (progress: ElectronDownloadProgress) => void) => () => void;
  onReady: (cb: (info: ElectronUpdaterInfo) => void) => () => void;
  onError: (cb: (message: string) => void) => () => void;
}

interface ElectronWindowAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  pickSqliteFile: () => Promise<string | null>;
  pickSaveFile: (options?: ElectronSaveDialogOptions) => Promise<string | null>;
  pickDirectory: () => Promise<string | null>;
  writeFile: (filePath: string, data: Uint8Array) => Promise<void>;
  openPath: (targetPath: string) => Promise<string>;
  getStoragePath: () => Promise<string>;
  openStoragePath: () => Promise<void>;
  getLogPath: () => Promise<string>;
  openLogFile: () => Promise<void>;
  resetAllData: () => Promise<void>;
  onOpenSettings: (cb: () => void) => () => void;
}

interface ElectronAPI {
  persist: ElectronPersistAPI;
  updater: ElectronUpdaterAPI;
  window: ElectronWindowAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
