import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useManagementExplorerStore = defineStore(
  'management-explorer',
  () => {
    const expandedState = ref<string[]>([]);

    const onUpdateExpandedState = (newPath: string, oldPath?: string) => {
      const currentExpanded = new Set(expandedState.value || []);

      // Always include the new path
      currentExpanded.add(newPath);

      // If a folder was renamed, update all affected paths
      const updatedExpanded = Array.from(currentExpanded).map(expandedPath => {
        if (oldPath && expandedPath?.startsWith?.(oldPath)) {
          return expandedPath.replace(oldPath, newPath);
        }
        return expandedPath;
      });

      expandedState.value = updatedExpanded;
    };

    const onRemoveExpandedByPath = (path: string) => {
      // Remove all expanded paths that belong under the deleted path
      expandedState.value = expandedState.value.filter(
        expandedPath => !expandedPath?.startsWith?.(path)
      );
    };

    const onCollapsedExplorer = () => {
      // Collapse all folders
      expandedState.value = [];
    };

    return {
      expandedState,
      onUpdateExpandedState,
      onCollapsedExplorer,
      onRemoveExpandedByPath,
    };
  },
  {
    persist: true,
  }
);
