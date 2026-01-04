import { defineStore } from 'pinia';
import { ref } from 'vue';

export enum ActivityBarItemType {
  Explorer = 'Explorer',
  Schemas = 'Schemas',
  ErdDiagram = 'ERDiagram',
}

//TODO: refactor
export const useActivityBarStore = defineStore(
  'activity-bar',
  () => {
    const activityActive = ref<ActivityBarItemType>(
      ActivityBarItemType.Schemas
    );

    const setActivityActive = (type: ActivityBarItemType) => {
      activityActive.value = type;
    };

    const schemasExpandedState = ref<string[]>(['Tables']);
    const schemaCurrentScrollTop = ref(0);

    const explorerExpandedState = ref<string[]>([]);
    const explorerCurrentScrollTop = ref(0);

    return {
      activityActive,
      setActivityActive,
      schemasExpandedState,
      schemaCurrentScrollTop,
      explorerExpandedState,
      explorerCurrentScrollTop,
    };
  },
  {
    persist: true,
  }
);
