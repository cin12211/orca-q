import { ref } from "vue";
import { defineStore } from "pinia";
import type { TreeFileSystem } from "./treeUtils";

export const useManagementExplorerStore = defineStore(
  "management-explorer",
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
