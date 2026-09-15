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
import type { RawQueryContext } from '../../registry/rawQueryProfile.types';

const props = defineProps<{
  context: RawQueryContext;
}>();

const onFormatCurrent = () => {
  props.context.onFormatCurrentStatement?.();
};

const onFormatAll = () => {
  props.context.onFormatAll?.();
};
</script>

<template>
  <Tooltip>
    <TooltipTrigger>
      <div class="flex items-center">
        <Button
          @click="onFormatCurrent"
          variant="outline"
          size="xxs"
          class="rounded-r-none"
        >
          <Icon name="hugeicons:magic-wand-01" />
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
              <Icon name="hugeicons:arrow-down-01" class="size-4! min-w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" class="min-w-44">
            <DropdownMenuLabel class="py-0">Format Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              @click="onFormatCurrent"
              class="h-6 cursor-pointer"
            >
              Current Statement
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="onFormatAll" class="h-6 cursor-pointer">
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
</template>
