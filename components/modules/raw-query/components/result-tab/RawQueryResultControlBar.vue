<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
} from '#components';
import { ContextMenuShortcut } from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

defineProps<{
  pendingCount: number;
  isMutating: boolean;
  /** When false the bar shows a read-only indicator instead of edit actions. */
  isEditingEnabled: boolean;
  totalSelectedRows: number;
}>();

const emit = defineEmits<{
  save: [];
  discard: [];
  delete: [];
  download: [format: 'csv' | 'json' | 'text'];
}>();
</script>

<template>
  <div class="w-full select-none h-9 flex items-center justify-between px-1">
    <!-- Left: edit actions (visible only when result is editable) -->
    <div class="flex items-center gap-1">
      <template v-if="isEditingEnabled">
        <Tooltip v-if="pendingCount > 0">
          <TooltipTrigger as-child>
            <Button
              variant="outline"
              size="xxs"
              class="relative overflow-visible font-normal"
              :disabled="isMutating"
              @click="emit('save')"
            >
              <Icon
                v-if="isMutating"
                name="lucide:loader-circle"
                class="animate-spin"
              />
              <Icon v-else name="lucide:save" />
              <span
                class="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-green-700 px-1 text-xxs font-medium leading-4 text-white"
              >
                {{ pendingCount }}
              </span>
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p class="flex items-center gap-2">
              Preview &amp; execute UPDATE statements
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip v-if="pendingCount > 0">
          <TooltipTrigger as-child>
            <Button
              variant="outline"
              size="xxs"
              class="font-normal"
              :disabled="isMutating"
              @click="emit('discard')"
            >
              <Icon name="hugeicons:undo-02" />
              Discard
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Discard pending edits</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip v-if="totalSelectedRows > 0">
          <TooltipTrigger as-child>
            <Button
              variant="outline"
              size="xxs"
              :disabled="isMutating"
              @click="emit('delete')"
            >
              <Icon name="lucide:trash" />
              <ContextMenuShortcut>⌥⌘⌫</ContextMenuShortcut>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p class="flex items-center gap-2">
              Delete {{ totalSelectedRows }} selected row{{
                totalSelectedRows === 1 ? '' : 's'
              }}
              <ContextMenuShortcut>⌥⌘⌫</ContextMenuShortcut>
            </p>
          </TooltipContent>
        </Tooltip>

        <p
          v-if="totalSelectedRows > 0"
          class="font-normal text-xs text-primary/60"
        >
          Selected
        </p>
        <p
          v-if="totalSelectedRows > 0"
          class="font-normal text-sm text-primary"
        >
          {{ totalSelectedRows }}
        </p>
      </template>
    </div>

    <!-- Right: status indicator & download -->
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1">
        <template v-if="isEditingEnabled">
          <Icon
            name="hugeicons:pencil-edit-02"
            class="size-3.5 text-muted-foreground"
          />
          <span class="font-normal text-xs text-primary/60">Editable</span>
        </template>
        <template v-else>
          <Icon
            name="hugeicons:lock-01"
            class="size-3.5 text-muted-foreground"
          />
          <span class="font-normal text-xs text-primary/60">Read-only</span>
        </template>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            class="font-normal flex items-center gap-1 cursor-pointer"
          >
            <Icon name="hugeicons:download-04" class="size-3.5" />
            <span>Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-36">
          <DropdownMenuItem
            @click="emit('download', 'csv')"
            class="text-xs cursor-pointer"
          >
            <Icon name="hugeicons:file-01" class="mr-2 size-3.5" />
            Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            @click="emit('download', 'json')"
            class="text-xs cursor-pointer"
          >
            <Icon name="hugeicons:code" class="mr-2 size-3.5" />
            Export JSON
          </DropdownMenuItem>
          <DropdownMenuItem
            @click="emit('download', 'text')"
            class="text-xs cursor-pointer"
          >
            <Icon name="hugeicons:file-01" class="mr-2 size-3.5" />
            Export TSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>
