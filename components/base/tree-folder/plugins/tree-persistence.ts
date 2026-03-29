import type {
  TreePersistenceContext,
  TreePersistenceExtension,
} from '../types';

type MaybePromise<T> = T | Promise<T>;

type PersistencePhase = 'load' | 'save' | 'clear' | 'preload' | 'pull' | 'push';

export interface TreePersistenceStorageAdapter {
  loadExpandedIds: (
    storageKey: string
  ) => MaybePromise<string[] | null | undefined>;
  saveExpandedIds: (
    storageKey: string,
    expandedIds: string[]
  ) => MaybePromise<void>;
  clearExpandedIds?: (storageKey: string) => MaybePromise<void>;
}

export interface TreePersistenceApiSyncAdapter {
  pullExpandedIds?: (
    storageKey: string
  ) => Promise<string[] | null | undefined>;
  pushExpandedIds?: (
    storageKey: string,
    expandedIds: string[]
  ) => Promise<void>;
}

export interface CreateTreePersistencePluginOptions {
  mode?: 'auto' | 'web';
  webStorage?: TreePersistenceStorageAdapter;
  apiSync?: TreePersistenceApiSyncAdapter;
  pushDebounceMs?: number;
  preferRemote?: boolean;
  onError?: (error: unknown, phase: PersistencePhase) => void;
}

export interface TreePersistencePlugin extends TreePersistenceExtension {
  preload: (context: TreePersistenceContext) => Promise<string[] | null>;
  flush: () => Promise<void>;
}

const isPromiseLike = <T>(value: unknown): value is Promise<T> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
};

const normalizeExpandedIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((id): id is string => typeof id === 'string');
};

const cloneExpandedIds = (expandedIds: string[]): string[] => {
  return [...expandedIds];
};

export const createWebLocalStorageAdapter =
  (): TreePersistenceStorageAdapter => ({
    loadExpandedIds: storageKey => {
      if (typeof window === 'undefined') {
        return null;
      }

      const value = window.localStorage.getItem(`${storageKey}_expanded`);
      if (!value) {
        return null;
      }

      try {
        return normalizeExpandedIds(JSON.parse(value));
      } catch {
        return null;
      }
    },
    saveExpandedIds: (storageKey, expandedIds) => {
      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.setItem(
        `${storageKey}_expanded`,
        JSON.stringify(expandedIds)
      );
    },
    clearExpandedIds: storageKey => {
      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.removeItem(`${storageKey}_expanded`);
    },
  });

export const createTreePersistencePlugin = (
  options: CreateTreePersistencePluginOptions = {}
): TreePersistencePlugin => {
  const pushDebounceMs = options.pushDebounceMs ?? 400;
  const cache = new Map<string, string[]>();
  const pendingPushes = new Set<Promise<void>>();
  const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const emitError = (error: unknown, phase: PersistencePhase) => {
    options.onError?.(error, phase);
  };

  const resolveStorageAdapter = (): TreePersistenceStorageAdapter => {
    return options.webStorage ?? createWebLocalStorageAdapter();
  };

  const schedulePush = (
    context: TreePersistenceContext,
    expandedIds: string[]
  ) => {
    const pushExpandedIds = options.apiSync?.pushExpandedIds;
    if (!pushExpandedIds) {
      return;
    }

    const key = context.storageKey;
    const existingTimer = pushTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      pushTimers.delete(key);

      const pushPromise = pushExpandedIds(
        key,
        cloneExpandedIds(expandedIds)
      ).catch(error => {
        emitError(error, 'push');
      });

      pendingPushes.add(pushPromise);
      void pushPromise.finally(() => {
        pendingPushes.delete(pushPromise);
      });
    }, pushDebounceMs);

    pushTimers.set(key, timer);
  };

  const saveToStorage = (
    context: TreePersistenceContext,
    expandedIds: string[]
  ) => {
    const storage = resolveStorageAdapter();
    const saveResult = storage.saveExpandedIds(
      context.storageKey,
      cloneExpandedIds(expandedIds)
    );

    if (isPromiseLike<void>(saveResult)) {
      void saveResult.catch(error => {
        emitError(error, 'save');
      });
    }
  };

  const loadFromStorageSync = (
    context: TreePersistenceContext
  ): string[] | null => {
    const storage = resolveStorageAdapter();
    const loadResult = storage.loadExpandedIds(context.storageKey);

    if (isPromiseLike<string[] | null | undefined>(loadResult)) {
      void loadResult
        .then(value => {
          const normalized = normalizeExpandedIds(value);
          if (normalized) {
            cache.set(context.storageKey, normalized);
          }
        })
        .catch(error => {
          emitError(error, 'load');
        });
      return null;
    }

    return normalizeExpandedIds(loadResult);
  };

  const preload = async (
    context: TreePersistenceContext
  ): Promise<string[] | null> => {
    const storage = resolveStorageAdapter();

    let localExpandedIds: string[] | null = null;
    try {
      const localResult = await storage.loadExpandedIds(context.storageKey);
      localExpandedIds = normalizeExpandedIds(localResult);
    } catch (error) {
      emitError(error, 'preload');
    }

    const pullExpandedIds = options.apiSync?.pullExpandedIds;
    if (!pullExpandedIds) {
      if (localExpandedIds) {
        cache.set(context.storageKey, localExpandedIds);
      }
      return localExpandedIds;
    }

    let remoteExpandedIds: string[] | null = null;
    try {
      const remoteResult = await pullExpandedIds(context.storageKey);
      remoteExpandedIds = normalizeExpandedIds(remoteResult);
    } catch (error) {
      emitError(error, 'pull');
    }

    const selectedExpandedIds = options.preferRemote
      ? (remoteExpandedIds ?? localExpandedIds)
      : (localExpandedIds ?? remoteExpandedIds);

    if (!selectedExpandedIds) {
      return null;
    }

    cache.set(context.storageKey, selectedExpandedIds);

    try {
      await storage.saveExpandedIds(
        context.storageKey,
        cloneExpandedIds(selectedExpandedIds)
      );
    } catch (error) {
      emitError(error, 'save');
    }

    return selectedExpandedIds;
  };

  return {
    loadExpandedIds: context => {
      const cached = cache.get(context.storageKey);
      if (cached) {
        return cloneExpandedIds(cached);
      }

      const loaded = loadFromStorageSync(context);
      if (loaded) {
        cache.set(context.storageKey, loaded);
      }

      return loaded;
    },
    saveExpandedIds: (expandedIds, context) => {
      const normalized = normalizeExpandedIds(expandedIds) ?? [];
      cache.set(context.storageKey, normalized);

      saveToStorage(context, normalized);
      schedulePush(context, normalized);
    },
    clearExpandedIds: context => {
      cache.delete(context.storageKey);

      const timer = pushTimers.get(context.storageKey);
      if (timer) {
        clearTimeout(timer);
        pushTimers.delete(context.storageKey);
      }

      const storage = resolveStorageAdapter();
      const clearResult = storage.clearExpandedIds?.(context.storageKey);

      if (isPromiseLike<void>(clearResult)) {
        void clearResult.catch(error => {
          emitError(error, 'clear');
        });
      }

      schedulePush(context, []);
    },
    preload,
    flush: async () => {
      await Promise.all(Array.from(pendingPushes));
    },
  };
};
