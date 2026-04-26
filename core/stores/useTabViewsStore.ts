import { defineStore, storeToRefs } from 'pinia';
import { ref } from 'vue';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import type { RoutesNamesList } from '@typed-router/__routes';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { createStorageApis } from '~/core/storage';
import { useWSStateStore } from './useWSStateStore';

export enum TabViewType {
  AllERD = 'AllERD',
  DetailERD = 'DetailERD',
  TableOverview = 'TableOverview',
  TableDetail = 'tableDetail',

  FunctionsOverview = 'FunctionsOverview',
  FunctionsDetail = 'FunctionsDetail',

  ViewOverview = 'ViewOverview',
  ViewDetail = 'ViewDetail',

  CodeQuery = 'CodeQuery',

  UserPermissions = 'UserPermissions',
  DatabaseTools = 'DatabaseTools',
  InstanceInsights = 'InstanceInsights',
  SchemaDiff = 'SchemaDiff',
  Connection = 'Connection',
  Explorer = 'Explorer',
  Export = 'Export',
  AgentChat = 'AgentChat',
}

export interface BaseTabMetadata {
  type: TabViewType;
  treeNodeId?: string;
  [key: string]: any;
}

export interface TableDetailMetadata extends BaseTabMetadata {
  type: TabViewType.TableDetail;
  tableName: string;
}

export interface ViewDetailMetadata extends BaseTabMetadata {
  type: TabViewType.ViewDetail;
  virtualTableId: string;
  viewName: string;
}

export interface FunctionDetailMetadata extends BaseTabMetadata {
  type: TabViewType.FunctionsDetail;
  functionId: string;
}

export interface ErdDetailMetadata extends BaseTabMetadata {
  type: TabViewType.DetailERD | TabViewType.AllERD;
  tableName?: string;
}

export interface CodeQueryMetadata extends BaseTabMetadata {
  type: TabViewType.CodeQuery;
  tableName?: string;
  queryId?: string;
}

export interface AgentChatMetadata extends BaseTabMetadata {
  type: TabViewType.AgentChat;
  historyId?: string;
}

export type TabMetadata =
  | TableDetailMetadata
  | ViewDetailMetadata
  | FunctionDetailMetadata
  | ErdDetailMetadata
  | CodeQueryMetadata
  | AgentChatMetadata
  | BaseTabMetadata;

export type TabView = {
  workspaceId: string;
  connectionId: string;
  schemaId: string;
  id: string; // tabviewID = tableName + schemaId
  index: number;
  name: string;
  icon: string;
  iconClass?: string;
  type: TabViewType;
  routeName: RoutesNamesList;
  routeParams?: Record<string, string | number>;
  metadata?: TabMetadata;
};

