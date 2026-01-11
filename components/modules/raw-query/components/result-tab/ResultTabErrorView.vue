<script setup lang="ts">
import { useCodeHighlighter } from '~/composables/useSqlHighlighter';
import type { ExecutedResultItem } from '../../hooks/useRawQueryEditor';

defineProps<{
  activeTab: ExecutedResultItem;
}>();

const { highlightSql, highlightJson } = useCodeHighlighter();

// Check if tab has errors
const hasErrors = (tab: ExecutedResultItem) => {
  return !!tab.metadata.executeErrors;
};
</script>

<template>
  <div class="h-full p-4 overflow-y-auto">
    <div v-if="hasErrors(activeTab)" class="space-y-4">
      <div class="flex items-start gap-2">
        <Icon name="hugeicons:alert-02" class="size-5 text-red-500 mt-0.5" />
        <div>
          <div class="font-medium text-red-600">Error Message</div>
          <span
            class="text-sm text-muted-foreground decoration-wavy underline decoration-red-600"
          >
            {{ activeTab.metadata.executeErrors?.message }}
          </span>
        </div>
      </div>

      <div v-if="activeTab.metadata.executeErrors?.data" class="pt-3 border-t">
        <div class="text-sm text-muted-foreground mb-2">Error Details:</div>

        <div
          class="text-xs rounded-md mt-2 overflow-x-auto [&>pre]:p-2 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap"
          v-html="
            highlightJson(
              (activeTab.metadata?.executeErrors?.data ||
                '') as unknown as string
            )
          "
        />
      </div>

      <div class="pt-3 border-t">
        <span
          class="font-normal text-sm text-muted-foreground flex items-center gap-1 cursor-pointer"
        >
          View executed query :
        </span>
        <div
          class="text-xs rounded-md mt-2 overflow-x-auto [&>pre]:p-2 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap"
          v-html="highlightSql(activeTab.metadata.statementQuery)"
        />
      </div>
    </div>
  </div>
</template>
