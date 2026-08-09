import type { ComputedRef, Ref } from 'vue';
import { toast } from 'vue-sonner';
import type { Connection } from '~/core/stores';
import { useRedisWorkspaceStore } from '~/core/stores/useRedisWorkspaceStore';
import type { RedisWorkspaceSession } from '~/core/stores/useRedisWorkspaceStore';
import type {
  RedisBrowserResponse,
  RedisDatabaseOption,
  RedisDeleteResponse,
  RedisKeyDetail,
  RedisKeyListItem,
  RedisValueUpdatePayload,
} from '~/core/types/redis-workspace.types';
import {
  buildConnectionBody,
  getRedisUnavailableReason,
} from '../utils/redisWorkspace';

interface UseRedisWorkspaceBrowserParams {
  connection: Ref<Connection | undefined>;
  session: ComputedRef<RedisWorkspaceSession | null>;
  store: ReturnType<typeof useRedisWorkspaceStore>;
}

export function useRedisWorkspaceBrowser({
  connection,
  session,
  store,
}: UseRedisWorkspaceBrowserParams) {
  const keys = ref<RedisKeyListItem[]>([]);
  const databases = ref<RedisDatabaseOption[]>([]);
  const selectedKeyDetail = shallowRef<RedisKeyDetail | null>(null);
  const loadingKeys = ref(false);
  const loadingSelectedKeyDetail = ref(false);
  const savingValue = ref(false);
  const editUnavailableReason = ref('');
  let selectedKeyDetailRequestId = 0;

  const canEditSelectedValue = computed(
    () => !!selectedKeyDetail.value && !editUnavailableReason.value
  );

  const detailCache = new Map<string, RedisKeyDetail>();

  const getDetailCacheKey = (databaseIndex: number, key: string) =>
    `${connection.value?.id}:${databaseIndex}:${key}`;

  const refreshKeys = async () => {
    if (!connection.value || !session.value) {
      keys.value = [];
      databases.value = [];
      selectedKeyDetail.value = null;
      return;
    }

    loadingKeys.value = true;

    try {
      const result = await $fetch<RedisBrowserResponse>('/api/redis/browser', {
        method: 'POST',
        body: {
          ...buildConnectionBody(connection.value),
          databaseIndex: session.value.selectedDatabaseIndex,
          keyPattern: session.value.keyPattern,
        },
      });

      keys.value = result.keys;
      databases.value = result.databases;
      editUnavailableReason.value = '';
    } finally {
      loadingKeys.value = false;
    }
  };

  const refreshDatabases = async () => {
    if (!connection.value || !session.value) {
      databases.value = [];
      return;
    }

    databases.value = await $fetch<RedisDatabaseOption[]>(
      '/api/redis/browser/databases',
      {
        method: 'POST',
        body: {
          ...buildConnectionBody(connection.value),
          databaseIndex: session.value.selectedDatabaseIndex,
        },
      }
    );
  };

  const refreshSelectedKeyDetail = async (
    key = session.value?.selectedKey,
    options?: { force?: boolean }
  ) => {
    if (!connection.value || !session.value || !key) {
      selectedKeyDetail.value = null;
      editUnavailableReason.value = '';
      loadingSelectedKeyDetail.value = false;
      return;
    }

    const cacheKey = getDetailCacheKey(
      session.value.selectedDatabaseIndex,
      key
    );
    const cached = detailCache.get(cacheKey);

    if (!options?.force && cached) {
      selectedKeyDetail.value = cached;
      editUnavailableReason.value = '';
      loadingSelectedKeyDetail.value = false;
      return;
    }

    const requestId = ++selectedKeyDetailRequestId;
    selectedKeyDetail.value = null;
    loadingSelectedKeyDetail.value = true;

    try {
      const detail = await $fetch<RedisKeyDetail>('/api/redis/browser/value', {
        method: 'POST',
        body: {
          ...buildConnectionBody(connection.value),
          databaseIndex: session.value.selectedDatabaseIndex,
          key,
        },
      });

      if (requestId !== selectedKeyDetailRequestId) {
        return;
      }

      detailCache.set(cacheKey, detail);
      selectedKeyDetail.value = detail;
      editUnavailableReason.value = '';
    } finally {
      if (requestId === selectedKeyDetailRequestId) {
        loadingSelectedKeyDetail.value = false;
      }
    }
  };

  const openKey = async (key: string) => {
    if (!session.value) {
      return;
    }

    store.patchSession(session.value.connectionId, {
      selectedKey: key,
      activeTool: 'browser',
    });
  };

  const focusKey = async (key: string) => {
    if (!session.value) {
      return;
    }

    await openKey(key);
    await refreshSelectedKeyDetail(key, { force: true });
  };

  const saveSelectedValue = async (payload: RedisValueUpdatePayload) => {
    if (!connection.value || !session.value?.selectedKey) {
      return;
    }

    savingValue.value = true;

    try {
      const updatedDetail = await $fetch<RedisKeyDetail>(
        '/api/redis/browser/value',
        {
          method: 'PATCH',
          body: {
            ...buildConnectionBody(connection.value),
            databaseIndex: session.value.selectedDatabaseIndex,
            key: session.value.selectedKey,
            previewKind: payload.previewKind,
            stringFormat: payload.stringFormat,
            tableKind: payload.tableKind,
            ttlSeconds: payload.ttlSeconds,
            value: payload.value,
          },
        }
      );

      detailCache.set(
        getDetailCacheKey(
          session.value.selectedDatabaseIndex,
          session.value.selectedKey
        ),
        updatedDetail
      );
      selectedKeyDetail.value = updatedDetail;
      editUnavailableReason.value = '';
      toast.success('Redis key saved successfully', {
        description: `Updated ${session.value.selectedKey}`,
      });
    } catch (error) {
      const unavailableReason = getRedisUnavailableReason(error, 'edit');
      if (unavailableReason) {
        editUnavailableReason.value = unavailableReason;
        return;
      }

      console.error('[useRedisWorkspace] Failed to save Redis value', error);
    } finally {
      savingValue.value = false;
    }
  };

  const isDeletingKey = ref(false);

  const clearSelectionIfDeleted = (deletedKeys: string[]) => {
    if (
      !session.value?.selectedKey ||
      !deletedKeys.includes(session.value.selectedKey)
    ) {
      return;
    }

    store.patchSession(session.value.connectionId, { selectedKey: null });
    selectedKeyDetail.value = null;
  };

  const deleteKey = async (key: string) => {
    if (!connection.value || !session.value) {
      return;
    }

    isDeletingKey.value = true;

    try {
      await $fetch<RedisDeleteResponse>('/api/redis/browser/value', {
        method: 'DELETE',
        body: {
          ...buildConnectionBody(connection.value),
          databaseIndex: session.value.selectedDatabaseIndex,
          key,
        },
      });

      detailCache.delete(
        getDetailCacheKey(session.value.selectedDatabaseIndex, key)
      );
      clearSelectionIfDeleted([key]);
      await refreshKeys();
      toast.success('Redis key deleted', {
        description: `Deleted ${key}`,
      });
    } finally {
      isDeletingKey.value = false;
    }
  };

  const deleteKeys = async (keysToDelete: string[]) => {
    if (!connection.value || !session.value || keysToDelete.length === 0) {
      return;
    }

    isDeletingKey.value = true;

    try {
      await $fetch<RedisDeleteResponse>('/api/redis/browser/keys', {
        method: 'DELETE',
        body: {
          ...buildConnectionBody(connection.value),
          databaseIndex: session.value.selectedDatabaseIndex,
          keys: keysToDelete,
        },
      });

      keysToDelete.forEach(key =>
        detailCache.delete(
          getDetailCacheKey(session.value!.selectedDatabaseIndex, key)
        )
      );
      clearSelectionIfDeleted(keysToDelete);
      await refreshKeys();
      toast.success('Redis keys deleted', {
        description: `Deleted ${keysToDelete.length} keys`,
      });
    } finally {
      isDeletingKey.value = false;
    }
  };

  const previewGroupKeys = async (prefix: string): Promise<string[]> => {
    if (!connection.value || !session.value) {
      return [];
    }

    const result = await $fetch<RedisBrowserResponse>('/api/redis/browser', {
      method: 'POST',
      body: {
        ...buildConnectionBody(connection.value),
        databaseIndex: session.value.selectedDatabaseIndex,
        keyPattern: `${prefix}:*`,
      },
    });

    return result.keys.map(item => item.key);
  };

  return {
    keys,
    databases,
    selectedKeyDetail,
    loadingKeys,
    loadingSelectedKeyDetail,
    savingValue,
    isDeletingKey,
    editUnavailableReason,
    canEditSelectedValue,
    refreshKeys,
    refreshDatabases,
    refreshSelectedKeyDetail,
    openKey,
    focusKey,
    saveSelectedValue,
    deleteKey,
    deleteKeys,
    previewGroupKeys,
  };
}
