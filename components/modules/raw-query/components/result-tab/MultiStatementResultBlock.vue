<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { cn } from '@/lib/utils';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores';
import { STATEMENT_STATUS_CONFIG } from '../../constants';
import {
  StatementRunStatus,
  ViewMode,
  type ExecutedResultItem,
  type StatementResultItem,
} from '../../types';
import { createCommandResultFactory } from '../../utils/commandType';
import { formatColumnsInfo } from '../../utils/formatColumnsInfo';
import { toStatementPreview } from '../../utils/multiStatementRun';
import { normalizeResultRows } from '../../utils/normalizeResultRows';
import ResultTabResultView from './ResultTabResultView.vue';

const GRID_ROW_HEIGHT = 28;
const GRID_CHROME_HEIGHT = 80;
const GRID_MIN_HEIGHT = 120;
const GRID_MAX_HEIGHT = 288;

const props = defineProps<{
  statement: StatementResultItem;
  executedAt: Date;
  seqIndex: number;
}>();

defineEmits<{
  (e: 'open-in-tab', statementId: string): void;
}>();

const schemaStore = useSchemaStore();
const { schemas } = storeToRefs(schemaStore);

const blockRef = ref<HTMLElement>();
/** null = follow the default for the current status. */
const userExpanded = ref<boolean | null>(null);
const hasBeenVisible = ref(false);

const isVisible = useElementVisibility(blockRef);

const statusConfig = computed(
  () => STATEMENT_STATUS_CONFIG[props.statement.status]
);
const isRunning = computed(
  () => props.statement.status === StatementRunStatus.RUNNING
);
const isSucceeded = computed(
  () => props.statement.status === StatementRunStatus.SUCCESS
);
const isFinished = computed(
  () =>
    props.statement.status === StatementRunStatus.SUCCESS ||
    props.statement.status === StatementRunStatus.ERROR
);
const hasColumns = computed(() => !!props.statement.fieldDefs?.length);
const hasRows = computed(() => props.statement.result.length > 0);
const showsGrid = computed(() => hasColumns.value || hasRows.value);

const commandResult = computed(() =>
  createCommandResultFactory(
    props.statement.command || '',
    props.statement.rowCount || 0,
    props.statement.connection?.type as DatabaseClientType
  )
);

/** Blocks with data or an error start open; the rest start collapsed. */
const defaultExpanded = computed(() => {
  if (props.statement.status === StatementRunStatus.ERROR) return true;
  if (
    props.statement.status === StatementRunStatus.SUCCESS ||
    isRunning.value
  ) {
    return showsGrid.value;
  }
  return false;
});

const isExpanded = computed(() => userExpanded.value ?? defaultExpanded.value);

const preview = computed(() =>
  toStatementPreview(props.statement.statementQuery)
);

const summaryText = computed(() => {
  const { status, rowCount = 0, executeErrors } = props.statement;

  if (status === StatementRunStatus.ERROR) {
    return executeErrors?.message || statusConfig.value.label;
  }

  if (status === StatementRunStatus.SUCCESS) {
    if (!showsGrid.value && commandResult.value.isMutation) {
      return commandResult.value.message;
    }
    return `${rowCount} ${rowCount === 1 ? 'row' : 'rows'}`;
  }

  if (isRunning.value && rowCount > 0) {
    return `${rowCount} rows…`;
  }

  return statusConfig.value.label;
});

const columns = computed(() => {
  const connectionId = props.statement.connection?.id;
  return formatColumnsInfo({
    fieldDefs: props.statement.fieldDefs || [],
    statementQuery: props.statement.statementQuery,
    schemas: connectionId ? schemas.value[connectionId] || [] : [],
    getTableInfoById: schemaStore.getTableInfoById,
  });
});

const formattedData = computed(() =>
  normalizeResultRows(props.statement.result, columns.value)
);

