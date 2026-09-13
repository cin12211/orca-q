<script setup lang="ts">
import { computed, ref } from 'vue';
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
import type {
  ExplainAnalyzeOptionItem,
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
} from '../../interfaces';
import type { RawQueryFooterContext } from '../../registry/rawQueryProfile.types';

const props = defineProps<{
  context?: RawQueryFooterContext;
  explainAnalyzeOptionItems?: ExplainAnalyzeOptionItem[];
  serializeMode?: ExplainAnalyzeSerializeMode;
}>();

const emit = defineEmits<{
  (e: 'onExplainAnalyzeCurrent'): void;
  (e: 'toggleExplainOption', value: ExplainAnalyzeToggleOptionKey): void;
  (e: 'update:serializeMode', value: ExplainAnalyzeSerializeMode): void;
}>();

const isExplainAnalyzeMenuOpen = ref(false);

const options = computed<ExplainAnalyzeOptionItem[]>(
  () =>
    props.context?.explainAnalyzeOptionItems ??
    props.explainAnalyzeOptionItems ??
    []
);

const currentSerializeMode = computed<ExplainAnalyzeSerializeMode>(
  () => props.context?.serializeMode ?? props.serializeMode ?? 'NONE'
);

const onExplain = () => {
  props.context?.onExplainAnalyzeCurrent?.();
  emit('onExplainAnalyzeCurrent');
};

const onToggle = (key: ExplainAnalyzeToggleOptionKey) => {
  props.context?.toggleExplainOption?.(key);
  emit('toggleExplainOption', key);
};

const onUpdateSerialize = (value: ExplainAnalyzeSerializeMode) => {
  props.context?.updateSerializeMode?.(value);
  emit('update:serializeMode', value);
};
</script>

<template>
  <Tooltip>
    <TooltipTrigger>
      <div class="flex items-center">
        <Button
          @click="onExplain"
          variant="outline"
          size="xxs"
          class="rounded-r-none"
        >
          <Icon name="hugeicons:analytics-up" />
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
              <Icon name="hugeicons:arrow-down-01" class="size-4! min-w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" class="min-w-52">
            <DropdownMenuLabel class="py-0"
              >Explain Analyze Options</DropdownMenuLabel
            >

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              v-for="item in options"
              :key="item.key"
              :model-value="item.checked"
              @select.prevent
              @update:model-value="onToggle(item.key)"
              class="h-6 cursor-pointer"
            >
              {{ item.label }}
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel class="py-0">Serialize</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="currentSerializeMode"
              @update:model-value="
                onUpdateSerialize($event as ExplainAnalyzeSerializeMode)
              "
            >
              <DropdownMenuRadioItem value="NONE" class="h-6 cursor-pointer"
                >None</DropdownMenuRadioItem
              >
              <DropdownMenuRadioItem value="TEXT" class="h-6 cursor-pointer"
                >Text</DropdownMenuRadioItem
              >
              <DropdownMenuRadioItem value="BINARY" class="h-6 cursor-pointer">
                Binary
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Run Explain Analyze (⌘E) or open options</p>
    </TooltipContent>
  </Tooltip>
</template>
