<script setup lang="ts">
import { BaseContextMenu } from '#components';
import type { CellContextMenuEvent } from 'ag-grid-community';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  copyColumnData,
  copyRowsData,
  copyToClipboard,
  type ColumnCopyFormat,
  type ExportFormat,
} from '~/core/helpers/copyData';

type DataGridRow = Record<string, unknown>;

const props = withDefaults(
  defineProps<{
    cellContextMenu?: CellContextMenuEvent;
    cellHeaderContextMenu?: CellContextMenuEvent;
    data?: DataGridRow[];
    selectedRows?: DataGridRow[];
    tableName?: string;
    schemaName?: string;
    enableCopyAsSql?: boolean;
  }>(),
  {
    data: () => [],
    selectedRows: () => [],
    tableName: 'table_data',
    enableCopyAsSql: false,
  }
);

const emit = defineEmits<{
  (e: 'onClearContextMenu'): void;
}>();

const currentColumnId = computed<string | undefined>(() => {
  return (
    props.cellContextMenu?.column?.getColId() ??
    props.cellHeaderContextMenu?.column?.getColId()
  );
});

const currentColumnLabel = computed<string>(() => {
  return (
    props.cellContextMenu?.column?.getColDef().headerName ??
    props.cellHeaderContextMenu?.column?.getColDef().headerName ??
    currentColumnId.value ??
    'Select a column'
  );
});

const copyCurrentCell = () => {
  const value = props.cellContextMenu?.value;

  if (value === undefined) {
    return;
  }

  if (typeof value === 'object' && value !== null) {
    return copyToClipboard(JSON.stringify(value));
  }

  return copyToClipboard(String(value));
};

const copyCurrentRow = () => {
  const row = props.cellContextMenu?.data as DataGridRow | undefined;

  if (!row) {
    return;
  }

  return copyRowsData(
    [row],
    props.tableName,
    'csv-no-header',
    props.schemaName
  );
};

const copySelectedColumnData = (format: ColumnCopyFormat) => {
  if (!currentColumnId.value || !props.selectedRows.length) {
    return;
  }

  return copyColumnData(props.selectedRows, currentColumnId.value, format);
};

const copyAllColumnData = (format: ColumnCopyFormat) => {
  if (!currentColumnId.value || !props.data.length) {
    return;
  }

  return copyColumnData(props.data, currentColumnId.value, format);
};

const copySelectedRowsData = (format: ExportFormat) => {
  if (!props.selectedRows.length) {
    return;
  }

  return copyRowsData(
    props.selectedRows,
    props.tableName,
    format,
    props.schemaName
  );
};

const copyAllRowsData = (format: ExportFormat) => {
  if (!props.data.length) {
    return;
  }

  return copyRowsData(props.data, props.tableName, format, props.schemaName);
};

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const isCellContext = !!props.cellContextMenu;
  const hasSelectedRows = props.selectedRows.length > 0;
  const hasColumn = !!currentColumnId.value;
  const selectedCount = props.selectedRows.length;

  const copyColumnItems: ContextMenuItem[] = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected row${selectedCount === 1 ? '' : 's'}`,
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy selected as text',
      icon: 'hugeicons:file-01',
      select: () => copySelectedColumnData('list'),
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy selected as JSON',
      icon: 'hugeicons:code',
      select: () => copySelectedColumnData('json'),
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.LABEL,
      title: 'All data in column',
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy all as text',
      icon: 'hugeicons:file-01',
      select: () => copyAllColumnData('list'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy all as JSON',
      icon: 'hugeicons:code',
      select: () => copyAllColumnData('json'),
    },
  ];

  const copyRowsItems: ContextMenuItem[] = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected row${selectedCount === 1 ? '' : 's'}`,
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy selected as text (TSV)',
      icon: 'hugeicons:file-01',
      select: () => copySelectedRowsData('csv-no-header'),
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy selected as JSON',
      icon: 'hugeicons:code',
      select: () => copySelectedRowsData('json'),
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy selected as SQL',
      icon: 'hugeicons:database',
      select: () => copySelectedRowsData('sql'),
      condition: hasSelectedRows && props.enableCopyAsSql,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
      condition: hasSelectedRows,
    },
    {
      type: ContextMenuItemType.LABEL,
      title: 'All rows',
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy all as text (TSV)',
      icon: 'hugeicons:file-01',
      select: () => copyAllRowsData('csv-no-header'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy all as JSON',
      icon: 'hugeicons:code',
      select: () => copyAllRowsData('json'),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy all as SQL',
      icon: 'hugeicons:database',
      select: () => copyAllRowsData('sql'),
      condition: props.enableCopyAsSql,
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
      title: 'Copy current row',
      icon: 'hugeicons:copy-02',
      select: copyCurrentRow,
      condition: isCellContext,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
      condition: isCellContext,
    },
    {
      type: ContextMenuItemType.SUBMENU,
      title: 'Copy column',
      icon: 'hugeicons:layout-3-column',
      items: copyColumnItems,
      condition: hasColumn,
      desc: currentColumnLabel.value,
    },
    {
      type: ContextMenuItemType.SUBMENU,
      title: 'Copy row(s)',
      icon: 'hugeicons:layout-3-row',
      items: copyRowsItems,
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
