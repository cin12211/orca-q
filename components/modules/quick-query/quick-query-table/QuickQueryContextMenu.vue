<script setup lang="ts">
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';

const { onShowSecondSidebar } = useAppLayoutStore();

defineProps<{
  totalSelectedRows: number;
  hasEditedRows: boolean;
}>();

const emit = defineEmits<{
  (e: 'onRefresh'): void;
  (e: 'onShowFilter'): void;
  (e: 'onSaveData'): void;
  (e: 'onAddEmptyRow'): void;
  (e: 'onDeleteRows'): void;
  (e: 'onCopyRows'): void;
  (e: 'onPasteRows'): void;
  (e: 'onCopySelectedCell'): void;
}>();

useHotkeys(
  [
    {
      key: 'meta+c',
      callback: () => emit('onCopySelectedCell'),
    },
    {
      key: 'meta+v',
      callback: () => emit('onPasteRows'),
    },
  ],
  {
    isPreventDefault: false,
  }
);
</script>

<template>
  <ContextMenu
    @update:open="
      isOpen => {
        if (!isOpen) {
        }
      }
    "
  >
    <ContextMenuTrigger>
      <slot></slot>
    </ContextMenuTrigger>

    <ContextMenuContent class="min-w-56">
      <ContextMenuItem @select="onShowSecondSidebar">
        <Icon
          name="hugeicons:view"
          class="size-4! min-w-4 text-muted-foreground"
        />
        View row detail
      </ContextMenuItem>
      <ContextMenuItem @select="emit('onShowFilter')">
        <Icon
          name="lucide:filter"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Show filter
        <ContextMenuShortcut>⌘F</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem @select="emit('onRefresh')">
        <Icon
          name="hugeicons:refresh"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Refresh
        <ContextMenuShortcut>⌘R</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem @select="emit('onCopySelectedCell')">
        <Icon
          name="hugeicons:copy-02"
          class="size-4! min-w-4 text-muted-foreground"
        />
        Copy current cell
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem v-if="totalSelectedRows" @select="emit('onCopyRows')">
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

      <ContextMenuItem @select="emit('onDeleteRows')" v-if="totalSelectedRows">
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
