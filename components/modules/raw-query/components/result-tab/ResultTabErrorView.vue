<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DecorationItem } from 'shiki';
import { Button } from '~/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { useCodeHighlighter } from '~/composables/useSqlHighlighter';
import { copyToClipboard } from '~/utils/common/copyData';
import type { ExecutedResultItem } from '../../hooks/useRawQueryEditor';

const props = defineProps<{
  activeTab: ExecutedResultItem;
}>();

const emits = defineEmits<{
  (e: 'onChangeView', view: ExecutedResultItem['view']): void;
}>();

const { highlighter, currentTheme } = useCodeHighlighter();

const copiedStates = ref<Record<string, boolean>>({
  details: false,
  query: false,
});

const hasErrors = (tab: ExecutedResultItem) => {
  return !!tab.metadata.executeErrors;
};

// Get error position from error data (PostgreSQL position is 1-indexed)
const getErrorPosition = computed(() => {
  const errorData = JSON.parse(
    (props.activeTab.metadata.executeErrors?.data as unknown as string) || '{}'
  ) as { position?: string; line?: string } | undefined;

  if (!errorData?.position) return null;

  return parseInt(errorData.position, 10);
});

const highlightSqlWithError = computed(() => {
  const query = props.activeTab.metadata.statementQuery;
  if (!query || !highlighter.value) {
    return null;
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

  return highlighter.value.codeToHtml(query, {
    lang: 'plsql',
    theme: currentTheme.value,
    decorations,
  });
});

// Highlight JSON for error details
const highlightErrorDetails = computed(() => {
  const data = props.activeTab.metadata.executeErrors?.data;
  if (!data || !highlighter.value) {
    return '';
  }

  const jsonString =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return highlighter.value.codeToHtml(jsonString, {
    lang: 'json',
    theme: currentTheme.value,
  });
});

const handleCopy = async (section: 'details' | 'query', text: string) => {
  await copyToClipboard(text);
  copiedStates.value[section] = true;
  setTimeout(() => {
    copiedStates.value[section] = false;
  }, 2000);
};

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
            {{ activeTab.metadata.executeErrors?.message }}
          </span>
        </div>

        <Button
          @click="onAskAiToFix"
          size="sm"
          variant="outline"
          class="font-normal h-6 px-2"
        >
          <Icon name="hugeicons:ai-brain-04" class="size-4" />
          Ask AI to fix this error
        </Button>
      </div>

      <!-- View Executed Query Section (moved above Error Details) -->
      <div class="pt-2 border-t">
        <div class="flex items-center justify-between mb-2">
          <span
            class="font-normal text-sm text-muted-foreground flex items-center gap-1"
          >
            View executed query :
          </span>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                @click="handleCopy('query', executedQuery)"
              >
                <Icon
                  :name="
                    copiedStates.query
                      ? 'hugeicons:tick-02'
                      : 'hugeicons:copy-01'
                  "
                  class="size-4"
                  :class="
                    copiedStates.query
                      ? 'text-green-500'
                      : 'text-muted-foreground'
                  "
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ copiedStates.query ? 'Copied!' : 'Copy query' }}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div
          class="text-xs rounded-md mt-2 overflow-x-auto [&>pre]:p-2 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap error-query-container"
          v-html="highlightSqlWithError"
        />
      </div>

      <!-- Error Details Section (moved below View Executed Query) -->
      <div v-if="activeTab.metadata.executeErrors?.data" class="pt-2 border-t">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-muted-foreground">Error Details:</div>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                @click="handleCopy('details', errorDetails)"
              >
                <Icon
                  :name="
                    copiedStates.details
                      ? 'hugeicons:tick-02'
                      : 'hugeicons:copy-01'
                  "
                  class="size-4"
                  :class="
                    copiedStates.details
                      ? 'text-green-500'
                      : 'text-muted-foreground'
                  "
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ copiedStates.details ? 'Copied!' : 'Copy details' }}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div
          class="text-xs rounded-md mt-2 overflow-x-auto [&>pre]:p-2 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap"
          v-html="highlightErrorDetails"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Error highlight decoration styles */
:deep(.error-highlight) {
  background-color: rgba(239, 68, 68, 0.2);
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
