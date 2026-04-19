import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

// ─── Types shared with renderer ───────────────────────────────────────────────

type PersistCollection =
  | 'appConfig'
  | 'agentState'
  | 'workspaces'
  | 'workspaceState'
  | 'connections'
  | 'tabViews'
  | 'quickQueryLogs'
  | 'rowQueryFiles'
  | 'rowQueryFileContents'
  | 'environment-tags'
  | 'query_builder_states';

interface PersistFilter {
  field: string;
  value: unknown;
}

type PersistMatchMode = 'all' | 'any';

// ─── electronAPI surface ──────────────────────────────────────────────────────

const electronAPI = {
  persist: {
    getAll: (collection: PersistCollection) =>
      ipcRenderer.invoke('persist:get-all', { collection }),

    getOne: (collection: PersistCollection, id: string) =>
      ipcRenderer.invoke('persist:get-one', { collection, id }),

    find: (
      collection: PersistCollection,
      filters: PersistFilter[],
      matchMode: PersistMatchMode = 'all'
    ) => ipcRenderer.invoke('persist:find', { collection, filters, matchMode }),

    upsert: (
      collection: PersistCollection,
      id: string,
      value: Record<string, unknown>
    ) => ipcRenderer.invoke('persist:upsert', { collection, id, value }),

    delete: (
      collection: PersistCollection,
      filters: PersistFilter[],
      matchMode: PersistMatchMode = 'all'
    ) =>
      ipcRenderer.invoke('persist:delete', { collection, filters, matchMode }),

    replaceAll: (
      collection: PersistCollection,
      values: Record<string, unknown>[]
    ) => ipcRenderer.invoke('persist:replace-all', { collection, values }),

    getAllPaginated: (
      collection: PersistCollection,
      page: number,
      pageSize: number
    ) =>
      ipcRenderer.invoke('persist:get-all-paginated', {
        collection,
        page,
        pageSize,
      }),
  },

  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),

    onUpdateAvailable: (cb: (info: unknown) => void) => {
      const handler = (_: IpcRendererEvent, info: unknown) => cb(info);
      ipcRenderer.on('updater:update-available', handler);
      return () =>
        ipcRenderer.removeListener('updater:update-available', handler);
    },

    onUpToDate: (cb: (info: unknown) => void) => {
      const handler = (_: IpcRendererEvent, info: unknown) => cb(info);
      ipcRenderer.on('updater:up-to-date', handler);
      return () => ipcRenderer.removeListener('updater:up-to-date', handler);
    },

    onProgress: (cb: (progress: unknown) => void) => {
      const handler = (_: IpcRendererEvent, progress: unknown) => cb(progress);
      ipcRenderer.on('updater:progress', handler);
      return () => ipcRenderer.removeListener('updater:progress', handler);
    },

    onReady: (cb: (info: unknown) => void) => {
      const handler = (_: IpcRendererEvent, info: unknown) => cb(info);
      ipcRenderer.on('updater:ready', handler);
      return () => ipcRenderer.removeListener('updater:ready', handler);
    },

    onError: (cb: (message: string) => void) => {
      const handler = (_: IpcRendererEvent, message: string) => cb(message);
      ipcRenderer.on('updater:error', handler);
      return () => ipcRenderer.removeListener('updater:error', handler);
    },
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    getStoragePath: () => ipcRenderer.invoke('window:get-storage-path'),
    openStoragePath: () => ipcRenderer.invoke('window:open-storage-path'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
