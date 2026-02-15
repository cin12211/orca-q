import { computed, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { useManagementConnectionStore } from '~/core/stores';
import type { Schema } from '~/core/stores/useSchemaStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { useFunctionActions } from './context-menu/actions/useFunctionActions';
import { useTableActions } from './context-menu/actions/useTableActions';
import { useViewActions } from './context-menu/actions/useViewActions';
import { buildFunctionMenuItems } from './context-menu/menuItems/functionMenuItems';
import { buildTableMenuItems } from './context-menu/menuItems/tableMenuItems';
import { buildViewMenuItems } from './context-menu/menuItems/viewMenuItems';
// Local modules
import type { SchemaContextMenuOptions as InternalOptions } from './context-menu/types';
import { useContextMenuHelpers } from './context-menu/useContextMenuHelpers';
import { useContextMenuState } from './context-menu/useContextMenuState';

export interface SchemaContextMenuOptions {
  schemaName: Ref<string>;
  activeSchema: Ref<Schema | undefined>;
  onRefreshSchema: () => Promise<void>;
}

export function useSchemaContextMenu(options: SchemaContextMenuOptions) {
  const connectionStore = useManagementConnectionStore();

  const currentConnectionString = computed(
    () => connectionStore.selectedConnection?.connectionString
  );

  const internalOptions: InternalOptions = {
    ...options,
    currentConnectionString,
  };

  // State
  const state = useContextMenuState();

  // Helpers
  const helpers = useContextMenuHelpers(internalOptions, state);

  // Actions
  const functionActions = useFunctionActions(internalOptions, state, helpers);
  const tableActions = useTableActions(internalOptions, state, helpers);
  const viewActions = useViewActions(internalOptions, state, helpers);

  // Shared menu items
  const onRefreshSchemaWrapper = async () => {
    const toastId = toast.loading('Refreshing schema...');
    try {
      await options.onRefreshSchema();
      toast.success('Schema refreshed', { id: toastId });
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to refresh schema', { id: toastId });
    }
  };

  const refreshSchemaOption: ContextMenuItem = {
    title: 'Refresh Schema',
    icon: 'hugeicons:refresh',
    type: ContextMenuItemType.ACTION,
    select: onRefreshSchemaWrapper,
  };

  // Menu Items Builders
  const functionMenuItems = buildFunctionMenuItems(functionActions);
  const tableMenuItems = buildTableMenuItems(tableActions, refreshSchemaOption);
  const viewMenuItems = buildViewMenuItems(
    viewActions,
    state,
    refreshSchemaOption
  );

  // Dispatch onConfirmRename
  const onConfirmRename = async (newName: string) => {
    state.renameDialogOpen.value = false;

    if (state.renameDialogType.value === TabViewType.FunctionsDetail) {
      await functionActions.performRenameFunction(newName);
    } else if (state.renameDialogType.value === TabViewType.TableDetail) {
      await tableActions.performRenameTable(newName);
    } else if (state.renameDialogType.value === TabViewType.ViewDetail) {
      await viewActions.performRenameView(newName);
    }
  };

  // Compute context menu based on selected item type
  const contextMenuItems = computed(() => {
    if (!state.selectedItem.value) {
      return [refreshSchemaOption];
    }

    // Check tabViewType from the selected item
    // The Tree item has a tabViewType property (cast as any in original, or if interface supports it)
    // Original: item.value.tabViewType
    const type = state.selectedItem.value.tabViewType;

    switch (type) {
      case TabViewType.FunctionsDetail:
        return functionMenuItems.value;
      case TabViewType.TableDetail:
        return tableMenuItems.value;
      case TabViewType.ViewDetail:
        return viewMenuItems.value;
      default:
        // Also supports ViewOverview, etc? Original default was refreshSchemaOption.
        return [refreshSchemaOption];
    }
  });

  return {
    // State
    selectedItem: state.selectedItem,
    contextMenuItems,

    // Safe mode dialog
    safeModeLoading: helpers.safeModeLoading,
    safeModeDialogOpen: state.safeModeDialogOpen,
    safeModeDialogSQL: state.safeModeDialogSQL,
    safeModeDialogType: state.safeModeDialogType,
    onSafeModeConfirm: helpers.onSafeModeConfirm,
    onSafeModeCancel: helpers.onSafeModeCancel,

    // Rename dialog
    renameDialogType: state.renameDialogType,
    renameDialogOpen: state.renameDialogOpen,
    renameDialogValue: state.renameDialogValue,
    onConfirmRename, // Local dispatcher

    // SQL Preview dialog
    sqlPreviewDialogOpen: state.sqlPreviewDialogOpen,
    sqlPreviewDialogSQL: state.sqlPreviewDialogSQL,
    sqlPreviewDialogTitle: state.sqlPreviewDialogTitle,
    isFetching: state.isFetching,

    // Handlers
    onRightClickItem: helpers.onRightClickItem,
  };
}
