import { ref } from "vue";
import { defineStore } from "pinia";
import type { RouteNameFromPath, RoutePathSchema } from "@typed-router/__paths";
import type { RouteRecordName } from "vue-router";

// export enum TabViewType {
//   SmartView = "SmartView",
//   CodeQuery = "CodeQuery",
// }

export enum TabViewType {
  TableOverview = "TableOverview",
  TableDetail = "tableDetail",

  FunctionsOverview = "FunctionsOverview",
  FunctionsDetail = "FunctionsDetail",

  ViewOverview = "ViewOverview",
  ViewDetail = "ViewDetail",
}

type TabView = {
  name: string;
  id: string;
  projectId?: string;
  icon: string;
  type: TabViewType;
  routeName: RouteNameFromPath<RoutePathSchema>;
  routeParams?: Record<string, string | number>;
};

export const useManagementViewContainerStore = defineStore(
  "management-view-container",
  () => {
    const tabs = ref<TabView[]>([]);
    const activeTab = ref<TabView | null>(null);
    const isLoading = ref(false);

    const openTab = (tab: TabView) => {
      if (!tabs.value.some((t) => t.id === tab.id)) {
        tabs.value.push(tab);
        activeTab.value = tab;
      }
    };

    const selectTab = async (tabId: string) => {
      const tab = tabs.value?.find((t) => t.id === tabId);

      if (tab) {
        await navigateTo({
          name: tab.routeName,
          params: tab.routeParams as any,
        });

        activeTab.value = tab;
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
          name: "activity-schemas",
          replace: true,
        });
      }
    };

    const closeTab = async (tabId: string) => {
      const index = tabs.value.findIndex((t) => t.id === tabId);
      if (index !== -1) {
        const wasActive = activeTab.value?.id === tabId;
        tabs.value.splice(index, 1);
        if (wasActive && tabs.value.length > 0 && activeTab.value) {
          // Select the next tab, or the previous tab if no next tab exists
          const nextIndex = index < tabs.value.length ? index : index - 1;

          await selectTab(tabs.value[nextIndex].id);
        } else if (wasActive) {
          activeTab.value = null;
        }
      } else {
        console.error(`Tab with ID ${tabId} does not exist.`);

        await navigateTo({
          name: "activity-schemas",
          replace: true,
        });
      }
    };

    return {
      tabs,
      activeTab,
      isLoading,
      openTab,
      closeTab,
      selectTab,
    };
  },
  {
    persist: true,
  }
);
