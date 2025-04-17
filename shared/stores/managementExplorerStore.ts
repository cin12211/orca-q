import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TreeFileSystem } from '../../components/modules/management-explorer/treeUtils';

export const useManagementExplorerStore = defineStore(
  'management-explorer',
  () => {
    const explorerFiles = ref<TreeFileSystem>([]);
    const expandedState = ref<string[]>([]);

    return {
      explorerFiles,
      expandedState,
    };
  },
  {
    persist: true,
  }
);
