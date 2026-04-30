import { defineStore } from 'pinia';
import { ref } from 'vue';

export enum RedisBrowserViewMode {
  Tree = 'tree',
  List = 'list',
}

export type RedisWorkspaceSession = {
  connectionId: string;
  selectedDatabaseIndex: number;
  viewMode: RedisBrowserViewMode;
  keyPattern: string;
  keyTypeFilter: string[];
  selectedKey: string | null;
  activeTool: 'browser' | 'pubsub';
};

const createRedisSession = (
  connectionId: string,
  defaultDatabaseIndex = 0
): RedisWorkspaceSession => ({
  connectionId,
  selectedDatabaseIndex: defaultDatabaseIndex,
  viewMode: RedisBrowserViewMode.Tree,
  keyPattern: '*',
  keyTypeFilter: [],
  selectedKey: null,
  activeTool: 'browser',
});

export const useRedisWorkspaceStore = defineStore('redis-workspace', () => {
  const sessions = ref<Record<string, RedisWorkspaceSession>>({});

  const ensureSession = (connectionId: string, defaultDatabaseIndex = 0) => {
    if (!sessions.value[connectionId]) {
      sessions.value[connectionId] = createRedisSession(
        connectionId,
        defaultDatabaseIndex
      );
    }

    return sessions.value[connectionId];
  };

  const patchSession = (
    connectionId: string,
    patch: Partial<RedisWorkspaceSession>
  ) => {
    Object.assign(ensureSession(connectionId), patch);
  };

  return {
    sessions,
    ensureSession,
    patchSession,
  };
});
