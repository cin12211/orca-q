import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TreeFileSystem } from '../../components/base/Tree/treeUtils';

export const useManagementExplorerStore = defineStore(
  'management-explorer',
  () => {
    const expandedState = ref<string[]>([]);

    return {
      expandedState,
    };
  },
  {
    persist: true,
  }
);
