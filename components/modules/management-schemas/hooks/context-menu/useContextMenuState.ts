import { ref } from 'vue';
import type { FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import type { TabViewType } from '~/shared/stores/useTabViewsStore';
import type { ContextMenuState, SafeModeDialogType } from './types';

export function useContextMenuState(): ContextMenuState {
  const selectedItem = ref<FlattenedTreeFileSystemItem['value'] | null>(null);

  // Safe mode dialog state
  const safeModeDialogOpen = ref(false);
  const safeModeDialogSQL = ref('');
  const safeModeDialogType = ref<SafeModeDialogType>('delete');
  const pendingAction = ref<(() => Promise<void>) | null>(null);

  // Rename dialog state
  const renameDialogType = ref<TabViewType | null>(null);
  const renameDialogOpen = ref(false);
  const renameDialogValue = ref('');
  const renameDialogParameters = ref('');

  // SQL Preview dialog state
  const sqlPreviewDialogOpen = ref(false);
  const sqlPreviewDialogSQL = ref('');
  const sqlPreviewDialogTitle = ref('Generated SQL');

  const isFetching = ref(false);

  return {
    selectedItem,
    safeModeDialogOpen,
    safeModeDialogSQL,
    safeModeDialogType,
    pendingAction,
    renameDialogType,
    renameDialogOpen,
    renameDialogValue,
    renameDialogParameters,
    sqlPreviewDialogOpen,
    sqlPreviewDialogSQL,
    sqlPreviewDialogTitle,
    isFetching,
  };
}