/** The statement shaped as a result tab, so the shared grid view can show it. */
const statementAsTab = computed<ExecutedResultItem>(() => ({
  id: props.statement.id,
  metadata: {
    queryTime: props.statement.queryTime,
    statementQuery: props.statement.statementQuery,
    executedAt: props.executedAt,
    executeErrors: props.statement.executeErrors,
    fieldDefs: props.statement.fieldDefs,
    connection: props.statement.connection,
    command: props.statement.command,
    rowCount: props.statement.rowCount,
  },
  result: props.statement.result,
  view: ViewMode.RESULT,
  seqIndex: props.seqIndex,
}));

/**
 * Grid area height: fits short results (control bar + header + rows) and
 * caps long ones, so a 2-row result does not take a full-height block.
 */
const gridHeight = computed(() => {
  const rows = Math.max(props.statement.result.length, 1);
  const height = GRID_CHROME_HEIGHT + rows * GRID_ROW_HEIGHT;
  return `${Math.min(Math.max(height, GRID_MIN_HEIGHT), GRID_MAX_HEIGHT)}px`;
});

const toggleExpanded = () => {
  userExpanded.value = !isExpanded.value;
};

watch(
  isVisible,
  visible => {
    if (visible) hasBeenVisible.value = true;
  },
  { immediate: true }
);
</script>

<template>
  <section
    ref="blockRef"
    data-testid="raw-query-statement-block"
    :data-status="statement.status"
    class="border-b last:border-b-0"
  >
    <header
      class="flex items-center gap-2 px-2 h-7 text-xs cursor-pointer hover:bg-muted/60 select-none"
      @click="toggleExpanded"
    >
      <Icon
        :name="
          isExpanded ? 'hugeicons:arrow-down-01' : 'hugeicons:arrow-right-01'
        "
        class="size-3.5! min-w-3.5 text-muted-foreground"
      />
      <span class="text-muted-foreground tabular-nums min-w-6">
        #{{ statement.index + 1 }}
      </span>
      <Icon
        :name="statusConfig.icon"
        :class="cn('size-3.5! min-w-3.5', statusConfig.iconClass)"
      />

      <Tooltip>
        <TooltipTrigger as-child>
          <code class="truncate font-mono flex-1 min-w-0">{{ preview }}</code>
        </TooltipTrigger>
        <TooltipContent class="max-w-xl whitespace-pre-wrap font-mono">
          {{ statement.statementQuery }}
        </TooltipContent>
      </Tooltip>

      <span
        data-testid="raw-query-statement-summary"
        :class="
          cn(
            'truncate max-w-[40%] text-muted-foreground',
            statement.status === StatementRunStatus.ERROR && 'text-red-500'
          )
        "
      >
        {{ summaryText }}
      </span>

      <span
        v-if="isSucceeded"
        class="text-muted-foreground tabular-nums whitespace-nowrap"
      >
        {{ statement.queryTime }}ms
      </span>

      <Tooltip v-if="isFinished">
        <TooltipTrigger as-child>
          <Button
            data-testid="raw-query-statement-open-tab"
            variant="ghost"
            size="icon"
            class="size-5 rounded"
            @click.stop="$emit('open-in-tab', statement.id)"
          >
            <Icon name="hugeicons:square-arrow-up-right" class="size-3.5!" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Open in its own tab</TooltipContent>
      </Tooltip>
    </header>

    <div v-if="isExpanded" class="border-t">
      <pre
        v-if="statement.status === StatementRunStatus.ERROR"
        class="px-3 py-2 text-xs text-red-500 whitespace-pre-wrap break-words"
        >{{ statement.executeErrors?.message }}</pre
      >

      <div
        v-else-if="showsGrid"
        data-testid="raw-query-statement-grid"
        :style="{ height: gridHeight }"
      >
        <ResultTabResultView
          v-if="hasBeenVisible"
          :key="statement.id"
          :active-tab="statementAsTab"
          :active-tab-columns="columns"
          :formatted-data="formattedData"
          :execute-loading="false"
          :is-streaming="isRunning"
          read-only
        />
      </div>

      <p v-else class="px-3 py-2 text-xs text-muted-foreground">
        {{
          statement.status === StatementRunStatus.SUCCESS
            ? commandResult.message || 'Done.'
            : statusConfig.hint || statusConfig.label
        }}
      </p>
    </div>
  </section>
</template>
