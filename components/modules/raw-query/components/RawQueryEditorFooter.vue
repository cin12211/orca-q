<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#components';
import { formatNumber, formatQueryTime } from '~/core/helpers/format';
import type {
  EditorCursor,
  ExplainAnalyzeOptionItem,
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
} from '../interfaces';

const isExplainAnalyzeMenuOpen = ref(false);

defineProps<{
  cursorInfo: EditorCursor;
  isHaveOneExecute: boolean;
  executeLoading: boolean;
  executeErrors: boolean;
  isStreaming: boolean;
  streamingRowCount: number;
  queryTime: number;
  rawQueryResultsLength: number;
  isRawViewMode?: boolean;
  explainAnalyzeOptionItems: ExplainAnalyzeOptionItem[];
  serializeMode: ExplainAnalyzeSerializeMode;
}>();

defineEmits<{
  (e: 'onFormatCurrentStatement'): void;
  (e: 'onFormatAll'): void;
  (e: 'onExplainAnalyzeCurrent'): void;
  (e: 'toggleExplainOption', value: ExplainAnalyzeToggleOptionKey): void;
  (e: 'update:serializeMode', value: ExplainAnalyzeSerializeMode): void;
  (e: 'onExecuteCurrent'): void;
  (e: 'update:isRawViewMode', value: boolean): void;
  (e: 'onCancelQuery'): void;
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
      <span v-if="isStreaming" class="flex items-center gap-1">
        <Icon name="hugeicons:loading-03" class="size-4! animate-spin" />
        Streaming... {{ formatNumber(streamingRowCount) }} rows
        <Button
          size="iconSm"
          @click="$emit('onCancelQuery')"
          class="transition-colors h-5 px-1 gap-1 text-xs w-auto"
          title="Cancel query"
          variant="outline"
        >
          <Icon name="hugeicons:stop" class="size-4! text-red-500" />
          Cancel query
        </Button>
      </span>
      <span v-else-if="executeLoading" class="flex items-center gap-1"
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
      <Tooltip>
        <TooltipTrigger>
          <div class="flex items-center">
            <Button
              @click="$emit('onFormatCurrentStatement')"
              variant="outline"
              size="xxs"
              class="rounded-r-none text-xs font-medium"
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
                <DropdownMenuLabel class="py-0"
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

      <Tooltip>
        <TooltipTrigger>
          <div class="flex items-center">
            <Button
              @click="$emit('onExplainAnalyzeCurrent')"
              variant="outline"
              size="xs"
              class="rounded-r-none text-xs font-medium"
            >
              <Icon name="hugeicons:analytics-up"> </Icon>
              Explain
              <ContextMenuShortcut>⌘E</ContextMenuShortcut>
            </Button>

            <DropdownMenu v-model:open="isExplainAnalyzeMenuOpen">
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

              <DropdownMenuContent align="end" class="min-w-52">
                <DropdownMenuLabel class="py-0"
                  >Explain Analyze Options</DropdownMenuLabel
                >

                <DropdownMenuSeparator />

                <DropdownMenuCheckboxItem
                  v-for="item in explainAnalyzeOptionItems"
                  :key="item.key"
                  :model-value="item.checked"
                  @select.prevent
                  @update:model-value="$emit('toggleExplainOption', item.key)"
                  class="h-6 cursor-pointer"
                >
                  {{ item.label }}
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel class="py-0">Serialize</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  :model-value="serializeMode"
                  @update:model-value="
                    $emit(
                      'update:serializeMode',
                      $event as ExplainAnalyzeSerializeMode
                    )
                  "
                >
                  <DropdownMenuRadioItem value="NONE" class="h-6 cursor-pointer"
                    >None</DropdownMenuRadioItem
                  >
                  <DropdownMenuRadioItem value="TEXT" class="h-6 cursor-pointer"
                    >Text</DropdownMenuRadioItem
                  >
                  <DropdownMenuRadioItem
                    value="BINARY"
                    class="h-6 cursor-pointer"
                    >Binary</DropdownMenuRadioItem
                  >
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Run Explain Analyze (⌘E) or open options</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            @click="$emit('onExecuteCurrent')"
            variant="outline"
            size="xs"
            class="text-xs font-medium"
          >
            <Icon name="hugeicons:play"> </Icon>
            Execute current
            <ContextMenuShortcut>⌘↵</ContextMenuShortcut>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Execute Query (⌘↵)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
