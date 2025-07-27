import { defineStore } from 'pinia';
import { ref } from 'vue';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import { useWSStateStore } from './useWSStateStore';

// export enum TabViewType {
//   SmartView = "SmartView",
//   CodeQuery = "CodeQuery",
// }

export enum TabViewType {
  TableOverview = 'TableOverview',
  TableDetail = 'tableDetail',

  FunctionsOverview = 'FunctionsOverview',
  FunctionsDetail = 'FunctionsDetail',

  ViewOverview = 'ViewOverview',
  ViewDetail = 'ViewDetail',

  CodeQuery = 'CodeQuery',
}

export type TabView = {
  workspaceId: string;
  connectionId: string;
  schemaId: string;
  id: string; // tabviewID = tableName + schemaId
  index: number;
  name: string;
  icon: string;
  type: TabViewType;
  routeName: RouteNameFromPath<RoutePathSchema>;
  routeParams?: Record<string, string | number>;
};

export const useTabViewsStore = defineStore(
  'tab-views',
  () => {
    const wsStateStore = useWSStateStore();
    const { workspaceId, connectionId, tabViewId } = toRefs(wsStateStore);

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
        return;
      }

      await wsStateStore.setTabViewId({
        connectionId: connectionId.value,
        workspaceId: workspaceId.value,
        tabViewId: tabId,
      });
    };

    const openTab = async (
      tab: Omit<TabView, 'workspaceId' | 'connectionId' | 'schemaId' | 'index'>
    ) => {
      if (!workspaceId.value || !connectionId.value || !wsStateStore.schemaId) {
        throw new Error(
          'No workspace or connection selected or schema selected'
        );
        return;
      }

      const tabTmp: TabView = {
        ...tab,
        workspaceId: workspaceId.value,
        connectionId: connectionId.value,
        schemaId: wsStateStore.schemaId,
        index: tabViews.value.length,
      };

      //TODO: check this with when open file editor
      const isExitTab = tabViews.value.some(
        t =>
          t.id === tab.id &&
          t.schemaId === wsStateStore.schemaId &&
          t.connectionId === connectionId.value
      );

      if (!isExitTab) {
        await window.tabViewsApi.create(tabTmp);

        tabViews.value.push(tabTmp);

        await onSetTabId(tab.id);
      }
    };

    const selectTab = async (tabId: string) => {
      const tab = tabViews.value?.find(t => t.id === tabId);

      if (tab) {
        navigateTo({
          name: tab.routeName,
          params: {
            ...tab.routeParams,
            workspaceId: workspaceId.value,
          } as any,
        });

        await onSetTabId(tab.id);
        // Wait for the next DOM update cycle to ensure the tab is rendered
        await nextTick();
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
          tabElement.focus();
        } else {
          console.warn(`Tab element with ID ${tabId} not found in the DOM.`);
        }
      } else {
        console.error(`Tab with ID ${tabId} does not exist.`);
        // throw new Error(`Tab with ID ${tabId} does not exist.`);

        navigateTo({
          name: 'workspaceId-connectionId',
          replace: true,
        });
      }
    };

    const closeTab = async (tabId: string) => {
      if (!wsStateStore.schemaId || !connectionId.value) {
        throw new Error('No schema or connection selected or schema selected');
        return;
      }

      const index = tabViews.value.findIndex(t => t.id === tabId);

      await window.tabViewsApi.delete({
        connectionId: connectionId.value,
        schemaId: wsStateStore.schemaId,
        id: tabId,
      });

      if (index !== -1) {
        const wasActive = activeTab.value?.id === tabId;
        tabViews.value.splice(index, 1);

        if (tabViews.value.length <= 0) {
          await onSetTabId(undefined);

          navigateTo({
            name: 'workspaceId-connectionId',
            replace: true,
          });
          return;
        }

        if (wasActive) {
          // Select the next tab, or the previous tab if no next tab exists
          const nextIndex = index < tabViews.value.length ? index : index - 1;

          await selectTab(tabViews.value[nextIndex].id);
        }
      } else {
        console.error(`Tab with ID ${tabId} does not exist.`);
        // throw new Error(`Tab with ID ${tabId} does not exist.`);

        navigateTo({
          name: 'workspaceId-connectionId',
          replace: true,
        });
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
      const removeTabIds = [...tabViews.value]
        .filter(t => t.id !== tabId)
        .map(t => {
          return {
            connectionId: t.connectionId,
            schemaId: t.schemaId,
            id: t.id,
          };
        });

      await window.tabViewsApi.bulkDelete(removeTabIds);

      tabViews.value = tabViews.value.filter(t => t.id === tabId);

      await selectTab(tabId);
    };

    const closeToTheRight = async (tabId: string) => {
      const currentTabIndex = tabViews.value.findIndex(t => t.id === tabId);

      const removeTabIds = [...tabViews.value]
        .slice(currentTabIndex + 1)
        .map(t => {
          return {
            connectionId: t.connectionId,
            schemaId: t.schemaId,
            id: t.id,
          };
        });

      await window.tabViewsApi.bulkDelete(removeTabIds);

      tabViews.value.splice(currentTabIndex + 1);

      await selectTab(tabId);
    };

    const loadPersistData = async () => {
      console.log('🚀 ~ loadPersistData ~ connectionId.value:');
      if (!connectionId.value || !workspaceId.value) {
        console.error('connectionId or workspaceId not found');
        return;
      }

      const load = await window.tabViewsApi.getByContext({
        connectionId: connectionId.value,
        workspaceId: workspaceId.value,
      });
      tabViews.value = load;
    };

    loadPersistData();

    watch(
      () => [connectionId.value, workspaceId.value],
      async () => {
        await loadPersistData();
      }
    );

    const onActiveCurrentTab = async (connectionId: string) => {
      if (!tabViewId.value) {
        navigateTo({
          name: 'workspaceId-connectionId',
          params: {
            workspaceId: workspaceId.value || '',
            connectionId: connectionId,
          },
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
      closeTab,
      selectTab,
      moveTabTo,
      closeOtherTab,
      closeToTheRight,
      onActiveCurrentTab,
    };
  },
  {
    persist: false,
  }
);
