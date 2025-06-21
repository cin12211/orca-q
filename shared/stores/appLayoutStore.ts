import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const DEFAULT_APP_LAYOUT_SIZE = [25, 50, 25];

const intiAppLayout = [30, 70, 0];

const initBodyLayout = [100, 0];

const DEFAULT_BODY_LAYOUT_SIZE = [100, 25];

export const useAppLayoutStore = defineStore(
  'app-layout-store',
  () => {
    const layoutSize = ref<number[]>(intiAppLayout);
    const historyLayoutSize = ref<number[]>(intiAppLayout);

    const bodySize = ref<number[]>(initBodyLayout);
    const historyBodySize = ref<number[]>(initBodyLayout);

    const isPrimarySidebarCollapsed = computed(() => layoutSize.value[0] === 0);

    const isSecondSidebarCollapsed = computed(() => layoutSize.value[2] === 0);

    const onToggleActivityBarPanel = () => {
      const [left, main] = layoutSize.value;

      if (left === 0) {
        const restoreLeft =
          historyLayoutSize.value[0] || DEFAULT_APP_LAYOUT_SIZE[0];
        layoutSize.value[0] = restoreLeft;
        layoutSize.value[1] = Math.max(main - restoreLeft, 0);
      } else {
        historyLayoutSize.value[0] = left;
        layoutSize.value[0] = 0;
        layoutSize.value[1] = main + left;
      }
    };

    const onToggleSecondSidebar = () => {
      const [_, main, right] = layoutSize.value;

      if (right === 0) {
        const restoreRight =
          historyLayoutSize.value[2] || DEFAULT_APP_LAYOUT_SIZE[2];
        layoutSize.value[2] = restoreRight;
        layoutSize.value[1] = Math.max(main - restoreRight, 0);
      } else {
        historyLayoutSize.value[2] = right;
        layoutSize.value[2] = 0;
        layoutSize.value[1] = main + right;
      }
    };

    const onResizeLayout = (resizedLayout: number[]) => {
      const [left, _, right] = resizedLayout;
      layoutSize.value = resizedLayout;

      if (left !== 0) historyLayoutSize.value[0] = left;
      if (right !== 0) historyLayoutSize.value[2] = right;
    };

    const onResizeBody = (resizedLayout: number[]) => {
      const [left, right] = resizedLayout;
      bodySize.value = resizedLayout;

      if (left !== 0) historyBodySize.value[0] = left;
      if (right !== 0) historyBodySize.value[1] = right;
    };

    const onToggleBottomPanel = () => {
      const [top, bottom] = bodySize.value;

      if (bottom === 0) {
        const restoreBottom =
          historyBodySize.value[1] || DEFAULT_BODY_LAYOUT_SIZE[1];
        bodySize.value[1] = restoreBottom;
        bodySize.value[0] = Math.max(top - restoreBottom, 0);
      } else {
        historyBodySize.value[1] = bottom;
        bodySize.value[1] = 0;
        bodySize.value[0] = top + bottom;
      }
    };

    return {
      layoutSize,
      historyLayoutSize,
      isPrimarySidebarCollapsed,
      isSecondSidebarCollapsed,
      onToggleActivityBarPanel,
      onToggleSecondSidebar,
      onResizeLayout,
      bodySize,
      onResizeBody,
      onToggleBottomPanel,
    };
  },
  {
    persist: true,
  }
);
