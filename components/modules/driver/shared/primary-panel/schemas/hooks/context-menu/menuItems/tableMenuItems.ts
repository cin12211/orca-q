import { computed, type ComputedRef } from 'vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { useTableActions } from '../actions/useTableActions';
import { ExportDataFormatType } from '../types';

export const buildTableMenuItems = (
  actions: ReturnType<typeof useTableActions>,
  refreshSchemaOption: ContextMenuItem
): ComputedRef<ContextMenuItem[]> => {
  return computed(() => [
    {
      title: 'Export Data',
      icon: 'hugeicons:download-01',
      type: ContextMenuItemType.SUBMENU,
      items: [
        {
          title: 'SQL (INSERT statements)',
          icon: 'hugeicons:code',
          type: ContextMenuItemType.ACTION,
          select: () => actions.onExportTableData(ExportDataFormatType.SQL),
        },
        {
          title: 'JSON',
          icon: 'hugeicons:file-script',
          type: ContextMenuItemType.ACTION,
          select: () => actions.onExportTableData(ExportDataFormatType.JSON),
        },
        {
          title: 'CSV',
          icon: 'hugeicons:file-script',
          type: ContextMenuItemType.ACTION,
          select: () => actions.onExportTableData(ExportDataFormatType.CSV),
        },
      ],
    },
    {
      title: 'Import Data',
      icon: 'hugeicons:upload-01',
      type: ContextMenuItemType.ACTION,
      // select: actions.onImportTableData,
      disabled: true,
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
          title: 'SELECT',
          icon: 'hugeicons:table',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenSelectSQL,
        },
        {
          title: 'INSERT',
          icon: 'hugeicons:plus-sign',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenInsertSQL,
        },
        {
          title: 'UPDATE',
          icon: 'hugeicons:pencil-edit-02',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenUpdateSQL,
        },
        {
          title: 'DELETE',
          icon: 'hugeicons:delete-01',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenDeleteSQL,
        },
        {
          type: ContextMenuItemType.SEPARATOR,
        },
        {
          title: 'MERGE',
          icon: 'hugeicons:git-merge',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenMergeSQL,
        },
        {
          title: 'INSERT ON CONFLICT',
          icon: 'hugeicons:git-pull-request',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenInsertOnConflictSQL,
        },
        {
          title: 'UPDATE FROM',
          icon: 'hugeicons:arrow-right-01',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenUpdateFromSQL,
        },
        {
          title: 'DELETE USING',
          icon: 'hugeicons:delete-02',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenDeleteUsingSQL,
        },
        {
          type: ContextMenuItemType.SEPARATOR,
        },
        {
          title: 'DDL',
          icon: 'hugeicons:document-code',
          type: ContextMenuItemType.ACTION,
          select: actions.onGenTableDDL,
        },
      ],
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    {
      title: 'Rename...',
      icon: 'hugeicons:pencil-edit-02',
      type: ContextMenuItemType.ACTION,
      select: actions.onRenameTable,
    },
    {
      title: 'Delete',
      icon: 'hugeicons:delete-02',
      type: ContextMenuItemType.ACTION,
      select: actions.onDeleteTable,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    refreshSchemaOption,
  ]);
};
