<script setup lang="ts">
import { buildMappedColumnsFromKeys as buildColumnsFromKeys } from '~/core/helpers';
import type {
  InstanceInsightsActionState,
  InstanceInsightsSection,
  InstanceInsightsTable,
  InstanceInsightsTone,
} from '~/core/types';

const props = defineProps<{
  section: InstanceInsightsSection | null;
  search?: string;
}>();

const TABLE_MAX_HEIGHT_PX = 360;
const TABLE_EMPTY_HEIGHT_PX = 120;
const TABLE_HEADER_HEIGHT_PX = 44;
const TABLE_ROW_HEIGHT_PX = 36;

const normalizedSearch = computed(
  () => props.search?.trim().toLowerCase() || ''
);

const filteredTables = computed<InstanceInsightsTable[]>(() => {
  if (!props.section) {
    return [];
  }

  if (!props.section.searchable || !normalizedSearch.value) {
    return props.section.tables || [];
  }

  return (props.section.tables || []).map(table => ({
    ...table,
    rows: table.rows.filter(row =>
      Object.values(row).some(value =>
        String(value ?? '')
          .toLowerCase()
          .includes(normalizedSearch.value)
      )
    ),
  }));
});

const getTableHeightPx = (rowCount: number) => {
  if (rowCount <= 0) {
    return TABLE_EMPTY_HEIGHT_PX;
  }

  return Math.min(
    TABLE_MAX_HEIGHT_PX,
    TABLE_HEADER_HEIGHT_PX + rowCount * TABLE_ROW_HEIGHT_PX
  );
};

const getActionStateClass = (state: InstanceInsightsActionState) => {
  if (state === 'supported') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  }

  if (state === 'conditional') {
    return 'border-amber-300 bg-amber-50 text-amber-700';
  }

  return 'border-slate-300 bg-slate-50 text-slate-700';
};

const getToneCardClass = (tone: InstanceInsightsTone | undefined) => {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50';
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50';
  }

  if (tone === 'danger') {
    return 'border-red-200 bg-red-50';
  }

  if (tone === 'info') {
    return 'border-sky-200 bg-sky-50';
  }

  return 'border-border bg-background';
};

const getStatusClass = (status: InstanceInsightsSection['status']) => {
  if (status === 'unsupported') {
    return 'border-amber-300 bg-amber-50 text-amber-700';
  }

  if (status === 'unavailable') {
    return 'border-red-300 bg-red-50 text-red-700';
  }

  return 'border-emerald-300 bg-emerald-50 text-emerald-700';
};

const getCheckClass = (status: 'pass' | 'warn' | 'fail' | 'info') => {
  if (status === 'pass') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'warn') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'fail') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-sky-200 bg-sky-50 text-sky-700';
};
</script>

<template>
  <div v-if="section" class="space-y-4">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h3 class="text-sm font-medium">{{ section.title }}</h3>
        <p class="text-xs text-muted-foreground">{{ section.subtitle }}</p>
      </div>

      <Badge :class="getStatusClass(section.status)" variant="outline">
        {{ section.status }}
      </Badge>
    </div>

    <div
      v-if="section.statusMessage"
      :class="['border rounded-lg p-3 text-sm', getStatusClass(section.status)]"
    >
      {{ section.statusMessage }}
    </div>

    <div v-if="section.actions?.length" class="flex gap-2 flex-wrap">
      <Badge
        v-for="action in section.actions"
        :key="action.id"
        :class="getActionStateClass(action.state)"
        variant="outline"
      >
        {{ action.label }} · {{ action.state }}
      </Badge>
    </div>

    <div
      v-if="section.cards?.length"
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5"
    >
      <div
        v-for="card in section.cards"
        :key="card.id"
        :class="[
          'h-full border rounded-lg p-2.5 space-y-1.5',
          getToneCardClass(card.tone),
        ]"
      >
        <p class="text-xs uppercase text-muted-foreground">{{ card.label }}</p>
        <p class="text-sm font-semibold leading-none tabular-nums">
          {{ card.value }}
        </p>
        <p v-if="card.helperText" class="text-[11px] text-muted-foreground">
          {{ card.helperText }}
        </p>
      </div>
    </div>

    <div
      v-if="section.details?.length"
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5"
    >
      <div
        v-for="detail in section.details"
        :key="`${detail.label}-${detail.value}`"
        :class="[
          'border rounded-lg p-2.5 space-y-1',
          getToneCardClass(detail.tone),
        ]"
      >
        <p class="text-xs uppercase text-muted-foreground">
          {{ detail.label }}
        </p>
        <p class="text-sm font-medium leading-tight break-words">
          {{ detail.value }}
        </p>
        <p v-if="detail.helperText" class="text-[11px] text-muted-foreground">
          {{ detail.helperText }}
        </p>
      </div>
    </div>

    <div v-if="section.checks?.length" class="space-y-2">
      <div
        v-for="check in section.checks"
        :key="check.id"
        :class="['border rounded-lg p-3 text-sm', getCheckClass(check.status)]"
      >
        <p class="font-medium">{{ check.label }}</p>
        <p class="text-xs mt-1">{{ check.detail }}</p>
      </div>
    </div>

    <div v-for="table in filteredTables" :key="table.id" class="space-y-1.5">
      <div>
        <h4 class="text-sm font-normal">{{ table.title }}</h4>
        <p v-if="table.description" class="text-xs text-muted-foreground">
          {{ table.description }}
        </p>
      </div>

      <div
        class="max-h-[360px]"
        :style="{ height: `${getTableHeightPx(table.rows.length)}px` }"
      >
        <DynamicTable
          :columns="
            buildColumnsFromKeys(table.columns.map(column => column.key))
          "
          :data="table.rows"
          class="h-full border rounded-md"
          columnKeyBy="field"
        />
      </div>

      <p
        v-if="table.emptyMessage && table.rows.length === 0"
        class="text-xs text-muted-foreground"
      >
        {{ table.emptyMessage }}
      </p>
    </div>
  </div>
</template>
