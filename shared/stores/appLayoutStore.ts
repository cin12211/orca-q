import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppLayoutStore = defineStore(
  'app-layout-store',
  () => {
    const layoutSize = ref<number[]>([25, 50, 0]);

    const isActivityBarPanelCollapsed = computed(
      () => layoutSize.value[0] === 0
    );

    return {
      layoutSize,
      isActivityBarPanelCollapsed,
    };
  },
  {
    persist: true,
  }
);
