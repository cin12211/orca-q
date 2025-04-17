import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TreeFileSystem } from '../../components/modules/management-explorer/treeUtils';

export enum ActivityBarItemType {
  Explorer = 'Explorer',
  Schemas = 'Schemas',
}

export const useActivityBarStore = defineStore(
  'activity-bar',
  () => {
    const activityActive = ref<ActivityBarItemType>(
      ActivityBarItemType.Schemas
    );

    const setActivityActive = (type: ActivityBarItemType) => {
      activityActive.value = type;
    };

    return {
      activityActive,
      setActivityActive,
    };
  },
  {
    persist: true,
  }
);
