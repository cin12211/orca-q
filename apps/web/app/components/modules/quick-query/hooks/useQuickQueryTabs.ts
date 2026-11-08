import { QuickQueryTabView } from '../constants';

type OpenedQuickQueryTabMap = Record<QuickQueryTabView, boolean>;

const createOpenedQuickQueryTabs = (): OpenedQuickQueryTabMap => ({
  [QuickQueryTabView.Data]: true,
  [QuickQueryTabView.Structure]: false,
  [QuickQueryTabView.Erd]: false,
});

export const useQuickQueryTabs = ({
  initialTab = QuickQueryTabView.Data,
  onTabChanged,
}: {
  initialTab?: QuickQueryTabView;
  onTabChanged?: (tab: QuickQueryTabView) => void;
} = {}) => {
  const quickQueryTabView = ref<QuickQueryTabView>(initialTab);
  const openedQuickQueryTab = ref<OpenedQuickQueryTabMap>(
    createOpenedQuickQueryTabs()
  );

  watch(quickQueryTabView, newQuickQueryTabView => {
    openedQuickQueryTab.value[newQuickQueryTabView] = true;
    onTabChanged?.(newQuickQueryTabView);
  });

  return {
    quickQueryTabView,
    openedQuickQueryTab,
  };
};
