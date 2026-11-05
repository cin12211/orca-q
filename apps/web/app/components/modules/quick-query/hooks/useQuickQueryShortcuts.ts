import { useHotkeys } from '~/core/composables/useHotKeys';
import type QuickQueryFilter from '../quick-query-filter/QuickQueryFilter.vue';
import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';

interface UseQuickQueryShortcutsOptions {
  containerRef: Ref<HTMLElement | undefined>;
  quickQueryFilterRef: Ref<InstanceType<typeof QuickQueryFilter> | undefined>;
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>;
  isSkipShortcut: Ref<boolean>;
  isViewOnly: Ref<boolean>;
  onCopySelectedCell: () => void;
  onPasteRows: () => void;
  onSaveData: () => void;
  onDeleteRows: () => void;
}

export const useQuickQueryShortcuts = ({
  containerRef,
  quickQueryFilterRef,
  quickQueryTableRef,
  isSkipShortcut,
  isViewOnly,
  onCopySelectedCell,
  onPasteRows,
  onSaveData,
  onDeleteRows,
}: UseQuickQueryShortcutsOptions) => {
  const canUseTableShortcut = () => !isSkipShortcut.value;
  const canUseMutationShortcut = () =>
    !isSkipShortcut.value && !isViewOnly.value;

  useHotkeys(
    [
      {
        key: 'meta+a',
        callback: () => {
          if (!canUseTableShortcut()) {
            return;
          }

          quickQueryTableRef.value?.gridApi?.selectAll();
        },
        excludeInput: true,
        isPreventDefault: true,
      },
      {
        key: 'meta+c',
        callback: () => {
          if (!canUseTableShortcut()) {
            return;
          }

          onCopySelectedCell();
        },
        excludeInput: true,
      },
      {
        key: 'meta+v',
        callback: () => {
          if (!canUseTableShortcut()) {
            return;
          }

          onPasteRows();
        },
        excludeInput: true,
      },
      {
        key: 'meta+s',
        callback: () => {
          if (!canUseMutationShortcut()) {
            return;
          }

          onSaveData();
        },
        isPreventDefault: true,
      },
      {
        key: 'meta+alt+backspace',
        callback: () => {
          if (!canUseMutationShortcut()) {
            return;
          }

          onDeleteRows();
        },
        isPreventDefault: true,
      },
    ],
    {
      target: containerRef,
    }
  );

  useHotkeys([
    {
      key: 'meta+f',
      callback: async () => {
        if (!canUseTableShortcut()) {
          return;
        }

        await quickQueryFilterRef.value?.onShowSearch();
      },
    },
  ]);
};
