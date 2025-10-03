<script setup lang="ts">
import { formatNumber, formatQueryTime } from '~/utils/common/format';
import type { EditorCursor } from '../interfaces';

defineProps<{
  cursorInfo: EditorCursor;
  isHaveOneExecute: boolean;
  executeLoading: boolean;
  executeErrors: boolean;
  queryTime: number;
  rawQueryResultsLength: number;
}>();

defineEmits<{
  (e: 'onFormatCode'): void;
  (e: 'onExecuteCurrent'): void;
}>();
</script>
<template>
  <div class="h-fit py-1 flex items-center justify-between px-2">
    <div class="font-normal text-xs text-muted-foreground">
      Ln {{ cursorInfo.line }}, Col {{ cursorInfo.column }}
    </div>

    <div
      v-if="isHaveOneExecute"
      class="font-normal text-xs text-muted-foreground"
    >
      <span v-if="executeLoading" class="flex items-center gap-1"
        >Processing

        <Icon name="hugeicons:loading-03" class="size-4! animate-spin"> </Icon>
      </span>
      <span v-else>
        <span v-if="executeErrors">
          Query: 1 error in {{ formatQueryTime(queryTime) }}
        </span>
        <span v-else>
          Query success: {{ formatNumber(rawQueryResultsLength) }} rows in
          {{ formatQueryTime(queryTime) }}
        </span>
      </span>
    </div>

    <div class="flex gap-1">
      <Button
        @click="$emit('onFormatCode')"
        variant="outline"
        size="sm"
        class="h-6 px-2 gap-1 font-normal"
      >
        <Icon name="hugeicons:magic-wand-01"> </Icon>
        Format
        <ContextMenuShortcut>⌘S</ContextMenuShortcut>
      </Button>

      <Button
        @click="$emit('onExecuteCurrent')"
        variant="outline"
        size="sm"
        class="h-6 px-2 gap-1 font-normal"
      >
        <Icon name="hugeicons:play"> </Icon>
        Execute current
        <ContextMenuShortcut>⌘↵</ContextMenuShortcut>
      </Button>
    </div>
  </div>
</template>
