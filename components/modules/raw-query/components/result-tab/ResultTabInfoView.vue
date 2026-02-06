<script setup lang="ts">
import { computed } from 'vue';
import { useCodeHighlighter } from '~/composables/useSqlHighlighter';
import { formatBytes } from '~/utils/common';
import { formatNumber, formatQueryTime } from '~/utils/common/format';
import type { ExecutedResultItem } from '../../hooks/useRawQueryEditor';

const props = defineProps<{
  activeTab: ExecutedResultItem;
}>();

const { highlightSql } = useCodeHighlighter();

const textEncoder =
  typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const resultSize = computed(() => {
  const data = props.activeTab?.result ?? [];

  if (!textEncoder) {
    return { bytes: 0, formatted: 'N/A' };
  }

  try {
    const jsonString = JSON.stringify(data);
    const bytes = jsonString ? textEncoder.encode(jsonString).length : 0;

    return {
      bytes,
      formatted: formatBytes(bytes),
    };
  } catch (error) {
    return { bytes: 0, formatted: 'N/A' };
  }
});
</script>

<template>
  <div class="h-full p-4 space-y-3 overflow-y-auto">
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm">
        <Icon name="hugeicons:clock-01" class="size-4 text-muted-foreground" />
        <span class="text-muted-foreground">Query Time:</span>
        <span class="font-medium">{{
          formatQueryTime(activeTab.metadata.queryTime)
        }}</span>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <Icon
          name="hugeicons:summation-01"
          class="size-4 text-muted-foreground"
        />
        <span class="text-muted-foreground">Rows:</span>
        <span class="font-medium">{{
          formatNumber(activeTab.result?.length || 0)
        }}</span>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <Icon name="hugeicons:file-02" class="size-4 text-muted-foreground" />
        <span class="text-muted-foreground">Result Size:</span>
        <span class="font-medium">{{ resultSize.formatted }}</span>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <Icon
          name="hugeicons:chart-column"
          class="size-4 text-muted-foreground"
        />
        <span class="text-muted-foreground">Columns:</span>
        <span class="font-medium">{{
          activeTab.metadata.fieldDefs?.length || 0
        }}</span>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <Icon
          name="hugeicons:calendar-03"
          class="size-4 text-muted-foreground"
        />
        <span class="text-muted-foreground">Executed At:</span>
        <span class="font-medium">{{
          activeTab.metadata.executedAt?.toLocaleString() || 'N/A'
        }}</span>
      </div>

      <div
        v-if="activeTab.metadata.connection"
        class="flex items-center gap-2 text-sm"
      >
        <Icon
          name="hugeicons:plug-socket"
          class="size-4 text-muted-foreground"
        />
        <span class="text-muted-foreground">Connection:</span>
        <span class="font-medium">{{
          activeTab.metadata.connection.name || 'Unknown'
        }}</span>
      </div>
    </div>

    <div class="pt-3 border-t">
      <div class="text-sm text-muted-foreground mb-2">Query:</div>
      <div
        class="text-xs rounded-md overflow-x-auto [&>pre]:p-2 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap"
        v-html="highlightSql(activeTab.metadata.statementQuery)"
      />
    </div>

    <div v-if="activeTab.metadata.fieldDefs?.length" class="pt-3 border-t">
      <div class="text-sm text-muted-foreground mb-2">Fields:</div>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="field in activeTab.metadata.fieldDefs"
          :key="field.name"
          class="text-xs bg-muted px-2 py-1 rounded"
        >
          {{ field.name }}
        </span>
      </div>
    </div>
  </div>
</template>
