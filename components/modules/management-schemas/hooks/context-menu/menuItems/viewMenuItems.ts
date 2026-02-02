import { computed, type ComputedRef } from 'vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { ViewSchemaEnum } from '~/shared/types';
import type { useViewActions } from '../actions/useViewActions';
import type { ContextMenuState } from '../types';

export const buildViewMenuItems = (
  actions: ReturnType<typeof useViewActions>,
  state: ContextMenuState,
  refreshSchemaOption: ContextMenuItem
): ComputedRef<ContextMenuItem[]> => {
  return computed(() => {
    const viewInfo = state.selectedItem.value
      ? actions.getViewInfo(state.selectedItem.value.id)
      : null;
    const isMaterialized = viewInfo?.type === ViewSchemaEnum.MaterializedView;

    const items: ContextMenuItem[] = [
      {
        title: 'Generate SQL',
        icon: 'hugeicons:code',
        type: ContextMenuItemType.SUBMENU,
        items: [
          {
            title: 'SELECT',
            icon: 'hugeicons:table',
            type: ContextMenuItemType.ACTION,
            select: actions.onGenViewSelectSQL,
          },
          {
            type: ContextMenuItemType.SEPARATOR,
          },
          {
            title: 'DDL',
            icon: 'hugeicons:document-code',
            type: ContextMenuItemType.ACTION,
            select: actions.onGenViewDDL,
          },
        ],
      },
      {
        type: ContextMenuItemType.SEPARATOR,
      },
    ];

    // Add Refresh option only for materialized views
    if (isMaterialized) {
      items.push({
        title: 'Refresh Materialized View',
        icon: 'hugeicons:refresh',
        type: ContextMenuItemType.ACTION,
        select: actions.onRefreshMaterializedView,
      });
      items.push({
        type: ContextMenuItemType.SEPARATOR,
      });
    }

    items.push(
      {
        title: 'Rename...',
        icon: 'hugeicons:pencil-edit-02',
        type: ContextMenuItemType.ACTION,
        select: actions.onRenameView,
      },
      {
        title: 'Delete',
        icon: 'hugeicons:delete-02',
        type: ContextMenuItemType.ACTION,
        select: actions.onDeleteView,
      },
      {
        type: ContextMenuItemType.SEPARATOR,
      },
      refreshSchemaOption
    );

    return items;
  });
};
