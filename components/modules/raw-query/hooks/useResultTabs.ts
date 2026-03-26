import type { ExecutedResultItem } from '../interfaces';

/**
 * Manages executed result tabs — pure state management hook.
 * Zero coupling to CodeMirror or query execution.
 */
export function useResultTabs() {
  const executedResults = shallowRef<Map<string, ExecutedResultItem>>(
    new Map()
  );

  const activeResultTabId = ref<string | null>(null);

  /**
   * Prepends a new result tab and sets it as active.
   */
  const addResultTab = (item: ExecutedResultItem) => {
    const newMap = new Map<string, ExecutedResultItem>();
    newMap.set(item.id, item);
    executedResults.value.forEach((value, key) => {
      newMap.set(key, value);
    });
    executedResults.value = newMap;
    activeResultTabId.value = item.id;
  };

  /**
   * Immutably updates a specific tab (triggers reactivity).
   */
  const refreshResultTab = (tabId: string, updated: ExecutedResultItem) => {
    const newMap = new Map(executedResults.value);
    newMap.set(tabId, { ...updated });
    executedResults.value = newMap;
  };

  const updateResultTabResult = (
    tabId: string,
    result: ExecutedResultItem['result']
  ) => {
    const newMap = new Map(executedResults.value);
    const tab = newMap.get(tabId);
    if (tab) {
      tab.result = result;
    }
  };

  const setActiveResultTab = (tabId: string) => {
    if (executedResults.value.has(tabId)) {
      activeResultTabId.value = tabId;
    }
  };

  const closeResultTab = (tabId: string) => {
    const newMap = new Map(executedResults.value);
    newMap.delete(tabId);
    executedResults.value = newMap;

    // If closing the active tab, switch to the last remaining tab
    if (activeResultTabId.value === tabId) {
      const remainingIds = Array.from(newMap.keys());
      activeResultTabId.value =
        remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;
    }
  };

  const updateResultTabView = (
    tabId: string,
    view: ExecutedResultItem['view']
  ) => {
    const tab = executedResults.value.get(tabId);
    if (tab) {
      refreshResultTab(tabId, { ...tab, view });
    }
  };

  const closeOtherResultTabs = (keepTabId: string) => {
    const tabToKeep = executedResults.value.get(keepTabId);
    if (!tabToKeep) return;

    const newMap = new Map<string, ExecutedResultItem>();
    newMap.set(keepTabId, tabToKeep);
    executedResults.value = newMap;

    activeResultTabId.value = keepTabId;
  };

  const closeResultTabsToRight = (tabId: string) => {
    const tabIds = Array.from(executedResults.value.keys());
    const currentIndex = tabIds.indexOf(tabId);

    if (currentIndex < 0) return;

    // Keep tabs from start to current index (inclusive)
    const newMap = new Map<string, ExecutedResultItem>();
    for (let i = 0; i <= currentIndex; i++) {
      const id = tabIds[i];
      const tab = executedResults.value.get(id);
      if (tab) {
        newMap.set(id, tab);
      }
    }
    executedResults.value = newMap;

    // If active tab was deleted, switch to the current tab
    if (!newMap.has(activeResultTabId.value || '')) {
      activeResultTabId.value = tabId;
    }
  };

  return {
    executedResults,
    activeResultTabId,
    addResultTab,
    refreshResultTab,
    setActiveResultTab,
    closeResultTab,
    updateResultTabView,
    closeOtherResultTabs,
    closeResultTabsToRight,
    updateResultTabResult,
  };
}

export type ResultTabsReturn = ReturnType<typeof useResultTabs>;
