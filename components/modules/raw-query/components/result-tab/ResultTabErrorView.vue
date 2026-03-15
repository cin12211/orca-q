<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { DecorationItem } from 'shiki';
import { Button } from '~/components/ui/button';
import type { ExecutedResultItem } from '../../interfaces';

const props = defineProps<{
  activeTab: ExecutedResultItem;
}>();

const emits = defineEmits<{
  (e: 'onChangeView', view: ExecutedResultItem['view']): void;
}>();

const hasErrors = (tab: ExecutedResultItem) => {
  return !!tab.metadata.executeErrors;
};

// Get error position from normalized error
const getErrorPosition = computed(() => {
  const errorData = props.activeTab.metadata.executeErrors?.data as any;
  return errorData?.normalizeError?.position || null;
});

const getErrorMessage = computed(() => {
  const executeErrors = props.activeTab.metadata.executeErrors;
  const errorData = executeErrors?.data as any;
  return errorData?.normalizeError?.message || executeErrors?.message || '';
});

const getErrorHint = computed(() => {
  const errorData = props.activeTab.metadata.executeErrors?.data as any;
  return errorData?.normalizeError?.hint || null;
});

const errorDecorations = computed(() => {
  const query = props.activeTab.metadata.statementQuery;
  if (!query) {
    return [];
  }

  const errorPosition = getErrorPosition.value;

  const decorations: DecorationItem[] = [];

  if (errorPosition && errorPosition > 0) {
    const startOffset = errorPosition - 1;

    // Find the end of the current line from the error position
    let endOffset = startOffset;
    while (
      endOffset < query.length &&
      query[endOffset] !== '\n' &&
      query[endOffset] !== '\r' &&
      query[endOffset] !== '\t' &&
      query[endOffset] !== ' '
    ) {
      endOffset++;
    }

    // If the error is at the end of line or beyond, highlight at least one character
    if (endOffset <= startOffset) {
      endOffset = Math.min(startOffset + 1, query.length);
    }

    decorations.push({
      start: startOffset,
      end: endOffset,
      properties: { class: 'error-highlight' },
    });
  }

  return decorations;
});

const scrollToErrorHighlight = async () => {
  if (typeof window === 'undefined') return;

  await nextTick();

  const target = document.querySelector(
    '.error-query-container .error-highlight'
  ) as HTMLElement | null;

  if (target) {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }
};

watch(
  () => errorDecorations.value,
  () => {
    scrollToErrorHighlight();
  },
  { flush: 'post' }
);

const errorDetails = computed(() => {
  const data = props.activeTab.metadata.executeErrors?.data;
  if (!data) return '';
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
});

const executedQuery = computed(() => {
  return props.activeTab.metadata.statementQuery || '';
});

const onAskAiToFix = () => {
  emits('onChangeView', 'agent');
};
</script>

<template>
  <div class="h-full p-2 overflow-y-auto">
    <div v-if="hasErrors(activeTab)" class="space-y-2">
      <!-- Error Message Section -->
      <div class="flex items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-1">
            <Icon
              name="hugeicons:alert-02"
              class="size-4 text-red-500 mt-0.5"
            />
            <div class="font-medium text-red-600">Error Message</div>
          </div>
          <span
            class="text-sm pl-5 text-muted-foreground decoration-wavy underline decoration-red-600"
          >
            {{ getErrorMessage }}
          </span>
          <div
            v-if="getErrorHint"
            class="pl-5 mt-1 text-sm text-amber-600/90 font-medium"
          >
            Hint: {{ getErrorHint }}
          </div>
        </div>

        <Button @click="onAskAiToFix" size="xs" variant="outline">
          <Icon name="hugeicons:ai-brain-04" class="size-4" />
          Ask AI to fix this error
        </Button>
      </div>

      <!-- View Executed Query Section (moved above Error Details) -->
      <!-- View Executed Query Section (moved above Error Details) -->
      <div class="pt-2 border-t">
        <div class="mb-2">
          <span
            class="font-normal text-sm text-muted-foreground flex items-center gap-1"
          >
            View executed query :
          </span>
        </div>

        <div class="error-query-container">
          <CodeHighlightPreview
            :code="executedQuery"
            :decorations="errorDecorations"
            show-copy-button
          />
        </div>
      </div>

      <div v-if="activeTab.metadata.executeErrors?.data" class="pt-2 border-t">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-muted-foreground">Error Details:</div>
        </div>

        <CodeHighlightPreview :code="errorDetails" language="json" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* TODO:use tailwindcss for styling */
/* Error highlight decoration styles */
:deep(.error-highlight) {
  background-color: color-mix(in srgb, rgb(239, 68, 68) 25%, transparent);
  text-decoration: wavy underline;
  text-decoration-color: rgb(239, 68, 68);
  text-underline-offset: 3px;
  border-radius: 2px;
  padding: 1px 0;
}

.error-query-container :deep(pre) {
  position: relative;
}

.error-query-container :deep(.error-highlight) {
  display: inline;
  position: relative;
}
</style>
