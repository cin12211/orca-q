import { computed, type ComputedRef } from 'vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { useFunctionActions } from '../actions/useFunctionActions';

export const buildFunctionMenuItems = (
  actions: ReturnType<typeof useFunctionActions>
): ComputedRef<ContextMenuItem[]> => {
  return computed(() => [
    {
      title: 'Rename...',
      icon: 'hugeicons:pencil-edit-02',
      type: ContextMenuItemType.ACTION,
      select: actions.onRenameFunction,
    },
    {
      title: 'Delete',
      icon: 'hugeicons:delete-02',
      type: ContextMenuItemType.ACTION,
      select: actions.onDeleteFunction,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    {
      title: 'Generate SQL',
      icon: 'hugeicons:code',
      type: ContextMenuItemType.SUBMENU,
      items: [
        {
          title: 'CALL',
          icon: 'hugeicons:play',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenFunctionCallSQL,
        },
        {
          title: 'SELECT',
          icon: 'hugeicons:table',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenFunctionSelectSQL,
        },
        {
          type: ContextMenuItemType.SEPARATOR,
        },
        {
          title: 'DDL',
          icon: 'hugeicons:document-code',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenFunctionDDL,
        },
      ],
    },
  ]);
};
