import type { MaybeRefOrGetter } from 'vue';
import { toRef, watch } from 'vue';
import type { Connection } from '~/core/stores';
import {
  type RedisWorkspaceSession,
  useRedisWorkspaceStore,
} from '~/core/stores/useRedisWorkspaceStore';
import { TabViewType, type TabView } from '~/core/stores/useTabViewsStore';
import { parseRedisDatabaseIndex } from '../utils/redisWorkspace';
import { useRedisWorkspaceBrowser } from './useRedisWorkspaceBrowser';

export function useRedisWorkspace(options: {
  connection: MaybeRefOrGetter<Connection | undefined>;
  tabInfo?: MaybeRefOrGetter<TabView | undefined>;
  mode?: 'browser' | 'meta';
}) {
  const connection = toRef(options.connection);
  const tabInfo = options.tabInfo ? toRef(options.tabInfo) : undefined;
  const mode = options.mode ?? 'browser';
  const store = useRedisWorkspaceStore();

  const session = computed<RedisWorkspaceSession | null>(() => {
    if (!connection.value?.id) {
      return null;
    }

    return store.ensureSession(
      connection.value.id,
      parseRedisDatabaseIndex(connection.value.database)
    );
  });

  const selectedDatabaseIndex = computed({
    get: () => session.value?.selectedDatabaseIndex ?? 0,
    set: value => {
      if (!session.value) {
        return;
      }

      store.patchSession(session.value.connectionId, {
        selectedDatabaseIndex: value,
      });
    },
  });

  const keyPattern = computed({
    get: () => session.value?.keyPattern ?? '*',
    set: value => {
      if (!session.value) {
        return;
      }

      store.patchSession(session.value.connectionId, {
        keyPattern: value || '*',
      });
    },
  });

  const browser = useRedisWorkspaceBrowser({
    connection,
    session,
    store,
  });

  const isSyncingBrowserTabState = ref(false);

  watch(
    () => tabInfo?.value,
    async value => {
      if (!session.value || !value) {
        return;
      }

      if (value.type === TabViewType.RedisPubSub) {
        store.patchSession(session.value.connectionId, {
          activeTool: 'pubsub',
          selectedDatabaseIndex:
            typeof value.metadata?.databaseIndex === 'number'
              ? value.metadata.databaseIndex
              : session.value.selectedDatabaseIndex,
        });
        void browser.refreshDatabases();
        return;
      }

      isSyncingBrowserTabState.value = true;

      try {
        store.patchSession(session.value.connectionId, {
          activeTool: 'browser',
          selectedDatabaseIndex:
            typeof value.metadata?.databaseIndex === 'number'
              ? value.metadata.databaseIndex
              : session.value.selectedDatabaseIndex,
          keyPattern:
            typeof value.metadata?.keyPattern === 'string'
              ? value.metadata.keyPattern
              : session.value.keyPattern,
          selectedKey:
            typeof value.metadata?.selectedKey === 'string'
              ? value.metadata.selectedKey
              : session.value.selectedKey,
        });
        await browser.refreshKeys();
        void browser.refreshSelectedKeyDetail();
      } finally {
        isSyncingBrowserTabState.value = false;
      }
    },
    { immediate: true }
  );

  watch(
    () => [session.value?.selectedDatabaseIndex, session.value?.keyPattern],
    ([nextDatabaseIndex, nextKeyPattern], previousValue) => {
      if (
        !tabInfo?.value ||
        tabInfo.value.type !== TabViewType.RedisBrowser ||
        isSyncingBrowserTabState.value
      ) {
        return;
      }

      const [previousDatabaseIndex, previousKeyPattern] = previousValue ?? [];

      if (
        nextDatabaseIndex === previousDatabaseIndex &&
        nextKeyPattern === previousKeyPattern
      ) {
        return;
      }

      browser.refreshKeys();
    }
  );

  watch(
    () => session.value?.selectedKey,
    (nextSelectedKey, previousSelectedKey) => {
      if (
        !tabInfo?.value ||
        tabInfo.value.type !== TabViewType.RedisBrowser ||
        isSyncingBrowserTabState.value ||
        nextSelectedKey === previousSelectedKey
      ) {
        return;
      }

      void browser.refreshSelectedKeyDetail(nextSelectedKey);
    }
  );

  watch(
    () => session.value?.selectedDatabaseIndex,
    (nextDatabaseIndex, previousDatabaseIndex) => {
      if (nextDatabaseIndex === previousDatabaseIndex) {
        return;
      }

      if (tabInfo?.value) {
        if (tabInfo.value.type === TabViewType.RedisPubSub) {
          void browser.refreshDatabases();
        }

        return;
      }

      if (mode === 'meta') {
        void browser.refreshDatabases();
      }
    }
  );

  watch(
    () => connection.value?.id,
    value => {
      if (!value || tabInfo?.value) {
        return;
      }

      if (mode === 'meta') {
        void browser.refreshDatabases();
        return;
      }

      void browser.refreshKeys();
    },
    { immediate: true }
  );

  return {
    session,
    keys: browser.keys,
    databases: browser.databases,
    selectedKeyDetail: browser.selectedKeyDetail,
    loadingKeys: browser.loadingKeys,
    loadingSelectedKeyDetail: browser.loadingSelectedKeyDetail,
    savingValue: browser.savingValue,
    selectedDatabaseIndex,
    keyPattern,
    canEditSelectedValue: browser.canEditSelectedValue,
    editUnavailableReason: browser.editUnavailableReason,
    refreshKeys: browser.refreshKeys,
    openKey: browser.openKey,
    focusKey: browser.focusKey,
    saveSelectedValue: browser.saveSelectedValue,
  };
}
