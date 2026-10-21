<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#components';
import type { EditorCursor } from '../interfaces';

defineProps<{
  cursorInfo: EditorCursor;
  executeLoading: boolean;
  isStreaming: boolean;
  isRawViewMode?: boolean;
  isSupportFormat?: boolean;
  isSupportVariable?: boolean;
}>();

defineEmits<{
  (e: 'onFormatCurrentStatement'): void;
  (e: 'onFormatAll'): void;
  (e: 'onExecuteCurrent'): void;
  (e: 'update:isRawViewMode', value: boolean): void;
  (e: 'onCancelQuery'): void;
}>();
</script>
<template>
  <div class="h-fit py-1 flex items-center justify-between px-2">
    <div class="flex items-center gap-2">
      <div class="font-normal text-xs text-muted-foreground">
        Ln {{ cursorInfo.line }}, Col {{ cursorInfo.column }}
      </div>

      <slot name="usage-guide">
        <RawQueryVariableUsageGuidePopover v-if="isSupportVariable" />
      </slot>
    </div>

    <div class="flex gap-1">
      <Tooltip v-if="isSupportFormat">
        <TooltipTrigger>
          <div class="flex items-center">
            <Button
              @click="$emit('onFormatCurrentStatement')"
              variant="outline"
              size="xxs"
              class="rounded-r-none"
            >
              <Icon name="hugeicons:magic-wand-01"> </Icon>
              Format
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  size="iconSm"
                  class="rounded-l-none border-l-0 px-2"
                >
                  <Icon
                    name="hugeicons:arrow-down-01"
                    class="size-4! min-w-4"
                  />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" class="min-w-44">
                <DropdownMenuLabel class="py-0 font-normal"
                  >Format Options
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  @click="$emit('onFormatCurrentStatement')"
                  class="h-6 cursor-pointer"
                >
                  Current Statement
                  <ContextMenuShortcut>⌘S</ContextMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  @click="$emit('onFormatAll')"
                  class="h-6 cursor-pointer"
                >
                  All Statement
                  <ContextMenuShortcut>⇧⌥F</ContextMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Format current statement (⌘S)</p>
        </TooltipContent>
      </Tooltip>

      <slot name="extra" />

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            v-if="isStreaming || executeLoading"
            @click="$emit('onCancelQuery')"
            variant="outline"
            size="xxs"
          >
            <Icon name="hugeicons:stop" class="size-4! text-red-500" />
            Cancel query
          </Button>
          <Button
            v-else
            @click="$emit('onExecuteCurrent')"
            variant="outline"
            size="xxs"
          >
            <Icon name="hugeicons:play" />
            Execute current
            <ContextMenuShortcut>⌘↵</ContextMenuShortcut>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p v-if="isStreaming || executeLoading">Cancel query</p>
          <p v-else>Execute Query (⌘↵)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
