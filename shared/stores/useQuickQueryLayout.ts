import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const DEFAULT_QUICK_QUERY_LAYOUT_SIZE = [75, 25];

export const useQuickQueryLayout = defineStore(
  'quick-query-layout-store',
  () => {
    // This array typically manages sizes for areas like [Query_Table_Area, History_Logs_Area]
    // Defaulting to 80% for the main query table and 20% for history logs.
    const layoutSize = ref<number[]>(DEFAULT_QUICK_QUERY_LAYOUT_SIZE);

    // Stores the last non-zero sizes of panels for restoration after collapsing.
    // [Last_Query_Table_Size, Last_History_Logs_Size]
    const historyLayoutSize = ref<number[]>(DEFAULT_QUICK_QUERY_LAYOUT_SIZE);

    /**
     * Computed property to check if the history logs panel is currently collapsed.
     * The history logs panel is assumed to be the second element in `layoutSize`.
     */
    const isHistoryPanelCollapsed = computed(() => layoutSize.value[1] === 0);

    /**
     * Toggles the visibility of the history logs panel.
     * If the panel is currently collapsed (size 0), it restores it to its last non-zero size
     * or a default of 20%. If it's visible, it collapses it.
     */
    const toggleHistoryPanel = () => {
      console.log('hello');

      const [mainQuerySize, historySize] = layoutSize.value;

      if (historySize === 0) {
        // Restore history panel: use its last size, or default to 20%
        const restoreHistory =
          historyLayoutSize.value[1] || DEFAULT_QUICK_QUERY_LAYOUT_SIZE[1];
        layoutSize.value[1] = restoreHistory;
        layoutSize.value[0] = Math.max(mainQuerySize - restoreHistory, 0); // Adjust main area
      } else {
        // Collapse history panel: store current size, then set to 0
        historyLayoutSize.value[1] = historySize; // Save current history size
        layoutSize.value[1] = 0;
        layoutSize.value[0] = mainQuerySize + historySize; // Expand main area
      }
    };

    return {
      layoutSize,
      historyLayoutSize,
      isHistoryPanelCollapsed,
      toggleHistoryPanel,
    };
  },
  {
    // Enable persistence for the store, saving its state across browser sessions.
    persist: true,
  }
);
