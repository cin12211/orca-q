import { defineStore } from 'pinia';
import { ref } from 'vue';

export enum ActivityBarItemType {
  Explorer = 'Explorer',
  Schemas = 'Schemas',
  ErdDiagram = 'ERDiagram',
  UsersRoles = 'UsersRoles',
  DatabaseTools = 'DatabaseTools',
  Agent = 'Agent',
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

    const ensureActivityVisible = (
      visibleItems: ActivityBarItemType[],
      fallback: ActivityBarItemType
    ) => {
      const nextFallback = visibleItems.includes(fallback)
        ? fallback
        : (visibleItems[0] ?? fallback);

      if (!visibleItems.includes(activityActive.value)) {
        activityActive.value = nextFallback;
      }

      return activityActive.value;
    };

    const schemasExpandedState = ref<string[]>(['Tables']);
    const schemaCurrentScrollTop = ref(0);

    const explorerExpandedState = ref<string[]>([]);
    const explorerCurrentScrollTop = ref(0);

    const erdExpandedState = ref<string[]>([]);
    const erdCurrentScrollTop = ref(0);

    const onCollapsedSchemaTree = () => {
      schemasExpandedState.value = [];
    };

    const onCollapsedErdTree = () => {
      erdExpandedState.value = [];
    };

    return {
      activityActive,
      setActivityActive,
      ensureActivityVisible,
      schemasExpandedState,
      schemaCurrentScrollTop,
      explorerExpandedState,
      explorerCurrentScrollTop,
      onCollapsedSchemaTree,
      onCollapsedErdTree,
      erdExpandedState,
      erdCurrentScrollTop,
    };
  },
  {
    persist: true,
  }
);
