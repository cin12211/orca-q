import type { ComputedRef, Ref } from 'vue';
import { toast } from 'vue-sonner';
import type { Connection } from '~/core/stores';
import { useRedisWorkspaceStore } from '~/core/stores/useRedisWorkspaceStore';
import type { RedisWorkspaceSession } from '~/core/stores/useRedisWorkspaceStore';
import type {
  RedisBrowserResponse,
  RedisDatabaseOption,
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

  const refreshSelectedKeyDetail = async (key = session.value?.selectedKey) => {
    if (!connection.value || !session.value || !key) {
      selectedKeyDetail.value = null;
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
    await refreshSelectedKeyDetail(key);
  };

  const saveSelectedValue = async (payload: RedisValueUpdatePayload) => {
    if (!connection.value || !session.value?.selectedKey) {
      return;
    }

    savingValue.value = true;

    try {
      selectedKeyDetail.value = await $fetch<RedisKeyDetail>(
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

  return {
    keys,
    databases,
    selectedKeyDetail,
    loadingKeys,
    loadingSelectedKeyDetail,
    savingValue,
    editUnavailableReason,
    canEditSelectedValue,
    refreshKeys,
    refreshDatabases,
    refreshSelectedKeyDetail,
    openKey,
    focusKey,
    saveSelectedValue,
  };
}
