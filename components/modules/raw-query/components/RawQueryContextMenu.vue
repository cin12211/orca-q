<script setup lang="ts">
import { BaseContextMenu } from '#components';
import type { CellContextMenuEvent } from 'ag-grid-community';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { RowData } from '~/components/base/dynamic-table/utils';
import {
  copyColumnData,
  copyRowsData,
  copyToClipboard,
  exportData,
  type ColumnCopyFormat,
  type ExportFormat,
} from '~/utils/common/copyData';

const props = defineProps<{
  cellContextMenu?: CellContextMenuEvent;
  cellHeaderContextMenu?: CellContextMenuEvent;
  data?: RowData[];
  selectedRows: RowData[];
  tableName?: string;
}>();

const emit = defineEmits<{
  (e: 'onClearContextMenu'): void;
}>();

const currentColumnId = computed<string | undefined>(() => {
  return (
    props.cellContextMenu?.column?.getColId() ??
    props.cellHeaderContextMenu?.column?.getColId()
  );
});

const currentColumnName = computed<string | undefined>(() => {
  return (
    props.cellContextMenu?.column.getColDef().headerName ??
    props.cellHeaderContextMenu?.column?.getColDef().headerName ??
    ''
  );
});

const onCopySelectedColumnData = (format: ColumnCopyFormat) => {
  copyColumnData(
    props.selectedRows || [],
    currentColumnName.value ?? '',
    format
  );
};

const onCopyAllColumnData = (format: ColumnCopyFormat) => {
  copyColumnData(props.data || [], currentColumnName.value ?? '', format);
};

const onCopySelectedRowsData = (format: ExportFormat) => {
  return copyRowsData(
    props.selectedRows || [],
    props.tableName || 'table_data',
    format
  );
};

const onCopyAllRowsData = (format: ExportFormat) => {
  return copyRowsData(
    props.data || [],
    props.tableName || 'table_data',
    format
  );
};

const onExportSelectedRows = (format: ExportFormat) => {
  return exportData(
    props.selectedRows || [],
    props.tableName || 'table_data',
    format,
    'selected'
  );
};

const onExportAllRows = (format: ExportFormat) => {
  return exportData(
    props.data || [],
    props.tableName || 'table_data',
    format,
    'all'
  );
};

const copyCurrentCell = () => {
  const value = props.cellContextMenu?.value;
  if (value !== undefined) {
    if (typeof value === 'object')
      return copyToClipboard(JSON.stringify(value));

    copyToClipboard(String(value));
  }
};

const copyCurrentRow = () => {
  if (props.cellContextMenu) {
    const data = props.cellContextMenu?.data;
    copyRowsData([data], props.tableName || 'table_data', 'csv-no-header');
  }
};

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const isCellContext = !!props.cellContextMenu;
  const isSelected = props.selectedRows.length > 0;
  const selectedCount = props.selectedRows.length;
  const allCount = props.data?.length || 0;
  const hasColumnId = !!currentColumnId.value;

  const copyColumnSubs: ContextMenuItem[] = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected`,
      condition: isSelected && isCellContext,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as text',
      icon: 'hugeicons:file-01',
      select: () => onCopySelectedColumnData('list'),
      condition: isSelected && isCellContext,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      icon: 'hugeicons:code',
      select: () => onCopySelectedColumnData('json'),
      condition: isSelected && isCellContext,
    },

    {
      type: ContextMenuItemType.SEPARATOR,
      condition: isSelected && isCellContext,
    },
    { type: ContextMenuItemType.LABEL, title: 'All data in column' },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as text',
      icon: 'hugeicons:file-01',
      select: () => onCopyAllColumnData('list'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      icon: 'hugeicons:code',
      select: () => onCopyAllColumnData('json'),
    },
  ];

  const copyRowSubs: ContextMenuItem[] = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected row(s)`,
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as CSV/TSV',
      icon: 'hugeicons:csv-02',
      select: () => onCopySelectedRowsData('csv-no-header'),
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      icon: 'hugeicons:code',
      select: () => onCopySelectedRowsData('json'),
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as SQL',
      icon: 'hugeicons:database',
      select: () => onCopySelectedRowsData('sql'),
      condition: isSelected,
    },
    { type: ContextMenuItemType.SEPARATOR, condition: isSelected },
    { type: ContextMenuItemType.LABEL, title: 'All rows' },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as CSV/TSV',
      icon: 'hugeicons:csv-02',
      select: () => onCopyAllRowsData('csv-no-header'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      icon: 'hugeicons:code',
      select: () => onCopyAllRowsData('json'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as SQL',
      icon: 'hugeicons:database',
      select: () => onCopyAllRowsData('sql'),
    },
  ];

  const exportSubs: ContextMenuItem[] = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected row${selectedCount > 1 ? 's' : ''}`,
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV',
      icon: 'hugeicons:csv-01',
      select: () => onExportSelectedRows('csv-no-header'),
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV (have headers)',
      icon: 'hugeicons:csv-01',
      select: () => onExportSelectedRows('csv-with-header'),
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as JSON',
      icon: 'hugeicons:code',
      select: () => onExportSelectedRows('json'),
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as SQL',
      icon: 'hugeicons:database',
      select: () => onExportSelectedRows('sql'),
      condition: isSelected,
    },
    { type: ContextMenuItemType.SEPARATOR, condition: isSelected },
    {
      type: ContextMenuItemType.LABEL,
      title: `All ${allCount.toLocaleString()} row${allCount !== 1 ? 's' : ''}`,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV',
      icon: 'hugeicons:csv-01',
      select: () => onExportAllRows('csv-no-header'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV (have headers)',
      icon: 'hugeicons:csv-01',
      select: () => onExportAllRows('csv-with-header'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as JSON',
      icon: 'hugeicons:code',
      select: () => onExportAllRows('json'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as SQL',
      icon: 'hugeicons:database',
      select: () => onExportAllRows('sql'),
    },
  ];

  return [
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy current cell',
      icon: 'hugeicons:copy-02',
      select: copyCurrentCell,
      condition: isCellContext,
    },

    {
      type: ContextMenuItemType.ACTION,
      title: `Copy current row`,
      icon: 'hugeicons:copy-02',
      select: copyCurrentRow,
      condition: isSelected && isCellContext,
    },

    { type: ContextMenuItemType.SEPARATOR, condition: isCellContext },

    {
      type: ContextMenuItemType.SUBMENU,
      title: 'Copy column',
      icon: 'hugeicons:layout-3-column',
      items: copyColumnSubs,
      condition: hasColumnId,
      desc: currentColumnName.value || 'Select a column',
    },

    {
      type: ContextMenuItemType.SUBMENU,
      title: 'Copy row(s)',
      icon: 'hugeicons:layout-3-row',
      items: copyRowSubs,
    },

    { type: ContextMenuItemType.SEPARATOR },

    {
      type: ContextMenuItemType.SUBMENU,
      title: 'Export',
      icon: 'hugeicons:file-download',
      items: exportSubs,
    },
  ];
});
</script>

<template>
  <BaseContextMenu
    :contextMenuItems="contextMenuItems"
    @on-clear-context-menu="emit('onClearContextMenu')"
  >
    <slot />
  </BaseContextMenu>
</template>