export const useTabViewsStore = defineStore(
  'tab-views',
  () => {
    const storageApis = createStorageApis();
    const wsStateStore = useWSStateStore();
    const { workspaceId, connectionId } = useWorkspaceConnectionRoute();
    const { tabViewId } = storeToRefs(wsStateStore);

    const tabViews = ref<TabView[]>([]);

    const activeTab = computed(() =>
      tabViews.value.find(t => t.id === tabViewId.value)
    );

    const isLoading = ref(false);

    const onSetTabId = async (tabId?: string) => {
      if (!workspaceId.value || !connectionId.value) {
        throw new Error(
          'No workspace or connection selected or schema selected'
        );
      }

      await wsStateStore.setTabViewId({
        connectionId: connectionId.value,
        workspaceId: workspaceId.value,
        tabViewId: tabId,
      });
    };

    const logMissingTab = (tabId: string) => {
      console.error(`Tab with ID ${tabId} does not exist.`);
    };

    const getTabById = (tabId: string) =>
      tabViews.value.find(tab => tab.id === tabId);

    const getTabIndexById = (tabId: string) =>
      tabViews.value.findIndex(tab => tab.id === tabId);

    const getDeletePayload = (
      tab: Pick<TabView, 'connectionId' | 'schemaId' | 'id'>
    ) => ({
      connectionId: tab.connectionId,
      schemaId: tab.schemaId,
      id: tab.id,
    });

    const removeTabsFromState = (tabIds: string[]) => {
      if (!tabIds.length) {
        return;
      }

      const tabIdsSet = new Set(tabIds);
      tabViews.value = tabViews.value.filter(tab => !tabIdsSet.has(tab.id));
    };

    const navigateToConnectionRoot = async (params?: {
      workspaceId?: string;
      connectionId?: string;
    }) => {
      const nextWorkspaceId = params?.workspaceId ?? workspaceId.value;
      const nextConnectionId = params?.connectionId ?? connectionId.value;

      if (!nextWorkspaceId || !nextConnectionId) {
        return;
      }

      await navigateTo({
        name: 'workspaceId-connectionId',
        params: {
          workspaceId: nextWorkspaceId,
          connectionId: nextConnectionId,
        },
        replace: true,
      });
    };

    const scrollTabIntoView = async (tabId: string) => {
      await nextTick();
      const tabElement = document.getElementById(tabId);
      tabElement?.scrollIntoView({
        inline: 'nearest',
        block: 'nearest',
        behavior: 'auto',
      });
    };

    const deletePersistedTab = async (tab: TabView) => {
      await storageApis.tabViewStorage.deleteByProps(getDeletePayload(tab));
    };

    const deletePersistedTabs = async (tabs: TabView[]) => {
      if (!tabs.length) {
        return;
      }

      await storageApis.tabViewStorage.bulkDeleteByProps(
        tabs.map(getDeletePayload)
      );
    };

    const getAdjacentTabOnClose = (tabId: string) => {
      const currentIndex = getTabIndexById(tabId);

      if (currentIndex === -1) {
        return;
      }

      return (
        tabViews.value[currentIndex + 1] ?? tabViews.value[currentIndex - 1]
      );
    };

    const navigateAwayFromClosingTab = async (tab: TabView) => {
      const adjacentTab = getAdjacentTabOnClose(tab.id);

      if (adjacentTab) {
        await selectTab(adjacentTab.id);
        return;
      }

      await onSetTabId(undefined);
      await navigateToConnectionRoot({
        workspaceId: tab.workspaceId,
        connectionId: tab.connectionId,
      });
    };

    const openTab = async (tab: Omit<TabView, 'index'>) => {
      // if (!workspaceId.value || !connectionId.value || !wsStateStore.schemaId) {
      //   throw new Error(
      //     'No workspace or connection selected or schema selected'
      //   );
      //   return;
      // }

      const tabTmp: TabView = {
        // ...deepUnref(tab),
        ...({
          ...tab,
          metadata: { ...tab.metadata },
        } as TabView),
        index: tabViews.value.length,
      };

      //TODO: check this with when open file editor
      const tabExists = tabViews.value.some(t => t.id === tab.id);

      if (!tabExists) {
        tabViews.value.push(tabTmp);

        await storageApis.tabViewStorage.create(tabTmp);
        await onSetTabId(tab.id);
      }
    };

    const ensureTab = async (tab: Omit<TabView, 'index'>) => {
      await openTab(tab);
      await selectTab(tab.id);

      return getTabById(tab.id);
    };

    const selectTab = async (tabId: string) => {
      const tab = getTabById(tabId);

      if (tab) {
        await navigateTo({
          name: tab.routeName,
          params: {
            ...tab.routeParams,
            workspaceId: tab.workspaceId,
            connectionId: tab.connectionId,
          } as any,
        });

        await onSetTabId(tab.id);
        // Scroll the active tab into view in the tab bar without stealing
        // DOM focus — programmatic .focus() would pull focus away from the
        // editor (e.g. CodeMirror) in pages like the raw-query explorer.
        await scrollTabIntoView(tabId);
      } else {
        logMissingTab(tabId);
        // throw new Error(`Tab with ID ${tabId} does not exist.`);

        await navigateToConnectionRoot();
      }
    };

    const closeTab = async (tabId: string) => {
      const tabToClose = getTabById(tabId);

      if (tabToClose) {
        // Leave the current route before removing the tab backing it.
        if (activeTab.value?.id === tabId) {
          await navigateAwayFromClosingTab(tabToClose);
        }

        await deletePersistedTab(tabToClose);
        removeTabsFromState([tabId]);
      } else {
        logMissingTab(tabId);
        // throw new Error(`Tab with ID ${tabId} does not exist.`);

        await navigateToConnectionRoot();
      }
    };

    const moveTabTo = (startIndex: number, finishIndex: number) => {
      tabViews.value = reorder({
        list: tabViews.value,
        startIndex,
        finishIndex,
      });
    };

    const closeOtherTab = async (tabId: string) => {
      const currentTab = getTabById(tabId);

      if (!currentTab) {
        logMissingTab(tabId);
        await navigateToConnectionRoot();
        return;
      }

      const tabsToRemove = tabViews.value.filter(tab => tab.id !== tabId);

      await deletePersistedTabs(tabsToRemove);
      removeTabsFromState(tabsToRemove.map(tab => tab.id));

      await selectTab(tabId);
    };

    const closeToTheRight = async (tabId: string) => {
      const currentTabIndex = getTabIndexById(tabId);

      if (currentTabIndex === -1) {
        logMissingTab(tabId);
        await navigateToConnectionRoot();
        return;
      }

      const tabsToRemove = tabViews.value.slice(currentTabIndex + 1);

      await deletePersistedTabs(tabsToRemove);
      removeTabsFromState(tabsToRemove.map(tab => tab.id));

      await selectTab(tabId);
    };

    const loadPersistData = async () => {
      if (!connectionId.value || !workspaceId.value) {
        // console.error('connectionId or workspaceId not found');
        return;
      }

      const load = await storageApis.tabViewStorage.getByContext({
        connectionId: connectionId.value,
        workspaceId: workspaceId.value,
      });
      tabViews.value = (load ?? []) as TabView[];
    };

    // loadPersistData();

    watch(
      () => [connectionId.value, workspaceId.value],
      async ([connId, wsId]) => {
        if (connId && wsId) {
          await loadPersistData();
        }
      },
      { immediate: true }
    );

    const onActiveCurrentTab = async (connectionId: string) => {
      if (!tabViewId.value) {
        await navigateToConnectionRoot({
          workspaceId: workspaceId.value || '',
          connectionId,
        });

        console.error('tabViewId not found');
        return;
      }
      await selectTab(tabViewId.value);
    };

    return {
      tabViews,
      activeTab,
      isLoading,
      openTab,
      ensureTab,
      closeTab,
      selectTab,
      moveTabTo,
      closeOtherTab,
      closeToTheRight,
      onActiveCurrentTab,
      loadPersistData,
    };
  },
  {
    persist: false,
  }
);
