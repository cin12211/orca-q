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
  id: string;
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
      }

      await wsStateStore.setTabViewId({
        connectionId: connectionId.value,
        workspaceId: workspaceId.value,
        tabViewId: tabId,
      });
    };

    const openTab = async (
      tab: Omit<TabView, 'workspaceId' | 'connectionId' | 'schemaId'>
    ) => {
      if (!workspaceId.value || !connectionId.value || !wsStateStore.schemaId) {
        throw new Error(
          'No workspace or connection selected or schema selected'
        );
      }

      const tabTmp: TabView = {
        ...tab,
        workspaceId: workspaceId.value,
        connectionId: connectionId.value,
        schemaId: wsStateStore.schemaId,
      };

      if (!tabViews.value.some(t => t.id === tab.id)) {
        await window.tabViewsApi.create(tabTmp);

        await onSetTabId(tab.id);
        await loadPersistData();
      }
    };

    const selectTab = async (tabId: string) => {
      const tab = tabViews.value?.find(t => t.id === tabId);

      if (tab) {
        await navigateTo({
          name: tab.routeName,
          params: tab.routeParams as any,
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

        await navigateTo({
          name: 'workspaceId',
          replace: true,
        });
      }
    };

    const closeTab = async (tabId: string) => {
      const index = tabViews.value.findIndex(t => t.id === tabId);

      await window.tabViewsApi.delete(tabId);

      if (index !== -1) {
        const wasActive = activeTab.value?.id === tabId;
        tabViews.value.splice(index, 1);

        if (tabViews.value.length <= 0) {
          await onSetTabId(undefined);

          await navigateTo({
            name: 'workspaceId',
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

        await navigateTo({
          name: 'workspaceId',
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

    const closeOtherTab = (tabId: string) => {
      tabViews.value = tabViews.value.filter(t => t.id === tabId);
      selectTab(tabId);
    };

    const closeToTheRight = (tabId: string) => {
      const currentTabIndex = tabViews.value.findIndex(t => t.id === tabId);

      tabViews.value.splice(currentTabIndex + 1);

      selectTab(tabId);
    };

    const loadPersistData = async () => {
      if (!connectionId.value || !workspaceId.value) {
        throw new Error('connectionId or workspaceId not found');
        return;
      }

      const load = await window.tabViewsApi.getByContext({
        connectionId: connectionId.value,
        workspaceId: workspaceId.value,
      });
      tabViews.value = load;
    };

    loadPersistData();

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
    };
  },
  {
    persist: false,
  }
);
