<script setup lang="ts">
import type { ViewDefinitionResponse } from '~/server/api/get-view-definition';
import { formatStatementSql } from '../../raw-query/utils';

const props = defineProps<{
  schema: string;
  connectionString: string;
  viewName: string;
  viewId: string;
}>();

const { data, status } = useFetch<ViewDefinitionResponse>(
  '/api/get-view-definition',
  {
    method: 'POST',
    body: {
      dbConnectionString: props.connectionString,
      viewId: props.viewId,
      schemaName: props.schema,
      viewName: props.viewName,
    },
    key: `${props.schema}.${props.viewId}`,
  }
);

const { highlightSql } = useCodeHighlighter();
const { copied, handleCopy, getCopyIcon, getCopyIconClass, getCopyTooltip } =
  useCopyToClipboard();

// Highlight SQL with Shiki
const highlightedSql = computed(() => {
  if (!data.value?.definition) {
    return null;
  }

  const formattedSql = formatStatementSql(data.value.definition);

  return highlightSql(formattedSql);
});

const onCopy = () => handleCopy(data.value?.definition || '');
</script>
<template>
  <div class="mb-2" :key="`${props.viewId}-${props.viewName}-${props.schema}`">
    <LoadingOverlay :visible="status === 'pending'" />
    <p class="text-sm font-normal mb-1">View Definition:</p>
    <div class="relative">
      <div class="absolute top-2 right-2 z-10">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="iconSm" @click="onCopy">
              <Icon
                :name="getCopyIcon(copied)"
                class="size-4"
                :class="getCopyIconClass(copied)"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{{ getCopyTooltip(copied, 'Copy SQL') }}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        class="max-h-96 w-full overflow-y-auto rounded-md border bg-muted/50"
      >
        <div
          v-if="highlightedSql"
          class="text-xs rounded-md overflow-x-auto [&>pre]:p-3 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap"
          v-html="highlightedSql"
        />
        <pre
          v-else
          class="text-xs font-mono whitespace-pre-wrap break-all p-3"
          >{{ data?.definition }}</pre
        >
      </div>
    </div>
  </div>
</template>
