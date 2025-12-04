<script setup lang="ts">
import type { CellContextMenuEvent } from 'ag-grid-community';
import type { RowData } from '~/components/base/dynamic-table/utils';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';

const { onShowSecondSidebar } = useAppLayoutStore();

const props = defineProps<{
  totalSelectedRows: number;
  hasEditedRows: boolean;
  isReferencedTable?: boolean;
  cellContextMenu?: CellContextMenuEvent;
  cellHeaderContextMenu?: CellContextMenuEvent;
  data?: RowData[];
}>();

const emit = defineEmits<{
  (e: 'onRefresh'): void;
  (e: 'onSaveData'): void;
  (e: 'onAddEmptyRow'): void;
  (e: 'onDeleteRows'): void;
  (e: 'onCopyRows'): void;
  (e: 'onPasteRows'): void;
  (e: 'onCopySelectedCell'): void;
  (e: 'onFilterByValue'): void;
  (e: 'onClearContextMenu'): void;
}>();

const getColumnKey = () =>
  props.cellHeaderContextMenu?.column?.getColId() ?? '';

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Copied successfully!');
  } catch (err) {
    console.error('Copy failed:', err);
  }
};

// const onCopyColumnData = () => {
//   const columnKey = getColumnKey();

//   if (!columnKey || !props.data?.length) {
//     console.warn('Cannot copy column data: Column key or data is missing.');
//     return;
//   }

//   const values = props.data.map(row => {
//     const item = row[columnKey];
//     const mappedItem =
//       item !== null && typeof item === 'object' ? JSON.stringify(item) : item;
//     return mappedItem;
//   });
//   copyToClipboard(values.join('\n'));
// };

const onCopyColumnData = () => {
  const columnKey = getColumnKey();

  if (!columnKey || !props.data?.length) {
    console.warn('Cannot copy column data: Column key or data is missing.');
    return;
  }

  const values = props.data.map(row => {
    const item = row[columnKey];

    let mappedItem =
      item !== null && typeof item === 'object'
        ? JSON.stringify(item)
        : String(item ?? '');

    return `'${mappedItem}'`;
  });

  copyToClipboard(values.join(', '));
};

const onCopyColumnDataAsJson = () => {
  const columnKey = getColumnKey();

  if (!columnKey || !props.data?.length) {
    console.warn('Cannot copy column data: Column key or data is missing.');
    return;
  }

  const jsonArray = props.data.map(row => {
    const item = row[columnKey];

    return {
      [columnKey]: item,
    };
  });

  copyToClipboard(JSON.stringify(jsonArray));
};
</script>

<template>
  <ContextMenu
    @update:open="
      isOpen => {
        if (!isOpen) {
          emit('onClearContextMenu');
        }
      }
    "
  >
    <ContextMenuTrigger>
      <slot></slot>
    </ContextMenuTrigger>

    <ContextMenuContent class="min-w-56">
      <ContextMenuItem
        v-if="!isReferencedTable && cellContextMenu"
        @select="onShowSecondSidebar"
      >
        <Icon
          name="hugeicons:view"
          class="size-4! min-w-4 text-muted-foreground"
        />
        View row detail
      </ContextMenuItem>
      <ContextMenuItem v-if="cellContextMenu" @select="emit('onFilterByValue')">
        <Icon
          name="lucide:filter"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Filter by value
        <!-- <ContextMenuShortcut>⌘F</ContextMenuShortcut> -->
      </ContextMenuItem>

      <ContextMenuItem @select="emit('onRefresh')">
        <Icon
          name="hugeicons:refresh"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Refresh
        <ContextMenuShortcut>⌘R</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem @select="onCopyColumnData" v-if="cellHeaderContextMenu">
        <Icon
          name="hugeicons:copy-02"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Copy columns data
      </ContextMenuItem>

      <ContextMenuItem
        @select="onCopyColumnDataAsJson"
        v-if="cellHeaderContextMenu"
      >
        <Icon
          name="hugeicons:copy-02"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Copy columns data (json)
      </ContextMenuItem>

      <!-- <ContextMenuItem @select="emit('onCopySelectedCell')">
        <Icon
          name="hugeicons:copy-02"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Copy current cell
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem> -->

      <ContextMenuItem
        v-if="totalSelectedRows && cellContextMenu"
        @select="emit('onCopyRows')"
      >
        <Icon
          name="lucide:copy"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Copy {{ totalSelectedRows }} rows
      </ContextMenuItem>

      <ContextMenuItem v-if="hasEditedRows" @select="emit('onSaveData')">
        <Icon
          name="lucide:save"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Save changed
        <ContextMenuShortcut>⌘S</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem
        @select="emit('onDeleteRows')"
        v-if="totalSelectedRows && cellContextMenu"
      >
        <Icon
          name="lucide:trash"
          class="size-4! min-w-4 text-muted-foreground"
        />Delete {{ totalSelectedRows }} rows

        <ContextMenuShortcut>⌥⌘⌫</ContextMenuShortcut>
      </ContextMenuItem>

      <!-- TODO: support export -->

      <!-- <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger class="cursor-pointer">
          <Icon
            name="hugeicons:file-download mr-2"
            class="size-4! min-w-4 text-muted-foreground"
          />

          Export
        </ContextMenuSubTrigger>
        <ContextMenuSubContent class="min-w-58">
          <ContextMenuItem
            >{{ totalSelectedRows }} selected rows</ContextMenuItem
          >
          <ContextMenuItem>All records</ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub> -->
    </ContextMenuContent>
  </ContextMenu>
</template>
