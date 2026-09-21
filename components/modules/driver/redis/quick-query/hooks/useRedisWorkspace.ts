import type { MaybeRefOrGetter } from 'vue';
import { toRef, watch } from 'vue';
import type { Connection } from '~/core/stores';
import {
  type RedisWorkspaceSession,
  useRedisWorkspaceStore,
} from '~/core/stores/useRedisWorkspaceStore';
import { type TabView } from '~/core/stores/useTabViewsStore';
import { parseRedisDatabaseIndex } from '../utils/redisWorkspace';
import { useRedisWorkspaceBrowser } from './useRedisWorkspaceBrowser';

/**
 * Which surface the workspace is driving. Callers state it explicitly so the
 * hook never has to infer behaviour from the active tab type.
 */
export type RedisWorkspaceMode = 'browser' | 'pubsub' | 'group' | 'meta';

export function useRedisWorkspace(options: {
  connection: MaybeRefOrGetter<Connection | undefined>;
  tabInfo?: MaybeRefOrGetter<TabView | undefined>;
  mode?: MaybeRefOrGetter<RedisWorkspaceMode>;
}) {
  const connection = toRef(options.connection);
  const tabInfo = options.tabInfo ? toRef(options.tabInfo) : undefined;
  const mode = toRef(options.mode ?? 'browser');
  const isBrowserMode = computed(() => mode.value === 'browser');
  const isPubSubMode = computed(() => mode.value === 'pubsub');
  const isMetaMode = computed(() => mode.value === 'meta');
  const store = useRedisWorkspaceStore();

  const session = computed<RedisWorkspaceSession | null>(() => {
    if (!connection.value?.id) {
      return null;
    }

    return store.ensureSession(
      connection.value.id,
      parseRedisDatabaseIndex(
        connection.value.database,
        connection.value.connectionString
      )
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
    () => [tabInfo?.value, mode.value] as const,
    async ([value]) => {
      if (!session.value || !value) {
        return;
      }

      if (isPubSubMode.value) {
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
        !isBrowserMode.value ||
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
        !isBrowserMode.value ||
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
        if (isPubSubMode.value) {
          void browser.refreshDatabases();
        }

        return;
      }

      if (isMetaMode.value) {
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

      if (isMetaMode.value) {
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
    selectedKeyInfo: browser.selectedKeyInfo,
    loadingKeys: browser.loadingKeys,
    loadingSelectedKeyDetail: browser.loadingSelectedKeyDetail,
    loadingSelectedKeyInfo: browser.loadingSelectedKeyInfo,
    savingValue: browser.savingValue,
    isDeletingKey: browser.isDeletingKey,
    selectedDatabaseIndex,
    keyPattern,
    canEditSelectedValue: browser.canEditSelectedValue,
    editUnavailableReason: browser.editUnavailableReason,
    refreshKeys: browser.refreshKeys,
    openKey: browser.openKey,
    focusKey: browser.focusKey,
    saveSelectedValue: browser.saveSelectedValue,
    deleteKey: browser.deleteKey,
    deleteKeys: browser.deleteKeys,
    listGroupKeys: browser.listGroupKeys,
    previewGroupKeys: browser.previewGroupKeys,
  };
}
